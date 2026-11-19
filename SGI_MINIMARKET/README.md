# SGI Minimarket — sistema de gestión

Aplicación web con paneles separados para administrador y empleados, conectada a Supabase. El administrador registra y edita productos y proveedores, controla sucursales y puede crear y editar cuentas de empleados. Los trabajadores operan únicamente en su sede asignada.

**Antes de usar esta actualización en producción:** lee [INSTALACION_ACTUALIZACION.md](INSTALACION_ACTUALIZACION.md), revisa `sql/08_unidades_proveedores.sql` y despliega las dos Edge Functions. No guardes claves privadas en el frontend.

La unidad de medida `UND/KG/G/L/PAQ/CJA` proviene de `productos.unidad_medida`. El código de producto se genera automáticamente y las existencias permanecen como cantidades enteras por compatibilidad.

Para publicar en Netlify conserva el directorio `SGI_MINIMARKET`. La recuperación de contraseñas usa `restablecer-clave.html` y requiere configurar su URL de redirección en Supabase Auth.
