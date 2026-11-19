# Configurar gestión de empleados

Para registrar empleados desde el panel administrador es obligatorio desplegar dos Edge Functions de Supabase, además del código web. Se requiere un administrador activo en Supabase Auth y `public.usuarios` con `rol='administrador'`.

## Funciones de servidor
Desde el directorio `SGI_MINIMARKET`, con Supabase CLI instalado y enlazado al proyecto:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy crear-empleado
supabase functions deploy actualizar-clave-empleado
```

Las funciones leen `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` desde el entorno seguro del servidor. **Nunca** copies la clave de servicio al código JavaScript público, GitHub o Netlify.

## Proceso de alta
1. Inicia sesión como administrador y entra a **Empleados**.
2. Introduce nombre, correo, sucursal y contraseña inicial (12 caracteres o más, letras y números).
3. La función verifica el administrador, crea el usuario en Auth y asigna `rol='empleado'` y `sucursal_id` en `public.usuarios`.
4. Entrega la contraseña inicial por un canal protegido; no se envía una invitación automática. El empleado puede cambiarla desde **Mi cuenta**.
5. El administrador puede editar nombre, sucursal y estado; también restablecer la contraseña de un empleado mediante la segunda función.

**Seguridad:** la función de alta establece `email_confirm=true`. El administrador debe verificar previamente que el correo pertenece realmente al empleado; de lo contrario, la cuenta podría usarse con una dirección no validada. No cambies un rol ni una cuenta de administrador desde el panel del empleado.

## Recuperación de contraseñas
En Supabase → **Authentication → URL Configuration**, añade la URL publicada de `restablecer-clave.html` a las redirecciones permitidas. Comprueba que el servicio de correo de Auth puede enviar correos; en producción utiliza SMTP adecuado.

## Pruebas
Verifica con dos sesiones reales que el administrador pueda dar de alta, editar y desactivar empleados, y que un empleado no pueda administrar cuentas ni consultar datos de otra sucursal. Confirma que una contraseña nueva funcione y la anterior deje de servir. La presencia de archivos en GitHub no prueba que la función Edge esté desplegada.
