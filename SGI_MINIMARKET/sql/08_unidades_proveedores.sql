-- SGI MINIMARKET - Unidades de medida y edición segura de productos y proveedores.
-- Aplicar una sola vez en Supabase SQL Editor, tras realizar un respaldo de la base.
-- No elimina tablas ni registros, conserva las 22 tablas actuales.
BEGIN;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS unidad_medida varchar(10) NOT NULL DEFAULT 'UND';
UPDATE public.productos SET unidad_medida='UND'
WHERE unidad_medida IS NULL OR btrim(unidad_medida)='';

-- Crear producto con ID/código automático, unidad de medida, saldo e historial atómicos.
CREATE OR REPLACE FUNCTION public.sgi_crear_producto_con_unidad(
  p_codigo text, p_nombre text, p_categoria_id bigint, p_precio numeric,
  p_sucursal_id bigint, p_stock_inicial integer, p_stock_minimo integer,
  p_unidad_medida text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $sgi$
DECLARE v_id bigint; v_codigo text; v_nombre text := btrim(coalesce(p_nombre,''));
  v_usuario uuid := (SELECT auth.uid()); v_categoria bigint;
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS(SELECT 1 FROM public.usuarios u
    WHERE u.id=v_usuario AND u.activo AND u.rol='administrador')
  THEN RAISE EXCEPTION 'Solo el administrador puede registrar productos'; END IF;
  IF length(v_nombre) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Nombre inválido'; END IF;
  IF p_unidad_medida IS NULL OR p_unidad_medida NOT IN ('UND','KG','G','L','PAQ','CJA')
  THEN RAISE EXCEPTION 'Unidad de medida inválida'; END IF;
  IF p_precio IS NULL OR p_precio < 0 OR p_precio > 9999999999.99
  THEN RAISE EXCEPTION 'Precio inválido'; END IF;
  IF p_stock_inicial IS NULL OR p_stock_minimo IS NULL OR p_stock_inicial<0 OR p_stock_minimo<0
  THEN RAISE EXCEPTION 'Stock inicial o mínimo inválido'; END IF;
  SELECT id INTO v_categoria FROM public.categorias WHERE id=p_categoria_id AND activo;
  IF v_categoria IS NULL THEN RAISE EXCEPTION 'La categoría no está disponible'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.sucursales WHERE id=p_sucursal_id AND activo)
  THEN RAISE EXCEPTION 'Sucursal inactiva o inexistente'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(v_nombre),0));
  IF EXISTS(SELECT 1 FROM public.productos p WHERE lower(btrim(p.nombre))=lower(v_nombre))
  THEN RAISE EXCEPTION 'El nombre del producto ya existe (aunque tenga otra categoría)'; END IF;
  IF length(btrim(coalesce(p_codigo,''))) = 0 THEN
    -- El id proviene de la secuencia asociada a productos (sin reutilizar valores).
    v_id := nextval(pg_catalog.pg_get_serial_sequence('public.productos','id'));
    v_codigo := 'PRD'||lpad(v_id::text,4,'0');
    WHILE EXISTS(SELECT 1 FROM public.productos WHERE id=v_id OR codigo=v_codigo) LOOP
      v_id := nextval(pg_catalog.pg_get_serial_sequence('public.productos','id'));
      v_codigo := 'PRD'||lpad(v_id::text,4,'0');
    END LOOP;
    INSERT INTO public.productos(id,codigo,nombre,categoria_id,precio,unidad_medida,registrado_por)
    VALUES(v_id,v_codigo,v_nombre,p_categoria_id,p_precio,p_unidad_medida,v_usuario);
  ELSE
    v_codigo:=upper(btrim(p_codigo));
    IF length(v_codigo)>30 THEN RAISE EXCEPTION 'Código demasiado largo'; END IF;
    INSERT INTO public.productos(codigo,nombre,categoria_id,precio,unidad_medida,registrado_por)
    VALUES(v_codigo,v_nombre,p_categoria_id,p_precio,p_unidad_medida,v_usuario)
    RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.inventarios(sucursal_id,producto_id,stock,stock_minimo)
  VALUES(p_sucursal_id,v_id,p_stock_inicial,p_stock_minimo);
  IF p_stock_inicial > 0 THEN
    INSERT INTO public.movimientos_inventario(
      sucursal_id,producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,usuario_id
    ) VALUES(p_sucursal_id,v_id,'entrada',p_stock_inicial,0,p_stock_inicial,
      'Existencia inicial del producto',v_usuario);
  END IF;
  RETURN v_id;
END;
$sgi$;

