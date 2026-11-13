# SGI MINIMARKET — Integración con la base de datos (13/11/2026)

Este paquete parte del ZIP `sgi-minimarket-sprint4.zip` recibido. Mantiene el diseño Sprint 4 y el proyecto Supabase existente. **No sustituye la base de datos**.

## Tablas que ya existían en el proyecto

- Acceso: `usuarios` (id UUID, nombre, `rol` texto, sucursal_id, activo), `rol` (catálogo) y `sucursales`. `usuarios.id` está enlazado con `auth.users.id`. No se cambia este modelo.
- Inventario: `categorias`, `productos`, `inventarios` y `movimientos_inventario`.
- Proveedores: `proveedores` y `productos_proveedores`.
- Ventas y pagos: `ventas`, `detalle_ventas`, `formas_pago`, `pagos`, `vouchers`, `comprobantes`.
- Caja: `puntos_caja` (cajas físicas por sucursal), `cajas` (turnos) y `movimientos_caja` (dinero).
- Compras: `compras`, `detalle_compras` (pueden existir o no dependiendo de qué consultas se ejecutaron).
- Recepciones: `recepciones_compra` y `detalle_recepciones` (nuevas en este paquete).

El total exacto debe confirmarse ejecutando `sql/00_diagnostico_sin_cambios.sql`. No se presume que las capturas de SQL confirmen todas las operaciones.

## Qué se cambió en la página

| Panel | Función | Estado de este paquete |
|---|---|---|
| Administrador | Crear proveedores | Interfaz + RPC `sgi_registrar_proveedor` |
| Administrador | Crear órdenes con varios productos y costo | Interfaz + RPC `sgi_crear_compra` |
| Empleado / Admin | Ver pedidos de su sucursal y confirmar entregas | Interfaz + RPC `sgi_confirmar_recepcion` |
| Empleado / Admin | Cantidades buenas, dañadas, faltantes y entregas parciales | Interfaz + transacción en Postgres |
| Admin | Crear Caja 03 / Caja 04 por sucursal | Interfaz + RPC `sgi_crear_punto_caja` |
| Admin | Ver cajas físicas y turnos registrados | Solo consulta |
| Admin | Ver ventas, líneas, pagos, vouchers y comprobantes | Solo consulta |
| Inventario | Sumar stock de mercadería recibida y registrar movimiento | Automático dentro de la RPC de recepción |

**No se han añadido botones para crear ventas ni para abrir/cerrar turnos de caja**: dichas operaciones requieren transacciones y pruebas adicionales. El campo `comprobantes` tampoco reemplaza una integración de facturación electrónica SUNAT. Las boletas de movimientos del Sprint 4 siguen siendo documentos **internos** de inventario, no documentos tributarios.

## Pasos exactos de instalación en Supabase

1. Antes de hacer cambios, exporta o respalda el esquema y los datos de Supabase.
2. Ejecuta **solo consultas** del archivo `sql/00_diagnostico_sin_cambios.sql`. Confirma que se trata del mismo proyecto Supabase de la web y que existen las tablas antiguas requeridas.
3. Si las columnas coinciden con las verificadas en esta conversación, ejecuta `sql/04_compras_recepciones.sql` en **SQL Editor**. Este script respeta los datos y crea/ajusta únicamente compras y recepciones, además de sus funciones y políticas. Las compras previas no se eliminan.
4. Ejecuta **después** `sql/05_cajas_consultas.sql`, solamente si ya existen `puntos_caja`, `cajas`, `movimientos_caja`, `ventas`, `detalle_ventas`, `formas_pago`, `pagos`, `vouchers` y `comprobantes` como en las capturas. Configura sus lecturas y permite agregar cajas/proveedores mediante RPC.
5. Ejecuta de nuevo `sql/00_diagnostico_sin_cambios.sql` para comprobar las tablas, las funciones y **todas las políticas existentes**. Haz pruebas reales con cuentas de administrador y empleado de diferentes sucursales. El SQL Editor generalmente ejecuta con un rol privilegiado y **no prueba RLS bajo cuentas de usuario**.
6. Abre la web y comprueba primero lectura de proveedores, luego registro de orden, luego recepción. Comprueba el historial `movimientos_inventario`, el aumento de `inventarios.stock` solamente por unidades buenas, y la restricción de sucursal.

**Precaución sobre RLS:** PostgreSQL puede combinar políticas permisivas existentes mediante OR. Los scripts crean políticas específicas nuevas, pero *no eliminan políticas antiguas desconocidas*. Si existían reglas demasiado amplias, un administrador técnico debe revisarlas antes de publicar. Tampoco se han validado en tu proyecto remoto los permisos efectivos ni la compatibilidad con datos previos.

## Ejemplo de prueba funcional

- El administrador selecciona sucursal Arequipa en el selector (no «Todas»), registra un pedido de 20 arroz y 10 aceite.
- Un empleado asignado a Arequipa entra a «Recepción de mercadería», abre esa orden y anota arroz: 17 unidades buenas y 3 dañadas; aceite: 6 buenas y 0 dañadas.
- Confirma una primera entrega: `inventarios.stock` aumenta **17 arroz** y **6 aceite**, y `movimientos_inventario` recibe dos entradas con referencia a la compra.
- El pedido queda como «Recepción parcial» hasta completar los **4 aceites** restantes. Las 3 unidades dañadas se registran pero no incrementan existencias.
- Si la misma solicitud se reintenta por un fallo de conexión, la RPC reconoce su UUID `operacion_id` y evita sumar el mismo lote dos veces.
- Un empleado de Lima no debe poder recibir una compra de Arequipa, incluso si intenta enviar la solicitud de API por fuera de la página.

## Sitio en Netlify y carpetas del ZIP

- **Recomendado:** GitHub/Netlify usan `SGI_MINIMARKET/` como raíz de publicación, con `netlify.toml` dentro de esa carpeta.
- En este ZIP también se sincronizó una **copia de compatibilidad** de la web en la raíz, porque el ZIP recibido ya contenía una versión más antigua allí. Ambas rutas web tienen las mismas funciones; utiliza **solo una** para publicar, no mezcles archivos de ambas carpetas.
- Si tu Netlify apunta a `SGI_MINIMARKET`, sustituye esa carpeta en tu repositorio y deja la configuración de compilación anterior. Si publica desde la raíz, utiliza los archivos web sincronizados en raíz.
- No se modificó `js/config.js`: conserva la URL y clave **publishable** que ya tenías (nunca usar `service_role` en JavaScript).
- Descargar el ZIP no modifica automáticamente Supabase, GitHub ni Netlify: la migración y el despliegue se hacen por separado.

## Pendiente para una versión de producción

- Validar y documentar permisos RLS de todas las tablas existentes. Evitar cualquier acceso no autorizado entre sucursales.
- Crear ventas con stock descontado y pagos confirmados mediante una única función transaccional (con devolución/anulación).
- Crear apertura, cierre, arqueo y movimientos de caja con validación de turno y separación efectivo vs. digital.
- Considerar transferencias entre sucursales, auditoría, reportes y facturación electrónica conforme a SUNAT.
- Probar concurrencia, reintentos, sesión caducada, varias sucursales y dispositivos móviles.
