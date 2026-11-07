# SGI MINIMARKET — Estado técnico (versión web y base de datos)

Este documento conserva los estados acordados: Sprint 0 **realizado**, Sprint 1 **realizado**, Sprint 2 **en desarrollo** y Sprint 3 **planificado**.

## Sprint 0 — Planificación
- Proyecto de gestión de inventario de minimarket.
- Roles: Product Owner, Scrum Master y equipo Developer/QA.
- Tecnología de la web: HTML/CSS/JavaScript; Supabase (Auth y PostgreSQL), GitHub, Netlify.
- Se documenta la operación multisucursal en el diseño actual, sin atribuirle implementación retrospectiva en el sprint original.

## Sprint 1 — Usuarios y acceso
- Se conserva inicio de sesión con Supabase Auth.
- Base vigente: `public.usuarios` con `rol` = administrador/empleado, `activo` y `sucursal_id`.
- Administrador general: `sucursal_id = NULL`; empleado: una sucursal asignada.
- Paneles `administrador.html` y `empleado.html`.
- Se eliminaron referencias de ejecución a `perfiles` y `usuarios_sucursales`.

## Sprint 2 — Control de inventario (en desarrollo)
- `productos` almacena catálogo global, con `categoria_id`.
- `inventarios` mantiene `stock` y `stock_minimo` por sucursal.
- `movimientos_inventario` registra entradas/salidas y trazabilidad; web usa RPC `registrar_movimiento`.
- El administrador dispone de panel de indicadores y alertas.
- La captura de los productos PRD040–PRD050 es parte de una carga de 50 productos de prueba; para comprobar el total se requiere contar los registros en Supabase.
- Falta validar realmente las funciones SQL, las políticas RLS desde usuarios autenticados, la independencia entre dos sucursales y el despliegue Netlify.

## Sprint 3 — Proveedores y abastecimiento (planificado)
- La estructura de `proveedores` y `productos_proveedores` existe.
- Los formularios de gestión y recepción de mercadería no se presentan como terminados.

## Cambios de interfaz en este paquete
- Portada: `img/minimarket.jpg`, sin decoraciones de anime.
- Diseño responsivo en PC y móvil.
- Manifest y servicio de caché para recursos visuales estáticos (preparación PWA; el inventario exige conexión).

## Antes de ejecutar el sistema
- No volver a ejecutar el archivo de creación de tablas anterior (resguardado en `sql/historico/`).
- Ejecutar **solo el complemento** `sql/03_compatibilidad_web.sql` tras respaldo y verificación de tablas.
- Probar la aplicación publicada con perfiles reales en Supabase; el código no prueba por sí mismo los permisos RLS.