CREATE OR REPLACE FUNCTION public.sgi_actualizar_producto_ficha(
  p_id bigint,p_codigo text,p_nombre text,p_categoria_id bigint,
  p_precio numeric,p_unidad_medida text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $sgi$
DECLARE v_usuario uuid := (SELECT auth.uid()); v_nombre text:=btrim(coalesce(p_nombre,''));
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS(SELECT 1 FROM public.usuarios u
    WHERE u.id=v_usuario AND u.activo AND u.rol='administrador')
  THEN RAISE EXCEPTION 'No autorizado para editar productos'; END IF;
  IF p_id IS NULL OR p_id<1 OR length(v_nombre) NOT BETWEEN 2 AND 120 OR
     length(btrim(coalesce(p_codigo,''))) NOT BETWEEN 1 AND 30 OR
     p_precio IS NULL OR p_precio<0 OR p_precio>9999999999.99 OR
     p_unidad_medida IS NULL OR p_unidad_medida NOT IN ('UND','KG','G','L','PAQ','CJA')
  THEN RAISE EXCEPTION 'Datos del producto no válidos'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.categorias WHERE id=p_categoria_id AND activo)
  THEN RAISE EXCEPTION 'Categoría no disponible'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(v_nombre),0));
  IF EXISTS(SELECT 1 FROM public.productos p WHERE lower(btrim(p.nombre))=lower(v_nombre) AND p.id<>p_id)
  THEN RAISE EXCEPTION 'El nombre del producto ya está registrado'; END IF;
  UPDATE public.productos SET codigo=upper(btrim(p_codigo)),nombre=v_nombre,
    categoria_id=p_categoria_id,precio=p_precio,unidad_medida=p_unidad_medida
    WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producto inexistente'; END IF;
  RETURN p_id;
END;
$sgi$;

-- Edición de proveedores mediante RPC. Los clientes web NO tienen permiso UPDATE directo.
CREATE OR REPLACE FUNCTION public.sgi_actualizar_proveedor(
  p_id bigint,p_ruc text,p_razon_social text,p_contacto text,p_telefono text,
  p_correo text,p_direccion text,p_activo boolean
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $sgi$
DECLARE v_usuario uuid := (SELECT auth.uid());v_ruc text:=btrim(coalesce(p_ruc,''));
  v_razon text:=btrim(coalesce(p_razon_social,''));
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS(SELECT 1 FROM public.usuarios u
    WHERE u.id=v_usuario AND u.activo AND u.rol='administrador')
  THEN RAISE EXCEPTION 'No autorizado para editar proveedores'; END IF;
  IF p_id IS NULL OR p_id<1 OR v_ruc !~ '^[0-9]{11}$' OR
     length(v_razon) NOT BETWEEN 2 AND 150 OR p_activo IS NULL
  THEN RAISE EXCEPTION 'RUC, razón social o estado inválidos'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_ruc,0));
  IF EXISTS(SELECT 1 FROM public.proveedores WHERE ruc=v_ruc AND id<>p_id)
  THEN RAISE EXCEPTION 'Ese RUC pertenece a otro proveedor'; END IF;
  UPDATE public.proveedores SET ruc=v_ruc,razon_social=v_razon,
    contacto=nullif(left(btrim(coalesce(p_contacto,'')),120),''),
    telefono=nullif(left(btrim(coalesce(p_telefono,'')),40),''),
    correo=nullif(left(btrim(coalesce(p_correo,'')),120),''),
    direccion=nullif(left(btrim(coalesce(p_direccion,'')),250),''),activo=p_activo
  WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proveedor no encontrado'; END IF;
  RETURN p_id;
END;
$sgi$;

REVOKE ALL ON FUNCTION public.sgi_crear_producto_con_unidad(text,text,bigint,numeric,bigint,integer,integer,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.sgi_actualizar_producto_ficha(bigint,text,text,bigint,numeric,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.sgi_actualizar_proveedor(bigint,text,text,text,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sgi_crear_producto_con_unidad(text,text,bigint,numeric,bigint,integer,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sgi_actualizar_producto_ficha(bigint,text,text,bigint,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sgi_actualizar_proveedor(bigint,text,text,text,text,text,text,boolean) TO authenticated;
COMMIT;

-- Comprobación sin modificaciones:
SELECT count(*) AS productos, count(DISTINCT unidad_medida) AS unidades_diferentes FROM public.productos;
SELECT unidad_medida,count(*) AS productos FROM public.productos GROUP BY unidad_medida ORDER BY unidad_medida;
SELECT to_regprocedure('public.sgi_crear_producto_con_unidad(text,text,bigint,numeric,bigint,integer,integer,text)') AS alta_productos,
       to_regprocedure('public.sgi_actualizar_producto_ficha(bigint,text,text,bigint,numeric,text)') AS edicion_productos,
       to_regprocedure('public.sgi_actualizar_proveedor(bigint,text,text,text,text,text,text,boolean)') AS edicion_proveedores;
