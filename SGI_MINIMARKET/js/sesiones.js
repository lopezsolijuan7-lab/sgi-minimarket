import { supabase } from './config.js';

// El estado de la sesión y los permisos se validan en Supabase, no en el navegador.
// Esquema vigente: auth.users -> public.usuarios (sucursal_id en usuarios).
export async function obtenerContexto() {
  const { data: auth, error: errorAuth } = await supabase.auth.getUser();
  if (errorAuth || !auth?.user) {
    throw new Error('Tu sesión no está activa. Inicia sesión nuevamente.');
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('usuarios')
    .select('id,nombre,rol,sucursal_id,activo')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (errorPerfil) {
    throw new Error('No se pudo verificar tu usuario: ' + errorPerfil.message);
  }
  if (!perfil || !perfil.activo) {
    throw new Error('Tu cuenta no está registrada o está desactivada. Consulta al administrador.');
  }
  if (!['administrador', 'empleado'].includes(perfil.rol)) {
    throw new Error('Tu cuenta no tiene un rol autorizado.');
  }

  const esGeneral = perfil.rol === 'administrador';
  const { data: sedes, error: errorSedes } = await supabase
    .from('sucursales')
    .select('id,codigo,nombre,activo')
    .eq('activo', true)
    .order('nombre');
  if (errorSedes) {
    throw new Error('No se pudieron consultar las sucursales: ' + errorSedes.message);
  }

  // RLS ya filtra sucursales; el filtro de interfaz refuerza esa presentación.
  const sucursales = (sedes || []).filter(s => esGeneral ||
    Number(s.id) === Number(perfil.sucursal_id));
  if (!esGeneral && !sucursales.length) {
    throw new Error('Tu sucursal no está disponible. Comunícate con el administrador.');
  }

  return {
    usuario: auth.user,
    perfil,
    esGeneral,
    tienePanelAdministrador: esGeneral,
    sucursales,
    administra: () => esGeneral
  };
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.replace('index.html');
}
