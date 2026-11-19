# SGI Minimarket — novedades de Sprint 5

La rama `sprint5-final` parte de `sprint4_02` y añade las mejoras del ZIP `sgi-minimarket-sprint5.zip` sin fusionar las ramas históricas.

## Administrador
- Módulo **Empleados** separado de Sucursales: alta de personal con nombre, correo, sucursal y contraseña temporal; directorio; edición; activar/desactivar; cambio de sucursal y contraseña.
- Módulo **Productos**: código generado automáticamente, unidad de medida (UND, KG, G, L, PAQ, CJA) y edición controlada de ficha. El stock sigue separado por sucursal.
- Módulo **Proveedores**: actualización de RUC, datos de contacto y estado.
- Nuevo aspecto visual de menús y tarjetas.

## Empleado
- La sucursal se obtiene de su perfil autenticado: no se muestra selector.
- Operaciones: venta y recepción de mercadería; consultas de catálogo, alertas e historial.
- **Mi cuenta**: cambio de contraseña verificando la contraseña anterior.
- En el inicio de sesión hay recuperación por correo a `restablecer-clave.html`.

## Archivos de servidor
- `sql/07_permisos_inventario_admin.sql`: restringe ajustes manuales a administradores.
- `sql/08_unidades_proveedores.sql`: agrega unidades y RPC de productos/proveedores.
- `supabase/functions/crear-empleado/` y `actualizar-clave-empleado/`: funciones con autorización de administrador.

## Consideraciones
Los archivos SQL en GitHub no se ejecutan solos. Las funciones Edge deben desplegarse a Supabase por separado. No guardar una clave `service_role` en la web. Las boletas internas de inventario no son comprobantes tributarios SUNAT. Para cantidades fraccionarias se necesita una evolución de la base: esta versión usa enteros.
