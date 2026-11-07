-- SGI MINIMARKET - COMPROBACION SIN CAMBIAR DATOS
-- Ejecutar en SQL Editor de Supabase (no valida RLS bajo una sesion de empleado).

-- 1. Tablas publicas
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;

-- 2. Usuarios vinculados a Auth (sin exponer contrasenas)
SELECT u.nombre, u.rol, u.activo, s.nombre AS sucursal
FROM public.usuarios u LEFT JOIN public.sucursales s ON s.id=u.sucursal_id
ORDER BY u.nombre;

-- 3. Productos e inventarios por sucursal
SELECT s.nombre AS sucursal, p.codigo, p.nombre, c.nombre AS categoria,
       p.precio, i.stock, i.stock_minimo
FROM public.inventarios i
JOIN public.sucursales s ON s.id=i.sucursal_id
JOIN public.productos p ON p.id=i.producto_id
JOIN public.categorias c ON c.id=p.categoria_id
ORDER BY s.nombre,p.codigo;

-- 4. RLS habilitado
SELECT tablename,rowsecurity AS rls_activo
FROM pg_tables WHERE schemaname='public' ORDER BY tablename;

-- 5. Comprobar funciones necesarias para la web
SELECT
  to_regprocedure('public.crear_producto_con_stock(text,text,bigint,numeric,bigint,integer,integer)') AS rpc_crear_producto,
  to_regprocedure('public.registrar_movimiento(bigint,bigint,text,integer,text)') AS rpc_movimientos,
  to_regprocedure('public.configurar_stock_minimo(bigint,bigint,integer)') AS rpc_stock_minimo;

-- Las pruebas RLS reales requieren iniciar sesion desde el frontend
-- con una cuenta administrador y otra empleado de diferentes sucursales.
