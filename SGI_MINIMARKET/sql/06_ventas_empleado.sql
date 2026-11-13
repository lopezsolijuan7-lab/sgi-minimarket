-- SGI MINIMARKET · Sprint 4: ventas del empleado
-- Ejecutar despues de 04_compras_recepciones.sql y 05_cajas_consultas.sql.
-- No borra datos ni sucursales. Hacer respaldo antes de aplicar.
-- El rol y la sucursal se comprueban SIEMPRE en Supabase, no en el navegador.
BEGIN;

-- Permitir reintentar una venta ante error de red sin cobrar/descontar dos veces.
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS operacion_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS sgi_ventas_operacion_unica
  ON public.ventas (operacion_id) WHERE operacion_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sgi_registrar_venta_empleado(
  p_operacion_id uuid,
  p_items jsonb,
  p_forma_pago_id bigint,
  p_numero_operacion text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_usuario uuid := (SELECT auth.uid());
  v_sucursal bigint;
  v_pago_nombre text;
  v_item record;
  v_precio numeric(12,2);
  v_stock_nuevo integer;
  v_total numeric(12,2) := 0;
  v_venta bigint;
  v_pago bigint;
  v_previa record;
BEGIN
  IF v_usuario IS NULL OR p_operacion_id IS NULL THEN
    RAISE EXCEPTION 'Inicia sesion para registrar la venta';
  END IF;

  SELECT u.sucursal_id INTO v_sucursal
  FROM public.usuarios u
  WHERE u.id = v_usuario AND u.activo = true AND u.rol = 'empleado';
  IF NOT FOUND OR v_sucursal IS NULL THEN
    RAISE EXCEPTION 'Solo un empleado activo con sucursal asignada puede vender';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sucursales s WHERE s.id=v_sucursal AND s.activo=true) THEN
    RAISE EXCEPTION 'La sucursal asignada esta inactiva';
  END IF;

  -- Mismo UUID de operacion => misma venta, incluso tras reintentar la peticion.
  SELECT id, usuario_id INTO v_previa FROM public.ventas
  WHERE operacion_id = p_operacion_id;
  IF FOUND THEN
    IF v_previa.usuario_id <> v_usuario THEN
      RAISE EXCEPTION 'Identificador de operacion ya utilizado';
    END IF;
    RETURN v_previa.id;
  END IF;

  SELECT f.nombre INTO v_pago_nombre
  FROM public.formas_pago f
  WHERE f.id = p_forma_pago_id AND f.activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selecciona una forma de pago activa'; END IF;
  IF lower(v_pago_nombre) IN ('yape','plin','transferencia bancaria')
     AND length(btrim(coalesce(p_numero_operacion,''))) = 0 THEN
    RAISE EXCEPTION 'Para el pago digital ingresa el numero de operacion';
  END IF;
  IF length(coalesce(p_numero_operacion,'')) > 100 THEN
    RAISE EXCEPTION 'El numero de operacion es demasiado largo';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Agrega de 1 a 50 productos al carrito';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS i(producto_id bigint,cantidad integer)
    GROUP BY i.producto_id HAVING i.producto_id IS NULL OR count(*) > 1
  ) THEN RAISE EXCEPTION 'Hay productos repetidos o invalidos'; END IF;

  -- Precios leidos del servidor. No se permite que el navegador los modifique.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
    AS i(producto_id bigint,cantidad integer)
    ORDER BY i.producto_id
  LOOP
    IF v_item.cantidad IS NULL OR v_item.cantidad NOT BETWEEN 1 AND 10000 THEN
      RAISE EXCEPTION 'Cantidad de venta invalida';
    END IF;
    SELECT p.precio INTO v_precio
    FROM public.productos p
    WHERE p.id=v_item.producto_id AND p.activo=true;
    IF NOT FOUND OR v_precio IS NULL OR v_precio < 0 THEN
      RAISE EXCEPTION 'Producto no disponible para la venta';
    END IF;
    v_total := v_total + round(v_precio * v_item.cantidad, 2);
  END LOOP;
  IF v_total <= 0 OR v_total > 9999999999.99 THEN
    RAISE EXCEPTION 'Total de venta fuera de rango';
  END IF;

  -- Esta funcion es una transaccion: si falla un stock, se revierte TODO.
  INSERT INTO public.ventas (
    sucursal_id,usuario_id,subtotal,descuento,total,estado,operacion_id
  ) VALUES (
    v_sucursal,v_usuario,v_total,0,v_total,'confirmada',p_operacion_id
  ) RETURNING id INTO v_venta;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items)
    AS i(producto_id bigint,cantidad integer)
    ORDER BY i.producto_id
  LOOP
    SELECT p.precio INTO v_precio FROM public.productos p
    WHERE p.id=v_item.producto_id AND p.activo=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto desactivado'; END IF;

    UPDATE public.inventarios
    SET stock = stock - v_item.cantidad,
        actualizado_en = now()
    WHERE sucursal_id = v_sucursal AND producto_id=v_item.producto_id
      AND stock >= v_item.cantidad
    RETURNING stock INTO v_stock_nuevo;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %',v_item.producto_id;
    END IF;

    INSERT INTO public.detalle_ventas (
      venta_id,producto_id,cantidad,precio_unitario
    ) VALUES (v_venta,v_item.producto_id,v_item.cantidad,v_precio);

    INSERT INTO public.movimientos_inventario (
      sucursal_id,producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,usuario_id
    ) VALUES (
      v_sucursal,v_item.producto_id,'salida',v_item.cantidad,
      v_stock_nuevo + v_item.cantidad,v_stock_nuevo,
      'Venta #' || v_venta,v_usuario
    );
  END LOOP;

  -- Confirmacion manual del cobro, no verificacion automatica con Yape/Plin.
  INSERT INTO public.pagos (
    venta_id,forma_pago_id,monto,estado
  ) VALUES (
    v_venta,p_forma_pago_id,v_total,'confirmado'
  ) RETURNING id INTO v_pago;

  IF nullif(btrim(coalesce(p_numero_operacion,'')),'') IS NOT NULL THEN
    INSERT INTO public.vouchers (pago_id,numero_operacion)
    VALUES (v_pago,btrim(p_numero_operacion));
  END IF;

  RETURN v_venta;
END;
$$;

-- Mantener public.registrar_movimiento de Sprint 4 intacta.
-- Los permisos y el formulario de entradas/salidas existentes se preservan.
-- Las ventas descuentan inventario exclusivamente mediante
-- sgi_registrar_venta_empleado, con validacion y transaccion independientes.
REVOKE ALL ON FUNCTION public.sgi_registrar_venta_empleado(uuid,jsonb,bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sgi_registrar_venta_empleado(uuid,jsonb,bigint,text) TO authenticated;


COMMIT;

-- Comprobacion, sin crear ventas de prueba:
SELECT
  to_regprocedure('public.sgi_registrar_venta_empleado(uuid,jsonb,bigint,text)') AS venta_empleado,
  to_regprocedure('public.registrar_movimiento(bigint,bigint,text,integer,text)') AS ajustes_admin;
