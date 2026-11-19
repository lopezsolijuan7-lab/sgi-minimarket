// Personal: la creación de cuentas se realiza exclusivamente en Supabase Edge Functions.
// Este archivo contiene una clave publicable, nunca credenciales administrativas.
import { supabase } from './config.js';
import { obtenerContexto } from './sesiones.js';

const $ = id => document.getElementById(id);
let empleados = [];
let sedes = [];
let ocupado = false;
let contexto = null;

function estado(id, texto, error = false) {
  const nodo = $(id);
  if (!nodo) return;
  nodo.textContent = texto;
  nodo.dataset.error = error ? 'true' : 'false';
}
function celda(fila, texto) {
  const td = document.createElement('td');
  td.textContent = String(texto ?? '—');
  fila.append(td);
  return td;
}
function opcion(select, value, label) {
  const item = document.createElement('option');
  item.value = String(value);
  item.textContent = label;
  select.append(item);
}
function llenarSelect(id, valores, campoLabel) {
  const select = $(id);
  if (!select) return;
  const valorPrevio = select.value;
  select.replaceChildren();
  opcion(select, '', 'Seleccionar ' + (id === 'asignacion-usuario' ? 'empleado' : 'sucursal'));
  for (const item of valores) opcion(select, item.id, campoLabel(item));
  if ([...select.options].some(item => item.value === valorPrevio)) select.value = valorPrevio;
}
function nombreSucursal(id) {
  return sedes.find(s => Number(s.id) === Number(id))?.nombre || 'Sin sucursal';
}
function dibujarTabla() {
  const tbody = $('sgi-empleados-tabla');
  if (!tbody) return;
  tbody.replaceChildren();
  $('sgi-empleados-total').textContent = String(empleados.length);
  $('sgi-empleados-activos').textContent = String(empleados.filter(e => e.activo).length);
  $('sgi-empleados-sedes').textContent = String(sedes.filter(s => s.activo).length);

  for (const empleado of empleados) {
    const fila = document.createElement('tr');
    const cNombre = document.createElement('td');
    const nombre = document.createElement('strong');
    nombre.textContent = empleado.nombre || 'Empleado';
    cNombre.append(nombre);
    fila.append(cNombre);
    celda(fila, nombreSucursal(empleado.sucursal_id));
    celda(fila, 'Empleado');
    const cEstado = document.createElement('td');
    const marca = document.createElement('span');
    marca.className = 'sgi-staff-status ' + (empleado.activo ? 'sgi-staff-status-on' : 'sgi-staff-status-off');
    marca.textContent = empleado.activo ? 'Activo' : 'Inactivo';
    cEstado.append(marca); fila.append(cEstado);
    const cAcciones = document.createElement('td');
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'sgi-staff-inline sgi-staff-edit';
    editar.textContent = 'Editar';
    editar.setAttribute('aria-label', 'Editar a ' + (empleado.nombre || 'este empleado'));
    editar.addEventListener('click', () => abrirEditor(empleado));
    cAcciones.append(editar);
    const clave = document.createElement('button');
    clave.type = 'button';
    clave.className = 'sgi-staff-inline sgi-staff-password';
    clave.textContent = '🔐 Contraseña';
    clave.setAttribute('aria-label','Cambiar contraseña de ' + (empleado.nombre || 'empleado'));
    clave.addEventListener('click', () => {
      abrirEditor(empleado);
      $('sgi-editar-clave')?.focus({preventScroll:true});
    });
    cAcciones.append(clave);
    const activar = document.createElement('button');
    activar.type = 'button';
    activar.className = 'sgi-staff-inline ' + (empleado.activo ? 'sgi-staff-danger' : 'sgi-staff-activate');
    activar.textContent = empleado.activo ? 'Desactivar' : 'Activar';
    activar.addEventListener('click', () => cambiarEstado(empleado, activar));
    cAcciones.append(activar);
    fila.append(cAcciones);
    tbody.append(fila);
  }
  if (!empleados.length) {
    const fila = document.createElement('tr');
    const c = celda(fila, 'Todavía no hay empleados registrados. Puedes invitar al primero desde el formulario.');
    c.colSpan = 5;
    tbody.append(fila);
  }
}
async function cargar() {
  if (!contexto?.esGeneral) return;
  const refrescar = $('sgi-empleados-actualizar');
  if (refrescar) refrescar.disabled = true;
  try {
    const [rUsuarios, rSedes] = await Promise.all([
      supabase.from('usuarios').select('id,nombre,rol,sucursal_id,activo').eq('rol','empleado').order('nombre'),
      supabase.from('sucursales').select('id,nombre,activo').order('nombre')
    ]);
    if (rUsuarios.error) throw rUsuarios.error;
    if (rSedes.error) throw rSedes.error;
    empleados = rUsuarios.data || [];
    sedes = rSedes.data || [];
    const activos = sedes.filter(s => s.activo);
    llenarSelect('sgi-empleado-sucursal', activos, s => s.nombre);
    llenarSelect('asignacion-sucursal', activos, s => s.nombre);
    llenarSelect('asignacion-usuario', empleados, e => (e.nombre || 'Empleado') + (e.activo ? '' : ' (inactivo)'));
    llenarSelect('sgi-editar-empleado-sucursal', activos, s => s.nombre);
    dibujarTabla();
    estado('sgi-empleados-listado-estado', '');
  } catch (error) {
    estado('sgi-empleados-listado-estado', 'No fue posible cargar el personal: ' + error.message, true);
  } finally {
    if (refrescar) refrescar.disabled = false;
  }
}
function cerrarEditor() {
  const panel = $('sgi-editar-empleado-panel');
  if (!panel) return;
  panel.hidden = true;
  $('sgi-form-editar-empleado')?.reset();
  $('sgi-editar-empleado-id').value = '';
  estado('sgi-editar-empleado-estado', '');
  $('sgi-form-clave-empleado')?.reset();
  estado('sgi-clave-estado', '');
}
function abrirEditor(empleado) {
  if (!contexto?.esGeneral || ocupado) return;
  const panel = $('sgi-editar-empleado-panel');
  if (!panel) return;
  $('sgi-editar-empleado-id').value = empleado.id;
  $('sgi-editar-empleado-nombre').value = empleado.nombre || '';
  const select = $('sgi-editar-empleado-sucursal');
  // Permite ver la sede anterior aunque haya sido desactivada;
  // para guardar se requiere elegir una sucursal activa.
  select.querySelectorAll('option[data-antigua="1"]').forEach(n => n.remove());
  if (empleado.sucursal_id != null && ![...select.options].some(o => Number(o.value) === Number(empleado.sucursal_id))) {
    const opcionAnterior = document.createElement('option');
    opcionAnterior.value = String(empleado.sucursal_id);
    opcionAnterior.textContent = nombreSucursal(empleado.sucursal_id) + ' (inactiva, selecciona otra)';
    opcionAnterior.dataset.antigua = '1';
    opcionAnterior.disabled = true;
    select.append(opcionAnterior);
  }
  select.value = String(empleado.sucursal_id ?? '');
  $('sgi-editar-empleado-activo').value = String(Boolean(empleado.activo));
  estado('sgi-editar-empleado-estado', '');
  $('sgi-form-clave-empleado')?.reset();
  estado('sgi-clave-estado', '');
  panel.hidden = false;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('sgi-editar-empleado-nombre').focus({preventScroll:true});
}
async function guardarEdicion(evento) {
  evento.preventDefault();
  if (!contexto?.esGeneral || ocupado) return;
  const form = evento.currentTarget;
  const id = $('sgi-editar-empleado-id').value;
  const actual = empleados.find(e => e.id === id);
  const nombre = $('sgi-editar-empleado-nombre').value.trim().replace(/\s+/g, ' ');
  const sucursal_id = Number($('sgi-editar-empleado-sucursal').value);
  const activo = $('sgi-editar-empleado-activo').value === 'true';
  const sedeValida = sedes.some(s => s.activo && Number(s.id) === sucursal_id);
  if (!actual || nombre.length < 2 || nombre.length > 120 || !sedeValida ||
      !form.reportValidity()) {
    estado('sgi-editar-empleado-estado', 'Revisa el nombre y selecciona una sucursal activa.', true);
    return;
  }
  const cambios = { nombre, sucursal_id, activo };
  if (actual.nombre === nombre && Number(actual.sucursal_id) === sucursal_id &&
      Boolean(actual.activo) === activo) {
    estado('sgi-editar-empleado-estado', 'No hay cambios para guardar.');
    return;
  }
  const boton = form.querySelector('button[type="submit"]');
  ocupado = true;
  boton.disabled = true;
  estado('sgi-editar-empleado-estado', 'Guardando cambios...');
  try {
    // La política RLS del servidor debe autorizar al admin, nunca a empleados.
    // No permite modificar rol, id ni credenciales de Authentication.
    const { data, error } = await supabase.from('usuarios')
      .update(cambios).eq('id', id).eq('rol', 'empleado')
      .select('id,nombre,sucursal_id,activo');
    if (error) throw error;
    if (data?.length !== 1) throw new Error('No se encontró el empleado o no tienes permiso.');
    await cargar();
    cerrarEditor();
    estado('sgi-empleados-listado-estado', 'Cambios guardados correctamente.');
  } catch (error) {
    estado('sgi-editar-empleado-estado', 'No se pudieron guardar los cambios: ' + error.message, true);
  } finally {
    ocupado = false;
    boton.disabled = false;
  }
}

