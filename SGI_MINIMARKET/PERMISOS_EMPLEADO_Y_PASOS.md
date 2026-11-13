# SGI MINIMARKET — Panel del empleado (Sprint 4)

## Cambios realizados

- El **administrador** asigna el empleado a una sucursal en `public.usuarios.sucursal_id`.
- El **empleado NO ve ni puede elegir sucursales**. No puede crear proveedores, gestionar cajas ni registrar ajustes de inventario manuales.
- La interfaz del empleado muestra Inicio, **Registrar ventas**, **Historial de movimientos** (solo consulta) y **Recepción de mercadería**.
- El punto de venta consulta precio y stock, registra una venta y un pago, y descuenta inventario con una única operación SQL. El servidor obtiene la sucursal de la cuenta autenticada y valida stock. El frontend nunca decide la sucursal ni el precio final.
- Recepción: por producto se registra **llegó bien**, **dañado**, **faltó**. Solo el producto bueno incrementa existencias. Lo faltante queda **pendiente**; no se marca como recibido ni se sumará al stock.
- La página conserva el estilo, colores y navegación de Sprint 4.

## Antes de probar en Supabase

1. Hacer una copia de seguridad de la base de datos.
2. Ejecutar `sql/00_diagnostico_sin_cambios.sql` para verificar tablas y restricciones actuales.
3. Ejecutar **sql/04_compras_recepciones.sql** (actualizado: registra faltantes; se puede volver a ejecutar después de respaldar y revisar políticas existentes).
4. Ejecutar **sql/05_cajas_consultas.sql**, si aún no se aplicó.
5. Ejecutar **sql/06_ventas_empleado.sql**, que crea la venta segura, registra pago y restringe los ajustes manuales al administrador.
6. Hacer pruebas con dos cuentas de empleado asignadas a sucursales distintas, más un administrador.

**Precauciones:** Ejecutar SQL Editor con respaldo y revisar políticas RLS previas, especialmente en `usuarios`, `inventarios`, `movimientos_inventario` y `productos`. Ningún cambio se ha aplicado automáticamente a tu Supabase.

## Pruebas necesarias

- Empleado A: solo consulta ventas y órdenes de la sucursal asignada, sin selector de sucursal.
- Añadir dos productos a la venta, verificar cantidades y forma de pago; confirmar y comprobar que existen `ventas`, `detalle_ventas`, `pagos` y movimientos de tipo `salida`.
- Intentar vender una cantidad mayor al stock: debe fallar y conservar el stock.
- Registrar recepción con 10 solicitadas, 7 buenas, 1 dañada, 2 faltantes: solo suben 7, el pedido queda pendiente por 2 y la recepción muestra el faltante reportado.
- Reintentar el mismo ID de operación de venta o recepción: no debe duplicar el movimiento.
- Intentar llamar a `registrar_movimiento` como empleado: debe denegar la operación; como administrador debe conservar ajustes manuales.
- Revisar que la separación entre sucursales se aplique a las consultas y a las funciones SQL.

## Limitaciones pendientes

- Un pago marcado como confirmado es una declaración del empleado, no una validación bancaria automática de Yape/Plin.
- No se emite automáticamente boleta/factura electrónica SUNAT.
- La caja física y su turno no se relacionan automáticamente con el cobro; la conciliación de caja queda como una mejora posterior.
- No se ha ejecutado una prueba real contra Supabase desde este entorno.
