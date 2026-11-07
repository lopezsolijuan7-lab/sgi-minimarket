# SGI MINIMARKET — WEB RESPONSIVA Y SUPABASE

**Proyecto académico** de gestión de inventario multisucursal (Sprints 0, 1 y 2; Sprint 2 aún en desarrollo).

Este paquete consolida en **una sola carpeta** la versión web y los cambios para la **base de datos que ya existe en Supabase**. No es un proyecto nuevo ni requiere volver a crear las ocho tablas.

## Mejoras de esta versión

1. **Inicio de sesión** para PC, tablet y celular, con `img/minimarket.jpg` como portada. Se retiraron Dragon Ball y One Piece.
2. **Supabase Auth:** inicio de sesión con correo y contraseña; redirección según `public.usuarios.rol`.
3. **Modelo vigente:** `usuarios.sucursal_id` en lugar de `perfiles` y `usuarios_sucursales`; catálogo global en `productos`, categoría vinculada mediante `categoria_id`, existencias en `inventarios`.
4. **Administrador:** consulta inventario por sucursal o consolidado, registra/edita productos, revisa alertas, crea sucursales y asigna empleados ya registrados a una sola sucursal.
5. **Empleado:** consulta inventario y registra entradas/salidas *en su sucursal*. No tiene alta de productos: la política RLS de `productos` la reserva al administrador.
6. **Movimientos:** usa RPC `registrar_movimiento` en Supabase para registrar el historial con stock no negativo; para cambiar el mínimo, el panel administrador utiliza `configurar_stock_minimo`.
7. **Instalación web:** se incluyen manifest e íconos para su uso como PWA en HTTPS (Netlify). Requiere conexión a Internet y Supabase: no es una aplicación móvil nativa ni un programa Windows independiente.

## Qué hacer en Supabase

**No ejecutes de nuevo el SQL que crea las tablas**. Tu base ya contiene las ocho tablas públicas:
`usuarios`, `sucursales`, `categorias`, `productos`, `inventarios`, `movimientos_inventario`, `proveedores`, `productos_proveedores`.

- Verifica que existan los usuarios de Supabase Auth vinculados con `usuarios` y que cada empleado tenga `sucursal_id`.
- Verifica RLS y los RPC `registrar_movimiento(bigint,bigint,text,integer,text)` y `configurar_stock_minimo(bigint,bigint,integer)`.
- **Con respaldo previo** y luego de comprobar que estás en el proyecto Supabase correcto, ejecuta `sql/03_compatibilidad_web.sql` en **SQL Editor**. Este complemento crea/actualiza **solo** la función `crear_producto_con_stock`, que guarda el producto, su stock inicial y su movimiento en una transacción. No crea ni borra tablas ni elimina productos.
- Ejecuta `sql/02_verificacion.sql` para consultar el estado de las tablas, los registros y las funciones.
- La versión anterior del SQL que recreaba tablas y `usuarios_sucursales` está archivada en `sql/historico/` **NO EJECUTAR EN LA BD ACTUAL**.

## Cómo abrir o publicar la web

- Desarrollo local: desde esta carpeta usa `python -m http.server 8000` y abre `http://localhost:8000`. No se recomienda abrir `index.html` con `file://` porque usa módulos ES y Supabase.
- En Netlify: publicar los archivos web (`index.html`, `administrador.html`, `empleado.html`, `dashboard.html`, `css/`, `js/`, `img/`, `icons/`, `app.webmanifest`, `service-worker.js`). No es necesario un comando de compilación.
- Si el repositorio de GitHub contiene el código en la raíz, deja `Build command` vacío y `Publish directory` en `.`. Si está dentro de una subcarpeta, ajusta `Base directory`/`Publish directory`.
- Si existe un sitio anterior en Netlify, no se actualiza solo descargando el ZIP: debes subir los cambios al repositorio publicado o desplegar los archivos web nuevos.
- En `js/config.js` se utiliza la URL y **publishable key** del proyecto Supabase usado en los avances. Verifica que coincidan con tu proyecto; **nunca pongas `service_role` ni secretos en el frontend**.
- Supabase Auth: si usas recuperación de contraseña, confirmación por enlace o redirecciones, revisa `Site URL` y `Redirect URLs` con el dominio de Netlify.

## Pruebas recomendadas antes de presentar el Sprint 2

1. Inicia sesión como administrador y verifica la tabla con los productos cargados (incluidos PRD001–PRD050).
2. Verifica categorías, precios y stock del local `Minimarket Central`.
3. Inicia sesión como empleado y comprueba que vea solo su sucursal.
4. Registra una **entrada** pequeña, revisa el stock nuevo y el historial.
5. Registra una **salida** de prueba y comprueba que una salida superior al saldo se rechace.
6. Si cuentas con dos sucursales, comprueba que el stock y los mínimos sean independientes y que un empleado no acceda a la segunda por API.
7. Prueba el login y los paneles en PC y en un celular; revisa que Netlify cargue sin errores.

**IMPORTANTE:** se verificó la sintaxis y la interfaz localmente, pero **no se realizaron consultas autenticadas a tu Supabase remoto**. El envío a Netlify, la seguridad real entre sucursales y las operaciones RPC requieren pruebas con tus cuentas.

## Futuras versiones: software y app

Esta es una **web responsiva con base PWA**. Se puede instalar como acceso independiente desde navegadores compatibles mediante HTTPS. Una aplicación Android/iOS nativa puede crearse después mediante un contenedor (p. ej., Capacitor), y un programa de escritorio mediante una tecnología apropiada, **sin rediseñar la base de datos**. La autenticación y los permisos siguen dependiendo de Supabase.

## Integrantes técnicos (distribución de tareas)

- Luis Valverde: Product Owner y base de datos Supabase.
- Juan Pérez: Scrum Master y seguimiento de Sprints.
- Alex Celes: Frontend, UI/UX y despliegue Netlify.
- Jhon Valderrama: Integración frontend/backend y lógica de aplicación.
- Abdiel Burga: Pruebas y calidad.
- Marcos López: Inventario, proveedores y abastecimiento.
