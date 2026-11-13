-- SGI MINIMARKET - DIAGNOSTICO PREVIO (SOLO SELECT, NO CAMBIA DATOS)
-- Ejecutar primero en Supabase -> SQL Editor.
-- Tablas existentes: nunca ejecutar de nuevo los scripts historicos.
SELECT table_name AS tabla
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE'
ORDER BY table_name;

-- Tablas que requiere la ampliacion; "faltante" exige revisar antes de continuar.
SELECT t.nombre, to_regclass('public.'||t.nombre) IS NOT NULL AS existe
FROM (VALUES
 ('usuarios'),('rol'),('sucursales'),('categorias'),('productos'),
 ('inventarios'),('movimientos_inventario'),('proveedores'),
 ('productos_proveedores'),('ventas'),('detalle_ventas'),
 ('formas_pago'),('pagos'),('vouchers'),('comprobantes'),
 ('puntos_caja'),('cajas'),('movimientos_caja'),
 ('compras'),('detalle_compras'),('recepciones_compra'),('detalle_recepciones')
) AS t(nombre) ORDER BY t.nombre;

-- Funciones ya usadas por la web existente.
SELECT
 to_regprocedure('public.registrar_movimiento(bigint,bigint,text,integer,text)') AS rpc_movimiento,
 to_regprocedure('public.crear_producto_con_stock(text,text,bigint,numeric,bigint,integer,integer)') AS rpc_producto,
 to_regprocedure('public.configurar_stock_minimo(bigint,bigint,integer)') AS rpc_stock_minimo,
 to_regprocedure('public.sgi_crear_compra(bigint,bigint,text,jsonb)') AS rpc_compras,
 to_regprocedure('public.sgi_confirmar_recepcion(bigint,uuid,jsonb,text)') AS rpc_recepcion;

-- RLS por tabla: tras aplicar las migraciones debe estar habilitado para los modulos nuevos.
SELECT tablename, rowsecurity AS rls_activo
FROM pg_tables WHERE schemaname='public'
ORDER BY tablename;

-- Revision imprescindible de TODAS las politicas existentes.
-- Las politicas permisivas antiguas se combinan con OR, por lo que deben auditarse.
SELECT tablename, policyname, roles, cmd, permissive, qual
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('usuarios','proveedores','compras','detalle_compras',
    'recepciones_compra','detalle_recepciones','inventarios',
    'puntos_caja','cajas','ventas','pagos')
ORDER BY tablename,policyname;
