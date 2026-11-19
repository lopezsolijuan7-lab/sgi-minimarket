# Instalación y verificación — Sprint 5 final

Esta rama amplía `sprint4_02` con administración de empleados, recuperación de contraseñas, unidades de medida y edición de proveedores. No reemplaza ni borra automáticamente las tablas existentes.

## 1. Respaldar y verificar
Haz una copia de seguridad de Supabase y conserva las ramas anteriores. Comprueba que existen `public.usuarios`, `sucursales`, `productos`, `categorias`, `inventarios`, `movimientos_inventario` y `proveedores`, y que los perfiles tienen sus roles y sucursales correctos.

## 2. Migraciones SQL (revisar antes de ejecutar)
- `sql/07_permisos_inventario_admin.sql`: restringe ajustes manuales de inventario a administradores. **Cambia los permisos del Sprint 4**; revisa si coincide con el alcance aprobado y la firma existente antes de aplicarlo.
- `sql/08_unidades_proveedores.sql`: agrega `productos.unidad_medida` si falta y crea las funciones transaccionales para productos y proveedores. Los valores admitidos son UND, KG, G, L, PAQ y CJA. Las cantidades siguen siendo enteras.

No ejecutes migraciones anteriores de nuevo sin verificar el estado de la BD, ni pegues secretos en el SQL público.

## 3. Edge Functions
Despliega en el proyecto Supabase enlazado las funciones `crear-empleado` y `actualizar-clave-empleado` desde `supabase/functions/`. Las contraseñas se procesan exclusivamente en Supabase Auth y las claves administrativas deben permanecer en el entorno seguro de las funciones.

## 4. Autenticación y correos
En Supabase → Authentication → URL Configuration, configura `Site URL` y añade la URL pública de `restablecer-clave.html` a `Redirect URLs`. Verifica el envío de recuperación de contraseña y el acceso móvil.

## 5. Publicación
Netlify debe publicar la carpeta `SGI_MINIMARKET` de esta rama, con build command vacío para la web estática. No cambiar producción antes de probar el acceso, productos, ventas, recepciones y personal.

## 6. Pruebas de aceptación
- Crear empleado con cuenta de correo real; iniciar sesión y confirmar sucursal asignada.
- Administrador edita nombre, sede, activación y contraseña solo para empleados.
- Recuperar y cambiar contraseña con la URL correcta.
- Crear producto con código automático, categoría, unidad de medida y stock inicial; editar ficha sin alterar existencias.
- Editar proveedor sin duplicarlo.
- Venta y recepción actualizan stock e historial una sola vez.
- Rechazar venta sin existencias, accesos de empleado a otra sucursal y operaciones administrativas no autorizadas.
- Verificar boletas internas, CSV, calendario, gráficos y presentación en PC y móvil.

## Límites del módulo
La aplicación **no** emite boletas electrónicas SUNAT. Los vouchers registran referencias de pago, pero no validan transferencias ante una entidad bancaria. No existe envío de alertas de bajo stock por correo; el panel muestra alertas visuales.
