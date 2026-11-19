-- SGI MINIMARKET - CAMBIOS DE PERMISOS PARA LA INTERFAZ ACTUAL
-- Revisión en SUPABASE SQL EDITOR ANTES DE EJECUTAR: copiar BD / respaldar funciones.
-- El empleado trabaja ventas y recepción; ajustes manuales, solo el administrador.
-- NO modifica filas de productos, ventas ni inventarios; modifica dos funciones RPC.
-- Está preparado para el esquema public de 22 tablas basado en la migración PostgreSQL.
BEGIN;

-- Si se ha cambiado el tipo de retorno de la función, abortar antes de tocarla.
DO $$
DECLARE v_tipo text;
BEGIN
  SELECT p.prorettype::regtype::text INTO v_tipo
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.registrar_movimiento(bigint,bigint,text,integer,text)');
  IF v_tipo IS DISTINCT FROM 'bigint' THEN
    RAISE EXCEPTION 'No se aplicó el cambio: revisar la firma de registrar_movimiento (retorno %, se esperaba bigint).',v_tipo;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.registrar_movimiento(
  p_sucursal_id bigint, p_producto_id bigint, p_tipo text,
  p_cantidad integer, p_motivo text DEFAULT NULL
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_anterior integer;
  v_nuevo integer;
  v_id bigint;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede realizar ajustes manuales de inventario';
  END IF;
  IF p_sucursal_id IS NULL OR NOT EXISTS
      (SELECT 1 FROM public.sucursales WHERE id=p_sucursal_id AND activo) THEN
    RAISE EXCEPTION 'Sucursal inexistente o inactiva';
  END IF;
  IF p_tipo IS NULL OR p_tipo NOT IN ('entrada','salida') THEN
    RAISE EXCEPTION 'El tipo de movimiento es inválido';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad < 1 THEN
    RAISE EXCEPTION 'La cantidad debe ser positiva';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.productos WHERE id=p_producto_id AND activo) THEN
    RAISE EXCEPTION 'Producto inexistente o inactivo';
  END IF;
  INSERT INTO public.inventarios(sucursal_id,producto_id,stock,stock_minimo)
  VALUES (p_sucursal_id,p_producto_id,0,0)
  ON CONFLICT(sucursal_id,producto_id) DO NOTHING;
  SELECT i.stock INTO v_anterior FROM public.inventarios i
    WHERE i.sucursal_id=p_sucursal_id AND producto_id=p_producto_id FOR UPDATE;
  IF v_anterior IS NULL THEN RAISE EXCEPTION 'No se pudo consultar el stock'; END IF;
  IF p_tipo='salida' AND v_anterior < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente';
  END IF;
  v_nuevo := CASE WHEN p_tipo='entrada' THEN v_anterior+p_cantidad ELSE v_anterior-p_cantidad END;
  UPDATE public.inventarios SET stock=v_nuevo,actualizado_en=now()
  WHERE sucursal_id=p_sucursal_id AND producto_id=p_producto_id;
  INSERT INTO public.movimientos_inventario(
    sucursal_id,producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,usuario_id
  ) VALUES (
    p_sucursal_id,p_producto_id,p_tipo,p_cantidad,v_anterior,v_nuevo,
    nullif(left(btrim(coalesce(p_motivo,'')),200),''),(SELECT auth.uid())
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.configurar_stock_minimo(
  p_sucursal_id bigint,p_producto_id bigint,p_stock_minimo integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede configurar el stock mínimo';
  END IF;
  IF p_stock_minimo IS NULL OR p_stock_minimo < 0 THEN
    RAISE EXCEPTION 'Stock mínimo inválido';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sucursales WHERE id=p_sucursal_id AND activo)
     OR NOT EXISTS (SELECT 1 FROM public.productos WHERE id=p_producto_id AND activo) THEN
    RAISE EXCEPTION 'Sucursal o producto no disponible';
  END IF;
  INSERT INTO public.inventarios(sucursal_id,producto_id,stock,stock_minimo)
  VALUES(p_sucursal_id,p_producto_id,0,p_stock_minimo)
  ON CONFLICT(sucursal_id,producto_id)
    DO UPDATE SET stock_minimo=EXCLUDED.stock_minimo,actualizado_en=now();
END;
$$;
COMMIT;

-- IMPORTANTE: probar RLS desde dos sesiones Auth distintas.
-- Las operaciones automáticas de ventas y recepciones siguen en sus RPC propios,
-- sgi_registrar_venta_empleado y sgi_confirmar_recepcion.