async function cambiarEstado(empleado, boton) {
  if (!contexto?.esGeneral || ocupado) return;
  const accion = empleado.activo ? 'desactivar' : 'activar';
  if (!window.confirm(`¿Quieres ${accion} a ${empleado.nombre || 'este empleado'}?`)) return;
  ocupado = true;
  boton.disabled = true;
  try {
    const {data,error} = await supabase.from('usuarios')
      .update({activo: !empleado.activo})
      .eq('id',empleado.id).eq('rol','empleado').select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('La cuenta no se pudo modificar.');
    estado('sgi-empleados-listado-estado', 'Estado del empleado actualizado.');
    await cargar();
  } catch(error) {
    estado('sgi-empleados-listado-estado', 'No se pudo actualizar el estado: ' + error.message, true);
  } finally { ocupado = false; boton.disabled = false; }
}
async function invitar(evento) {
  evento.preventDefault();
  if (!contexto?.esGeneral || ocupado) return;
  const form = evento.currentTarget;
  const nombre = $('sgi-empleado-nombre').value.trim();
  const correo = $('sgi-empleado-correo').value.trim().toLowerCase();
  const sucursal_id = Number($('sgi-empleado-sucursal').value);
  const clave = $('sgi-empleado-clave').value;
  const confirmar = $('sgi-empleado-confirmar-clave').value;
  if (clave !== confirmar || clave.length < 12 || clave.length > 128 ||
      !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/[0-9]/.test(clave)) {
    estado('sgi-empleado-estado','Usa una contraseña de al menos 12 caracteres con letras y números y confirma que coincidan.',true);
    return;
  }
  if (nombre.length < 2 || !form.reportValidity() || !Number.isSafeInteger(sucursal_id) ||
      !sedes.some(s => s.activo && Number(s.id) === sucursal_id)) {
    estado('sgi-empleado-estado','Ingresa el nombre, correo y una sucursal activa.',true);return;
  }
  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true; ocupado = true;
  estado('sgi-empleado-estado','Registrando empleado...');
  try {
    const {data,error} = await supabase.functions.invoke('crear-empleado', {
      body:{nombre,correo,sucursal_id,clave}
    });
    if (error) {
      let detalle = '';
      try { detalle = (await error.context?.json())?.error || ''; } catch (_) { /* Error de red */ }
      throw new Error(detalle || (String(error.message).includes('Failed to send')
        ? 'No se pudo conectar con la función de empleados.' : error.message));
    }
    if (!data?.ok) throw new Error(data?.error || 'No se pudo crear el empleado.');
    form.reset();
    estado('sgi-empleado-estado', 'Cuenta de empleado creada y asignada a su sucursal. Comparte la contraseña inicial por un canal seguro.');
    await cargar();
  } catch(error) {
    const noExiste = /404|Not Found|not found|function.*does not exist/i.test(error.message);
    estado('sgi-empleado-estado', noExiste
      ? 'El registro de empleados no está habilitado en Supabase. Debes desplegar la función «crear-empleado».'
      : 'No se pudo invitar: ' + error.message, true);
  } finally { ocupado = false; boton.disabled = false; }
}
async function actualizarClave(evento) {
  evento.preventDefault();
  if (!contexto?.esGeneral || ocupado) return;
  const id = $('sgi-editar-empleado-id').value;
  const clave = $('sgi-editar-clave').value;
  const confirmar = $('sgi-confirmar-clave').value;
  if (!empleados.some(e => e.id === id)) {
    estado('sgi-clave-estado','Selecciona primero un empleado.',true); return;
  }
  if (clave !== confirmar || clave.length < 12 || clave.length > 128 ||
      !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/[0-9]/.test(clave)) {
    estado('sgi-clave-estado','La contraseña debe tener al menos 12 caracteres, letras y números. Las dos entradas deben coincidir.',true);
    return;
  }
  const boton = evento.currentTarget.querySelector('button[type="submit"]');
  ocupado = true; boton.disabled = true;
  estado('sgi-clave-estado','Actualizando contraseña...');
  try {
    const {data,error} = await supabase.functions.invoke('actualizar-clave-empleado', {
      body:{empleado_id:id,clave}
    });
    if (error) {
      let detalle = '';
      try {detalle = (await error.context?.json())?.error || '';} catch (_) {}
      throw new Error(detalle || error.message);
    }
    if (!data?.ok) throw new Error(data?.error || 'No fue posible actualizar la contraseña.');
    evento.currentTarget.reset();
    estado('sgi-clave-estado','Contraseña actualizada. Informa al empleado por un medio seguro y recomiéndale cambiarla desde «Mi cuenta».');
  } catch(error) {
    estado('sgi-clave-estado','Error al actualizar contraseña: ' + error.message,true);
  } finally {ocupado = false; boton.disabled = false;}
}

