-- SGI MINIMARKET - COMPLEMENTO PARA LA BASE ACTUAL DE SUPABASE
-- NO crea ni elimina tablas; NO modifica datos existentes.
-- Ejecutar SOLO luego de comprobar que ya existen las 8 tablas actuales:
-- usuarios, sucursales, categorias, productos, inventarios,
-- movimientos_inventario, proveedores, productos_proveedores.
-- Requiere funcion public.es_admin() existente y Supabase Auth.
-- Registrar nuevos productos atomica y exclusivamente como administrador.

CREATE OR REPLACE FUNCTION public.crear_producto_con_stock(
  p_codigo text,
  p_nombre text,
  p_categoria_id bigint,
  p_precio numeric,
  p_sucursal_id bigint,
  p_stock_inicial integer,
  p_stock_minimo integer
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $funcion$
DECLARE
  v_producto_id bigint;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo el administrador activo puede registrar productos';
  END IF;
  IF p_codigo IS NULL OR length(btrim(p_codigo)) = 0 OR length(btrim(p_codigo)) > 30 OR
     p_nombre IS NULL OR length(btrim(p_nombre)) = 0 OR length(btrim(p_nombre)) > 120 THEN
    RAISE EXCEPTION 'Codigo o nombre invalido';
  END IF;
  IF p_precio IS NULL OR p_precio < 0 OR p_precio > 9999999999.99 THEN
    RAISE EXCEPTION 'Precio invalido';
  END IF;
  IF p_stock_inicial IS NULL OR p_stock_inicial < 0 OR p_stock_minimo IS NULL OR p_stock_minimo < 0 THEN
    RAISE EXCEPTION 'Stock inicial y stock minimo deben ser no negativos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categorias WHERE id = p_categoria_id AND activo) THEN
    RAISE EXCEPTION 'La categoria no existe o esta inactiva';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sucursales WHERE id = p_sucursal_id AND activo) THEN
    RAISE EXCEPTION 'La sucursal no existe o esta inactiva';
  END IF;

  INSERT INTO public.productos (codigo, nombre, categoria_id, precio, registrado_por)
  VALUES (upper(btrim(p_codigo)), btrim(p_nombre), p_categoria_id, p_precio, (SELECT auth.uid()))
  RETURNING id INTO v_producto_id;

  INSERT INTO public.inventarios (sucursal_id, producto_id, stock, stock_minimo)
  VALUES (p_sucursal_id, v_producto_id, p_stock_inicial, p_stock_minimo);

  IF p_stock_inicial > 0 THEN
    INSERT INTO public.movimientos_inventario (
      sucursal_id, producto_id, tipo, cantidad,
      stock_anterior, stock_nuevo, motivo, usuario_id
    ) VALUES (
      p_sucursal_id, v_producto_id, 'entrada', p_stock_inicial,
      0, p_stock_inicial, 'Stock inicial de producto', (SELECT auth.uid())
    );
  END IF;

  RETURN v_producto_id;
END;
$funcion$;

REVOKE ALL ON FUNCTION public.crear_producto_con_stock(text,text,bigint,numeric,bigint,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_producto_con_stock(text,text,bigint,numeric,bigint,integer,integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.crear_producto_con_stock(text,text,bigint,numeric,bigint,integer,integer) TO authenticated;

-- Verificar tambien que ya existen los RPC del esquema inicial.
SELECT
  to_regprocedure('public.crear_producto_con_stock(text,text,bigint,numeric,bigint,integer,integer)') IS NOT NULL AS crear_producto,
  to_regprocedure('public.registrar_movimiento(bigint,bigint,text,integer,text)') IS NOT NULL AS registrar_movimiento,
  to_regprocedure('public.configurar_stock_minimo(bigint,bigint,integer)') IS NOT NULL AS configurar_stock_minimo;
