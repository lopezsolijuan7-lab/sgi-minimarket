# SGI MINIMARKET — Seguimiento de Sprints y entrega sprint4_02
Actualizado: 13/11/2026 · Rama: `sprint4_02`

Esta versión integra el contenido aportado en `SGI_Minimarket_Sprint4_02.zip` con las correcciones previamente verificadas en `sprint4-mejorado`. Se preservaron los módulos ya corregidos. No debe confundirse un archivo SQL en GitHub con un despliegue o una migración ejecutada en Supabase.

## Sprint 0 — Planificación
Se definieron el problema de inventario multisucursal, objetivos, alcance, historias de usuario, roles Scrum, backlog, herramientas y planificación. El diseño tecnológico evolucionó durante el desarrollo desde la propuesta original hacia HTML, CSS, JavaScript y Supabase.

## Sprint 1 — Acceso de usuarios
Inicio de sesión con Supabase Auth, perfiles en `public.usuarios` y redirección a administrador o empleado. El rol se valida en servidor. Cada empleado tiene una única sucursal autorizada; el administrador general gestiona sedes.

## Sprint 2 — Inventario
Catálogo de productos y categorías, stock separado por sucursal, entradas, salidas, stock mínimo y alertas visuales. La operación se apoya en funciones RPC con validación de permisos y stock no negativo. Las cifras del panel dependen de los registros existentes y de los permisos de la cuenta.

## Sprint 3 — Proveedores y abastecimiento
Se incorporaron módulos de proveedores, órdenes de compra y recepción de mercadería; se admite recepción parcial, daño y faltantes mediante funciones SQL transaccionales. El proyecto anterior utilizaba `proveedores` y `productos_proveedores`; la integración agregó `recepciones_compra` y `detalle_recepciones`. La creación de tablas no significa que existan compras registradas.

## Sprint 4 — Interfaz, reportes y módulos comerciales
- Panel de administrador y empleado con navegación por módulos, indicadores, gráficos y estados vacíos correctos.
- Filtros por fecha, calendario, consulta del historial y exportación CSV para abrir en Excel.
- Boleta **interna de movimientos**, imprimible o guardable como PDF mediante el navegador. No es comprobante tributario SUNAT.
- Panel de empleados que conserva consulta de productos, registro manual de movimientos y alertas.
- Registro de ventas por empleado, formas de pago, consulta de ventas, puntos de caja y recepción de mercadería, integrados en la rama `sprint4-mejorado` y heredados por `sprint4_02`.
- El catálogo es común, pero las existencias y permisos pertenecen a cada sucursal.

## Sprint 5 — Pruebas y entrega
Queda la validación integral en navegador con ambas cuentas, pruebas de roles/RLS, stock insuficiente, compras y recepciones parciales, ventas, reintentos, reportes, dispositivos móviles, respaldo y manual de usuario.

## Estado verificado de la integración
- Los módulos SQL `04_compras_recepciones.sql`, `05_cajas_consultas.sql` y la versión corregida de `06_ventas_empleado.sql` se instalaron anteriormente en el proyecto Supabase conectado.
- Se probó una transacción simulada de compra, recepción, venta y movimiento en Supabase. El ensayo se ejecutó dentro de una transacción con `ROLLBACK`; no se conservaron ventas o compras ficticias.
- **No** se ha validado el recorrido completo con una sesión real en Netlify para esta nueva rama.
- El ZIP recibido incluía una vista de empleado sin `selector-sucursal`, `formulario-movimiento` ni `tabla-productos`: su prueba de estructura fallaba. En esta rama se retuvo la versión reparada, evitando esa regresión.
- La integración no cambia `main`, `sprint3`, `sprint4` ni la configuración de Netlify.

## Documentación técnica
- `SPRINT4_02_INTEGRACION_ZIP.md`: contenido del ZIP y decisiones de integración.
- `ACTUALIZACION_SUPABASE_SPRINT3_4.md`: estructura de base de datos y scripts.
- `ESTADO_INTEGRACION_SPRINT4_MEJORADO.md`: histórico de la iteración anterior, no reemplaza el estado aquí descrito.
- `tests/`: scripts de verificación estática; no sustituyen las pruebas funcionales con usuarios autenticados.
