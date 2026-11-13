-- SGI MINIMARKET · Consultas comerciales y puntos de caja
-- Ejecutar DESPUES de 04_compras_recepciones.sql, con respaldo.
-- Este complemento NO registra ventas/pagos ni abre/cierra caja.
-- Esas operaciones precisan transacciones seguras que aun no estan incorporadas.
BEGIN;

-- Consultas protegidas por usuario y sucursal.
ALTER TABLE public.puntos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sgi_puntos_caja_lectura ON public.puntos_caja;
CREATE POLICY sgi_puntos_caja_lectura ON public.puntos_caja FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.activo
  AND (u.rol='administrador' OR (u.rol='empleado' AND u.sucursal_id=puntos_caja.sucursal_id))));
DROP POLICY IF EXISTS sgi_cajas_lectura ON public.cajas;
CREATE POLICY sgi_cajas_lectura ON public.cajas FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.activo
  AND (u.rol='administrador' OR (u.rol='empleado' AND u.sucursal_id=cajas.sucursal_id))));
DROP POLICY IF EXISTS sgi_mov_cajas_lectura ON public.movimientos_caja;
CREATE POLICY sgi_mov_cajas_lectura ON public.movimientos_caja FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.cajas c WHERE c.id=movimientos_caja.caja_id));
DROP POLICY IF EXISTS sgi_ventas_lectura ON public.ventas;
CREATE POLICY sgi_ventas_lectura ON public.ventas FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.activo
  AND (u.rol='administrador' OR (u.rol='empleado' AND u.sucursal_id=ventas.sucursal_id))));
DROP POLICY IF EXISTS sgi_detalle_ventas_lectura ON public.detalle_ventas;
CREATE POLICY sgi_detalle_ventas_lectura ON public.detalle_ventas FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.ventas v WHERE v.id=detalle_ventas.venta_id));
DROP POLICY IF EXISTS sgi_formas_pago_lectura ON public.formas_pago;
CREATE POLICY sgi_formas_pago_lectura ON public.formas_pago FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.activo
  AND u.rol IN ('administrador','empleado')));
DROP POLICY IF EXISTS sgi_pagos_lectura ON public.pagos;
CREATE POLICY sgi_pagos_lectura ON public.pagos FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.ventas v WHERE v.id=pagos.venta_id));
DROP POLICY IF EXISTS sgi_vouchers_lectura ON public.vouchers;
CREATE POLICY sgi_vouchers_lectura ON public.vouchers FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.pagos p WHERE p.id=vouchers.pago_id));
DROP POLICY IF EXISTS sgi_comprobantes_lectura ON public.comprobantes;
CREATE POLICY sgi_comprobantes_lectura ON public.comprobantes FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.ventas v WHERE v.id=comprobantes.venta_id));

REVOKE ALL ON public.puntos_caja,public.cajas,public.movimientos_caja,
  public.ventas,public.detalle_ventas,public.formas_pago,public.pagos,
  public.vouchers,public.comprobantes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.puntos_caja,public.cajas,public.movimientos_caja,
  public.ventas,public.detalle_ventas,public.formas_pago,public.pagos,
  public.vouchers,public.comprobantes TO authenticated;

-- El administrador puede agregar Caja 03, Caja 04... sin un limite fijo.
CREATE OR REPLACE FUNCTION public.sgi_crear_punto_caja(
  p_sucursal_id bigint, p_codigo text, p_nombre text
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id bigint;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.activo
      AND u.rol='administrador'
  ) THEN RAISE EXCEPTION 'Solo el administrador puede agregar cajas'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.sucursales WHERE id=p_sucursal_id AND activo)
  THEN RAISE EXCEPTION 'Sucursal invalida'; END IF;
  IF p_codigo IS NULL OR upper(btrim(p_codigo)) !~ '^CAJA[0-9]{2,4}$'
    OR p_nombre IS NULL OR length(btrim(p_nombre)) NOT BETWEEN 1 AND 60
  THEN RAISE EXCEPTION 'Codigo CAJA03 y nombre valido requeridos'; END IF;
  INSERT INTO public.puntos_caja(sucursal_id,codigo,nombre)
  VALUES(p_sucursal_id,upper(btrim(p_codigo)),btrim(p_nombre)) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Registro de proveedores por admin. Evita RUC repetido en la ruta RPC.
CREATE OR REPLACE FUNCTION public.sgi_registrar_proveedor(
  p_ruc text,p_razon_social text,p_contacto text,p_telefono text,
  p_correo text,p_direccion text
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id bigint; v_ruc text := btrim(coalesce(p_ruc,''));
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.activo
      AND u.rol='administrador'
  ) THEN RAISE EXCEPTION 'Solo el administrador puede registrar proveedores'; END IF;
  IF v_ruc !~ '^[0-9]{11}$' THEN RAISE EXCEPTION 'El RUC debe tener 11 digitos'; END IF;
  IF length(btrim(coalesce(p_razon_social,''))) NOT BETWEEN 2 AND 150
  THEN RAISE EXCEPTION 'Razon social invalida'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_ruc,0));
  IF EXISTS(SELECT 1 FROM public.proveedores WHERE ruc=v_ruc)
  THEN RAISE EXCEPTION 'El RUC ya se encuentra registrado'; END IF;
  INSERT INTO public.proveedores(ruc,razon_social,contacto,telefono,correo,direccion,activo)
  VALUES(v_ruc,btrim(p_razon_social),
    left(nullif(btrim(coalesce(p_contacto,'')),''),120),
    left(nullif(btrim(coalesce(p_telefono,'')),''),40),
    left(nullif(btrim(coalesce(p_correo,'')),''),120),
    left(nullif(btrim(coalesce(p_direccion,'')),''),250),true) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Los proveedores se dan de alta unicamente mediante la funcion administrativa.
REVOKE INSERT, UPDATE, DELETE ON public.proveedores FROM anon,authenticated;

REVOKE ALL ON FUNCTION public.sgi_crear_punto_caja(bigint,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.sgi_registrar_proveedor(text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sgi_crear_punto_caja(bigint,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sgi_registrar_proveedor(text,text,text,text,text,text) TO authenticated;
COMMIT;

-- Comprobar roles/permisos al terminar desde SQL Editor:
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'
 AND tablename IN ('compras','recepciones_compra','puntos_caja','cajas','ventas','pagos')
 ORDER BY tablename;
