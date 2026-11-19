# SGI MINIMARKET

**Versión web actualizada**. Los archivos operativos se encuentran en `SGI_MINIMARKET/`.

- **Netlify**: configura como directorio de publicación `SGI_MINIMARKET` (sin comando de compilación).
- **Servidor local**: entra a `SGI_MINIMARKET` y ejecuta `python -m http.server 5500`.
- **Gestión de empleados**: lee `SGI_MINIMARKET/CONFIGURAR_EMPLEADOS.md` para habilitar la creación de usuarios con Supabase Edge Functions.
- **Cambios de permisos SQL**: no se ejecutan automáticamente; revisa `SGI_MINIMARKET/sql/07_permisos_inventario_admin.sql` y haz respaldo antes de aplicar.

Los archivos HTML de la raíz redirigen al directorio actualizado para evitar abrir por accidente paneles anteriores.