async function asignar(evento) {
  evento.preventDefault();
  if (!contexto?.esGeneral || ocupado) return;
  const id = $('asignacion-usuario').value;
  const sucursal_id = Number($('asignacion-sucursal').value);
  if (!empleados.some(e => e.id === id) || !sedes.some(s => s.activo && s.id === sucursal_id)) {
    estado('sgi-asignacion-estado','Selecciona un empleado y una sucursal activa.',true);return;
  }
  const boton = evento.currentTarget.querySelector('button[type="submit"]');
  boton.disabled = true;
  ocupado = true;
  try {
    const {data,error} = await supabase.from('usuarios').update({sucursal_id})
      .eq('id',id).eq('rol','empleado').select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('No se encontró el empleado.');
    estado('sgi-asignacion-estado','Sucursal asignada correctamente.');
    await cargar();
  } catch(error) {
    estado('sgi-asignacion-estado','No se pudo cambiar la sucursal: ' + error.message,true);
  } finally { ocupado = false; boton.disabled = false; }
}

async function iniciar() {
  if (!$('empleados')) return;
  try {
    contexto = await obtenerContexto();
    if (!contexto.esGeneral) return;
    $('empleados').hidden = false;
    await cargar();
    $('sgi-form-empleado')?.addEventListener('submit',invitar);
    $('formulario-asignacion')?.addEventListener('submit',asignar);
    $('sgi-form-editar-empleado')?.addEventListener('submit',guardarEdicion);
    $('sgi-form-clave-empleado')?.addEventListener('submit',actualizarClave);
    $('sgi-editar-empleado-cancelar')?.addEventListener('click',cerrarEditor);
    $('sgi-editar-empleado-cerrar')?.addEventListener('click',cerrarEditor);
    $('sgi-empleados-actualizar')?.addEventListener('click',cargar);
    document.addEventListener('sgi:sucursales-actualizadas',cargar);
    $('nav-empleados')?.addEventListener('click', () => cargar());
  } catch(error) {
    estado('sgi-empleados-listado-estado','No se pudo verificar tu cuenta: ' + error.message,true);
  }
}
iniciar();
