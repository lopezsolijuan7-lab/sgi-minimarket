import { supabase } from './config.js';
import { obtenerContexto } from './sesiones.js';

const formulario = document.getElementById('loginForm');
const mensaje = document.getElementById('mensaje');
const boton = document.getElementById('btnIngresar');
const correo = document.getElementById('correo');
const password = document.getElementById('password');
const alternar = document.getElementById('mostrarPassword');

function informar(texto, esError = false) {
  mensaje.textContent = texto;
  mensaje.classList.toggle('mensaje-error', esError);
  mensaje.classList.toggle('mensaje-exito', !esError && Boolean(texto));
}
function abrirPanel(contexto) {
  window.location.replace(contexto.esGeneral ? 'administrador.html' : 'empleado.html');
}

alternar.addEventListener('click', () => {
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  alternar.textContent = visible ? 'Mostrar' : 'Ocultar';
  alternar.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  alternar.setAttribute('aria-pressed', String(!visible));
});

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (!formulario.reportValidity()) return;
  boton.disabled = true;
  boton.textContent = 'Verificando acceso…';
  informar('Comprobando credenciales…');
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: correo.value.trim(),
      password: password.value
    });
    if (error) {
      if (error.message === 'Invalid login credentials') {
        throw new Error('Correo o contraseña incorrectos.');
      }
      throw error;
    }
    const contexto = await obtenerContexto();
    informar('Acceso autorizado. Abriendo panel…');
    abrirPanel(contexto);
  } catch (error) {
    // Si Auth aceptó credenciales pero no existe usuario/rol autorizado, no dejar la sesión abierta.
    const { data: sesion } = await supabase.auth.getSession();
    if (sesion?.session) await supabase.auth.signOut();
    informar(error.message || 'No fue posible conectar con Supabase.', true);
    boton.disabled = false;
    boton.textContent = 'Ingresar al sistema';
  }
});

// La recuperación por correo se gestiona por Supabase Auth, sin enviar contraseñas.
const recuperarForm = document.getElementById('sgi-form-recuperar');
const enlaceRecuperar = document.getElementById('sgi-abrir-recuperacion');
const cerrarRecuperar = document.getElementById('sgi-cerrar-recuperacion');
function mostrarRecuperacion(mostrar) {
  formulario.hidden = mostrar;
  recuperarForm.hidden = !mostrar;
  enlaceRecuperar.hidden = mostrar;
  if (mostrar) {
    document.getElementById('sgi-recuperar-email').value = correo.value.trim();
    document.getElementById('sgi-recuperar-email').focus();
    informar('');
  }
}
enlaceRecuperar.addEventListener('click', () => mostrarRecuperacion(true));
cerrarRecuperar.addEventListener('click', () => mostrarRecuperacion(false));
recuperarForm.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (!recuperarForm.reportValidity()) return;
  const boton = document.getElementById('sgi-enviar-recuperacion');
  const estado = document.getElementById('sgi-recuperacion-estado');
  boton.disabled = true;
  estado.textContent = 'Enviando solicitud...';
  estado.dataset.error = 'false';
  try {
    const email = document.getElementById('sgi-recuperar-email').value.trim().toLowerCase();
    const redirectTo = new URL('restablecer-clave.html', window.location.href).href;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    estado.textContent = 'Si el correo está registrado, recibirás un enlace para cambiar la contraseña. Revisa también correo no deseado.';
  } catch (error) {
    estado.dataset.error = 'true';
    estado.textContent = 'No se pudo enviar el enlace: ' + (error.message || 'Error de conexión');
  } finally { boton.disabled = false; }
});

// Si el usuario regresa al login con sesión vigente, no pedir contraseña otra vez.
async function comprobarSesion() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) return;
    const contexto = await obtenerContexto();
    abrirPanel(contexto);
  } catch (_) {
    // Mostramos el formulario normalmente; los errores de red se informan al enviar.
  }
}
comprobarSesion();
