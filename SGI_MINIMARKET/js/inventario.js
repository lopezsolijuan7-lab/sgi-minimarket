import { supabase } from './config.js';
import { obtenerContexto, cerrarSesion } from './sesiones.js';

const $ = id => document.getElementById(id);
const dinero = valor => new Intl.NumberFormat('es-PE', { style:'currency',currency:'PEN' }).format(Number(valor) || 0);

function crearCelda(fila, valor) {
  const td = document.createElement('td');
  td.textContent = String(valor ?? '');
  fila.append(td);
  return td;
}
function opcion(select, valor, nombre) {
  const item = document.createElement('option');
  item.value = String(valor);
  item.textContent = nombre;
  select.append(item);
}
async function todosDe(tabla, columnas, columnaOrden = 'id') {
  const acumulados = [];
  // PostgREST limita la cantidad de filas devueltas por petición: paginar.
  for (let inicio = 0; ; inicio += 500) {
    const { data, error } = await supabase.from(tabla)
      .select(columnas).order(columnaOrden).range(inicio, inicio + 499);
    if (error) throw error;
    acumulados.push(...(data || []));
    if (!data || data.length < 500) return acumulados;
  }
}

export async function iniciarInventario(rolVista) {
  let contexto;
  let sucursalSeleccionada = '';
  let catalogo = [];
  let categorias = [];
  let inventarios = [];
  let registros = [];
  let editandoId = null;
  const vistaAdmin = rolVista === 'administrador';
  const formulario = $('formulario-producto'); // solo existe en el panel administrador
  const formularioMovimiento = $('formulario-movimiento');
  const selectorSucursal = $('selector-sucursal');

  function informar(texto, error = false, destino = 'mensaje-producto') {
    const nodo = $(destino);
    if (!nodo) return;
    nodo.textContent = texto;
    nodo.style.color = error ? '#b42318' : '#047857';
  }
  const sedesPermitidas = () => contexto?.sucursales || [];
  const sedeActiva = () => {
    const sede = Number(sucursalSeleccionada);
    return Number.isSafeInteger(sede) && sede > 0 && sedesPermitidas().some(s => Number(s.id) === sede)
      ? sede : null;
  };

  function seleccionarSucursal(preferencia = '') {
    const sedes = sedesPermitidas();
    selectorSucursal.replaceChildren();
    if (vistaAdmin && sedes.length > 1) opcion(selectorSucursal, 'todas', 'Todas las sucursales');
    for (const sede of sedes) opcion(selectorSucursal, sede.id, sede.nombre);
    const validas = [...selectorSucursal.options].map(o => o.value);
    sucursalSeleccionada = validas.includes(String(preferencia)) ? String(preferencia) : String(sedes[0]?.id || '');
    selectorSucursal.value = sucursalSeleccionada;
    if ($('sucursal-actual')) $('sucursal-actual').textContent = sucursalSeleccionada === 'todas'
      ? 'Vista consolidada' : sedes.find(s => String(s.id) === sucursalSeleccionada)?.nombre || 'Sin sucursal';
  }

  function reiniciarFormulario() {
    if (!formulario) return;
    editandoId = null;
    formulario.reset();
    if ($('titulo-formulario')) $('titulo-formulario').textContent = 'Registrar producto';
    if ($('guardar-producto')) $('guardar-producto').textContent = 'Guardar producto';
    if ($('cancelar-edicion')) $('cancelar-edicion').hidden = true;
    for (const id of ['stock', 'stock-minimo']) {
      const campo = $(id);
      if (campo) { campo.disabled = false; campo.closest('label').hidden = false; }
    }
    if ($('stock-minimo')) $('stock-minimo').value = '5';
  }
  function editarProducto(producto) {
    if (!vistaAdmin || !contexto.esGeneral || !formulario) return;
    editandoId = producto.id;
    $('codigo').value = producto.codigo;
    $('nombre').value = producto.nombre;
    $('categoria').value = String(producto.categoria_id);
    $('precio').value = producto.precio;
    for (const id of ['stock','stock-minimo']) {
      const campo = $(id);
      if (campo) { campo.closest('label').hidden = true; campo.disabled = true; }
    }
    $('titulo-formulario').textContent = 'Editar ficha del producto';
    $('guardar-producto').textContent = 'Guardar cambios';
    $('cancelar-edicion').hidden = false;
    location.hash = 'registro';
  }

  function mostrarProductos() {
    const cuerpo = $('tabla-productos');
    if (!cuerpo) return;
    cuerpo.replaceChildren();
    const busqueda = String($('buscar')?.value || '').trim().toLocaleLowerCase('es');
    const filtrados = registros.filter(p => [p.codigo,p.nombre,p.categoria,p.sucursal_nombre]
      .some(campo => String(campo || '').toLocaleLowerCase('es').includes(busqueda)));
    for (const producto of filtrados) {
      const fila = document.createElement('tr');
      crearCelda(fila, producto.codigo);
      crearCelda(fila, producto.nombre);
      crearCelda(fila, producto.categoria);
      crearCelda(fila, dinero(producto.precio));
      crearCelda(fila, producto.sucursal_nombre);
      crearCelda(fila, producto.stock);
      const estado = crearCelda(fila, producto.stock === 0 ? 'Agotado' :
        (producto.stock <= producto.stock_minimo ? 'Stock bajo' : 'Disponible'));
      estado.className = producto.stock <= producto.stock_minimo ? 'estado-bajo' : 'estado-normal';
      if (vistaAdmin) {
        const td = document.createElement('td');
        const editar = document.createElement('button');
        editar.type='button'; editar.className='accion editar'; editar.textContent='Editar ficha';
        editar.addEventListener('click', () => editarProducto(producto));
        td.append(editar);
        const minimo = document.createElement('button');
        minimo.type='button'; minimo.className='accion editar'; minimo.textContent='Stock mínimo';
        minimo.addEventListener('click', async () => {
          const entrada = prompt(`Stock mínimo de ${producto.nombre} en ${producto.sucursal_nombre}:`, String(producto.stock_minimo));
          if (entrada === null) return;
          const valor = Number(entrada);
          if (!entrada.trim() || !Number.isSafeInteger(valor) || valor < 0) {
            informar('El stock mínimo debe ser un entero mayor o igual que cero.', true);
            return;
          }
          minimo.disabled = true;
          try {
            const {error} = await supabase.rpc('configurar_stock_minimo', {
              p_sucursal_id:producto.sucursal_id,
              p_producto_id:producto.id,
              p_stock_minimo:valor
            });
            if (error) throw error;
            await cargarDatos();
            informar('Stock mínimo actualizado.');
          } catch(error) { informar('No se pudo actualizar: ' + error.message, true); }
          finally { minimo.disabled = false; }
        });
        td.append(minimo);
        fila.append(td);
      }
      cuerpo.append(fila);
    }
    if (!filtrados.length) {
      const fila = document.createElement('tr');
      const td = crearCelda(fila, 'No hay productos con existencias registradas en la sucursal seleccionada.');
      td.colSpan = vistaAdmin ? 8 : 7;
      cuerpo.append(fila);
    }
  }

  function actualizarIndicadores() {
    if ($('total-productos')) $('total-productos').textContent = String(new Set(registros.map(p => p.id)).size);
    if ($('total-unidades')) $('total-unidades').textContent = String(registros.reduce((s,p) => s + p.stock, 0));
    if ($('stock-bajo')) $('stock-bajo').textContent = String(registros.filter(p => p.stock <= p.stock_minimo).length);
    document.dispatchEvent(new CustomEvent('sgi:inventario-actualizado', { detail:{registros} }));
  }
  function cargarSelects() {
    const selectCategoria = $('categoria');
    if (selectCategoria) {
      const anterior = selectCategoria.value;
      selectCategoria.replaceChildren();
      opcion(selectCategoria,'','Seleccionar categoría');
      for (const c of categorias.filter(c => c.activo)) opcion(selectCategoria,c.id,c.nombre);
      if ([...selectCategoria.options].some(o=>o.value===anterior)) selectCategoria.value=anterior;
    }
    const selectMovimiento = $('movimiento-producto');
    if (selectMovimiento) {
      const anterior = selectMovimiento.value;
      selectMovimiento.replaceChildren();
      opcion(selectMovimiento,'','Seleccionar producto del catálogo');
      for (const p of catalogo.filter(p=>p.activo)) opcion(selectMovimiento,p.id,`${p.codigo} · ${p.nombre}`);
      if ([...selectMovimiento.options].some(o=>o.value===anterior)) selectMovimiento.value=anterior;
    }
  }

  async function cargarMovimientos() {
    const cuerpo = $('tabla-movimientos');
    if (!cuerpo) return;
    cuerpo.replaceChildren();
    const ids = sedesPermitidas().map(s=>Number(s.id));
    if (!ids.length) return;
    let consulta = supabase.from('movimientos_inventario')
      .select('id,sucursal_id,producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,creado_en')
      .order('creado_en',{ascending:false}).limit(40);
    if (sucursalSeleccionada === 'todas') consulta = consulta.in('sucursal_id',ids);
    else consulta = consulta.eq('sucursal_id',sedeActiva());
    const {data,error} = await consulta;
    if (error) throw error;
    const nombreProducto = new Map(catalogo.map(p=>[Number(p.id),p.nombre]));
    const nombreSede = new Map(sedesPermitidas().map(s=>[Number(s.id),s.nombre]));
    for (const movimiento of data || []) {
      const fila=document.createElement('tr');
      crearCelda(fila,new Date(movimiento.creado_en).toLocaleString('es-PE'));
      crearCelda(fila,nombreSede.get(Number(movimiento.sucursal_id))||'—');
      crearCelda(fila,nombreProducto.get(Number(movimiento.producto_id))||'Producto archivado');
      crearCelda(fila,movimiento.tipo === 'entrada' ? 'Entrada' : 'Salida');
      crearCelda(fila,movimiento.cantidad);
      crearCelda(fila,`${movimiento.stock_anterior} → ${movimiento.stock_nuevo}`);
      crearCelda(fila,movimiento.motivo||'—');
      cuerpo.append(fila);
    }
    if (!data?.length) {
      const fila=document.createElement('tr');
      const td=crearCelda(fila,'No se han registrado movimientos todavía.');td.colSpan=7;cuerpo.append(fila);
    }
  }

  async function cargarDatos() {
    try {
      const ids = sedesPermitidas().map(s => Number(s.id));
      // Catálogo global; existencias separadas en inventarios (NO en productos).
      const [datosCatalogo,datosCategorias,datosInventario] = await Promise.all([
        todosDe('productos','id,codigo,nombre,categoria_id,precio,activo'),
        todosDe('categorias','id,nombre,activo'),
        ids.length ? todosDe('inventarios','id,producto_id,sucursal_id,stock,stock_minimo') : Promise.resolve([])
      ]);
      catalogo = datosCatalogo;
      categorias = datosCategorias;
      inventarios = datosInventario;
      const porProducto = new Map(catalogo.map(p=>[Number(p.id),p]));
      const porCategoria = new Map(categorias.map(c=>[Number(c.id),c.nombre]));
      const porSede = new Map(sedesPermitidas().map(s=>[Number(s.id),s.nombre]));
      registros = inventarios.filter(i => ids.includes(Number(i.sucursal_id)) &&
        (sucursalSeleccionada==='todas'||Number(i.sucursal_id)===Number(sucursalSeleccionada)))
        .map(i => {
          const p = porProducto.get(Number(i.producto_id));
          if (!p || !p.activo) return null;
          return {...p,categoria:porCategoria.get(Number(p.categoria_id))||'Sin categoría',
            inventario_id:i.id,sucursal_id:Number(i.sucursal_id),
            sucursal_nombre:porSede.get(Number(i.sucursal_id))||'Sucursal',
            stock:Number(i.stock),stock_minimo:Number(i.stock_minimo)};
        }).filter(Boolean);
      cargarSelects();
      mostrarProductos();
      actualizarIndicadores();
      await cargarMovimientos();
    } catch(error) {
      informar('Error al consultar Supabase: '+error.message,true, vistaAdmin?'mensaje-producto':'mensaje-movimiento');
      console.error('Error SGI:',error);
    }
  }

  async function administrarSedes() {
    const seccion = $('administracion-sucursales');
    if (!seccion || !contexto.esGeneral) return;
    const [{data:sedes,error:errorSedes},{data:usuarios,error:errorUsuarios}] = await Promise.all([
      supabase.from('sucursales').select('id,codigo,nombre,direccion,activo').order('id'),
      supabase.from('usuarios').select('id,nombre,rol,sucursal_id,activo').order('nombre')
    ]);
    if (errorSedes||errorUsuarios) {
      informar('No se pudieron consultar los usuarios/sucursales: '+(errorSedes||errorUsuarios).message,true,'mensaje-sucursales');
      return;
    }
    const tablaSedes=$('tabla-sucursales'),tablaAsignaciones=$('tabla-asignaciones');
    const selectUsuarios=$('asignacion-usuario'),selectSedes=$('asignacion-sucursal');
    tablaSedes.replaceChildren();tablaAsignaciones.replaceChildren();
    selectUsuarios.replaceChildren();selectSedes.replaceChildren();
    for (const sede of sedes||[]) {
      if (sede.activo) opcion(selectSedes,sede.id,sede.nombre);
      const fila=document.createElement('tr');
      crearCelda(fila,sede.codigo);crearCelda(fila,sede.nombre);
      crearCelda(fila,sede.direccion||'—');crearCelda(fila,sede.activo?'Activa':'Inactiva');
      tablaSedes.append(fila);
    }
    for (const usuario of (usuarios||[]).filter(u => u.rol==='empleado')) {
      if (usuario.activo) opcion(selectUsuarios,usuario.id,usuario.nombre);
      const fila=document.createElement('tr');
      crearCelda(fila,usuario.nombre);
      crearCelda(fila,(sedes||[]).find(s=>Number(s.id)===Number(usuario.sucursal_id))?.nombre||'Sin sucursal');
      crearCelda(fila,'Empleado');
      crearCelda(fila,usuario.activo?'Activo':'Inactivo');
      tablaAsignaciones.append(fila);
    }
  }

  if ($('buscar')) $('buscar').addEventListener('input',mostrarProductos);
  if ($('cancelar-edicion')) $('cancelar-edicion').addEventListener('click',reiniciarFormulario);
  if ($('cerrar-sesion')) $('cerrar-sesion').addEventListener('click',async () => {
    try {await cerrarSesion();} catch(error) { informar(error.message,true,vistaAdmin?'mensaje-producto':'mensaje-movimiento'); }
  });
  selectorSucursal.addEventListener('change',async () => {
    sucursalSeleccionada = selectorSucursal.value;
    if ($('sucursal-actual')) $('sucursal-actual').textContent = sucursalSeleccionada==='todas'
      ? 'Vista consolidada' : sedesPermitidas().find(s=>String(s.id)===sucursalSeleccionada)?.nombre||'';
    reiniciarFormulario();
    await cargarDatos();
  });

  if (formulario) formulario.addEventListener('submit',async evento => {
    evento.preventDefault();
    if (!contexto.esGeneral) return;
    const datos = {
      codigo:$('codigo').value.trim().toUpperCase(),
      nombre:$('nombre').value.trim(),
      categoria_id:Number($('categoria').value),
      precio:Number($('precio').value)
    };
    if (!datos.codigo || !datos.nombre || !Number.isSafeInteger(datos.categoria_id) || datos.categoria_id<=0 ||
        !Number.isFinite(datos.precio) || datos.precio<0) {
      informar('Completa todos los datos del producto.',true);return;
    }
    const boton=formulario.querySelector('button[type=submit]');boton.disabled=true;
    try {
      if (editandoId !== null) {
        const {error} = await supabase.from('productos').update(datos).eq('id',editandoId);
        if (error) throw error;
        informar('Ficha de producto modificada.');
      } else {
        const sucursal = sedeActiva();
        if (!sucursal) throw new Error('Selecciona una sucursal concreta (no la vista consolidada).');
        const inicial=Number($('stock').value), minimo=Number($('stock-minimo').value);
        if (![inicial,minimo].every(v=>Number.isSafeInteger(v)&&v>=0))
          throw new Error('El stock inicial y mínimo deben ser enteros no negativos.');
        // Función transaccional de sql/03_compatibilidad_web.sql: catálogo + stock + historial.
        const {error} = await supabase.rpc('crear_producto_con_stock',{
          p_codigo:datos.codigo,p_nombre:datos.nombre,p_categoria_id:datos.categoria_id,
          p_precio:datos.precio,p_sucursal_id:sucursal,p_stock_inicial:inicial,p_stock_minimo:minimo
        });
        if (error) throw error;
      }
      reiniciarFormulario();
      await cargarDatos();
      informar('Producto guardado correctamente.');
    } catch(error) { informar('No se pudo guardar: '+error.message,true); }
    finally { boton.disabled=false; }
  });

  if (formularioMovimiento) formularioMovimiento.addEventListener('submit',async evento => {
    evento.preventDefault();
    const sucursal = sedeActiva();
    const producto = Number($('movimiento-producto').value);
    const tipo=$('movimiento-tipo').value;
    const cantidad=Number($('movimiento-cantidad').value);
    if (!sucursal) {informar('Selecciona una sucursal concreta.',true,'mensaje-movimiento');return;}
    if (!Number.isSafeInteger(producto)||producto<1||!Number.isSafeInteger(cantidad)||cantidad<1)
      {informar('Elige un producto y una cantidad entera positiva.',true,'mensaje-movimiento');return;}
    const boton=formularioMovimiento.querySelector('button[type=submit]');boton.disabled=true;
    try {
      const {data,error} = await supabase.rpc('registrar_movimiento',{
        p_sucursal_id:sucursal,p_producto_id:producto,p_tipo:tipo,
        p_cantidad:cantidad,p_motivo:$('movimiento-motivo').value.trim()||null
      });
      if (error) throw error;
      formularioMovimiento.reset();
      await cargarDatos();
      informar(`Movimiento registrado correctamente (N.º ${data}).` ,false,'mensaje-movimiento');
    } catch(error) {informar('No se pudo registrar el movimiento: '+error.message,true,'mensaje-movimiento');}
    finally {boton.disabled=false;}
  });

  if ($('formulario-sucursal')) $('formulario-sucursal').addEventListener('submit',async evento => {
    evento.preventDefault();if(!contexto.esGeneral)return;
    const codigo=$('sucursal-codigo').value.trim().toUpperCase();
    const nombre=$('sucursal-nombre').value.trim();
    const direccion=$('sucursal-direccion').value.trim();
    if(!codigo||!nombre)return;
    const {error}=await supabase.from('sucursales').insert({codigo,nombre,direccion});
    if(error) informar(error.message,true,'mensaje-sucursales');
    else {
      $('formulario-sucursal').reset();
      informar('Sucursal registrada.',false,'mensaje-sucursales');
      contexto=await obtenerContexto(); seleccionarSucursal(sucursalSeleccionada);
      await administrarSedes();await cargarDatos();
    }
  });
  if ($('formulario-asignacion')) $('formulario-asignacion').addEventListener('submit',async evento => {
    evento.preventDefault();if(!contexto.esGeneral)return;
    const usuarioId=$('asignacion-usuario').value;
    const sede=Number($('asignacion-sucursal').value);
    if(!usuarioId||!Number.isSafeInteger(sede)||sede<1)return;
    const {error}=await supabase.from('usuarios').update({sucursal_id:sede})
      .eq('id',usuarioId).eq('rol','empleado');
    if(error) informar(error.message,true,'mensaje-sucursales');
    else {informar('Sucursal del empleado actualizada.',false,'mensaje-sucursales');await administrarSedes();}
  });

  try {
    contexto=await obtenerContexto();
    if (vistaAdmin!==contexto.esGeneral) {
      location.replace(contexto.esGeneral?'administrador.html':'empleado.html');return;
    }
    if ($('nombre-usuario')) $('nombre-usuario').textContent='Bienvenido, '+contexto.perfil.nombre;
    if ($('admin-sidebar-rol')) $('admin-sidebar-rol').textContent='Administrador general';
    if ($('admin-sidebar-descripcion')) $('admin-sidebar-descripcion').textContent='Control de sucursales';
    if ($('tipo-admin')) $('tipo-admin').textContent='Administrador general';
    if ($('administracion-sucursales')) $('administracion-sucursales').hidden=!contexto.esGeneral;
    seleccionarSucursal();
    await cargarDatos();
    if (vistaAdmin) await administrarSedes();
  } catch(error) {
    informar('No fue posible iniciar el panel: '+error.message,true, vistaAdmin?'mensaje-producto':'mensaje-movimiento');
    console.error(error);
    if (/sesión no está activa/i.test(error.message)) location.replace('index.html');
  }
}
