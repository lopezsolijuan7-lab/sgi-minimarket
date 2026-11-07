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
