// Punto de venta de SGI MINIMARKET. El empleado no selecciona sucursal.
// El servidor obtiene la sucursal desde public.usuarios y valida el stock.
import { supabase } from './config.js';
import { obtenerContexto } from './sesiones.js';

const $ = id => document.getElementById(id);
const dinero = valor => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(valor) || 0);
const productoSelect = $('sgi-venta-producto');
const formulario = $('sgi-form-venta');
const carrito = [];
let productos = [];
let formas = [];
let sesion = null;
let operacionId = null;
let guardando = false;

function mensaje(texto, error = false) {
  const nodo = $('sgi-venta-estado');
  if (nodo) { nodo.textContent = texto; nodo.dataset.error = String(error); }
}
function crearCelda(tr, valor) {
  const td = document.createElement('td');
  td.textContent = String(valor ?? '—');
  tr.append(td);
  return td;
}
function opcion(select, valor, descripcion) {
  const opt = document.createElement('option');
  opt.value = String(valor); opt.textContent = descripcion;
  select.append(opt);
}
function producto(id) { return productos.find(p => Number(p.id) === Number(id)); }
function mostrarCarrito() {
  const cuerpo = $('sgi-venta-carrito');
  if (!cuerpo) return;
  cuerpo.replaceChildren();
  for (const item of carrito) {
    const p = producto(item.producto_id);
    if (!p) continue;
    const fila = document.createElement('tr');
    crearCelda(fila, p.nombre);
    crearCelda(fila, item.cantidad);
    crearCelda(fila, dinero(p.precio));
    crearCelda(fila, dinero(p.precio * item.cantidad));
    const td = document.createElement('td');
    const quitar = document.createElement('button');
    quitar.type = 'button'; quitar.className = 'sgi-action sgi-secondary sgi-small';
    quitar.textContent = 'Quitar';
    quitar.addEventListener('click', () => {
      carrito.splice(carrito.indexOf(item), 1);
      operacionId = null;
      mostrarCarrito();
    });
    td.append(quitar); fila.append(td); cuerpo.append(fila);
  }
  if (!carrito.length) {
    const fila = document.createElement('tr');
    const td = crearCelda(fila, 'Todavía no hay productos en la venta.');
    td.colSpan = 5; cuerpo.append(fila);
  }
  $('sgi-venta-total').textContent = 'Total: ' + dinero(carrito.reduce(
    (s, item) => s + Number(producto(item.producto_id)?.precio || 0) * item.cantidad, 0));
}
async function cargarProductos() {
  if (!sesion) return;
  const sede = Number(sesion.perfil.sucursal_id);
  if (!Number.isSafeInteger(sede) || sede <= 0) {
    throw new Error('El administrador todavía no te ha asignado un punto de trabajo.');
  }
  const [resProductos, resStock] = await Promise.all([
    supabase.from('productos').select('id,codigo,nombre,precio,activo').eq('activo',true).order('nombre').limit(1000),
    supabase.from('inventarios').select('producto_id,stock').eq('sucursal_id',sede).limit(1000)
  ]);
  if (resProductos.error) throw resProductos.error;
  if (resStock.error) throw resStock.error;
  const stock = new Map((resStock.data || []).map(r => [Number(r.producto_id), Number(r.stock)]));
  productos = (resProductos.data || []).map(p => ({ ...p, stock: stock.get(Number(p.id)) || 0 }));
  productoSelect.replaceChildren();
  opcion(productoSelect,'','Seleccionar producto disponible');
  for (const p of productos.filter(p => p.stock > 0)) {
    opcion(productoSelect,p.id,`${p.codigo} · ${p.nombre} · ${dinero(p.precio)} · Disponible: ${p.stock}`);
  }
  mostrarCarrito();
}
async function cargarFormas() {
  const {data,error} = await supabase.from('formas_pago')
    .select('id,nombre,activo').eq('activo',true).order('id');
  if (error) throw error;
  formas = data || [];
  const select = $('sgi-venta-forma');
  select.replaceChildren(); opcion(select,'','Seleccionar forma de pago');
  for (const f of formas) opcion(select,f.id,f.nombre);
}
async function cargarHistorial() {
  if (!sesion) return;
  const cuerpo = $('sgi-ventas-empleado-historial');
  const {data,error} = await supabase.from('ventas')
    .select('id,fecha_venta,total,estado')
    .eq('sucursal_id',sesion.perfil.sucursal_id)
    .order('fecha_venta',{ascending:false}).limit(25);
  if (error) {
    cuerpo.replaceChildren();
    const td = crearCelda(document.createElement('tr'),'No se pudo consultar el historial: '+error.message);
    td.colSpan=4; cuerpo.append(td.parentElement);return;
  }
  cuerpo.replaceChildren();
  for (const v of data || []) {
    const tr = document.createElement('tr');
    crearCelda(tr,'#'+v.id);
    crearCelda(tr,new Date(v.fecha_venta).toLocaleString('es-PE'));
    crearCelda(tr,dinero(v.total));crearCelda(tr,v.estado);
    cuerpo.append(tr);
  }
  if (!data?.length) {
    const tr=document.createElement('tr');const td=crearCelda(tr,'Todavía no hay ventas registradas.');
    td.colSpan=4;cuerpo.append(tr);
  }
}
function agregarProducto() {
  if (guardando) return;
  const id=Number(productoSelect.value),cantidad=Number($('sgi-venta-cantidad').value);
  const p=producto(id);
  if (!p || !Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 10000) {
    mensaje('Selecciona un producto y una cantidad entera válida.',true);return;
  }
  const anterior = carrito.find(item => item.producto_id === id);
  if ((anterior?.cantidad || 0) + cantidad > p.stock) {
    mensaje('La cantidad supera el stock disponible mostrado.',true);return;
  }
  if (anterior) anterior.cantidad += cantidad;
  else carrito.push({producto_id:id,cantidad});
  operacionId=null;
  mostrarCarrito();mensaje('Producto agregado. Confirma el pago antes de registrar la venta.');
}
async function confirmarVenta(evento) {
  evento.preventDefault();
  if (guardando) return;
  if (!carrito.length) {mensaje('Agrega productos al carrito.',true);return;}
  const idForma = Number($('sgi-venta-forma').value);
  const forma = formas.find(f => Number(f.id) === idForma);
  if (!forma) {mensaje('Selecciona una forma de pago válida.',true);return;}
  const nro = $('sgi-venta-operacion').value.trim();
  if (['yape','plin','transferencia bancaria'].includes(forma.nombre.toLowerCase()) && !nro) {
    mensaje('Escribe el número de operación del pago digital.',true);return;
  }
  const boton=formulario.querySelector('[type="submit"]');
  guardando=true;boton.disabled=true;
  if (!operacionId) operacionId = crypto.randomUUID();
  try {
    // No enviamos sucursal, precio ni total: la base de datos los determina.
    const {data,error}=await supabase.rpc('sgi_registrar_venta_empleado',{
      p_operacion_id:operacionId,
      p_items:carrito.map(item=>({...item})),
      p_forma_pago_id:idForma,
      p_numero_operacion:nro || null
    });
    if (error) throw error;
    carrito.splice(0,carrito.length);
    operacionId=null;
    formulario.reset();
    await Promise.allSettled([cargarProductos(), cargarHistorial()]);
    document.dispatchEvent(new CustomEvent('sgi:solicitar-actualizacion'));
    mensaje(`Venta #${data} registrada. Se descontó el stock de los productos vendidos.`);
  } catch(error) {
    mensaje('No fue posible registrar la venta: '+error.message,true);
    // El mismo UUID se reutiliza si hubo error de red después de registrarse.
  } finally {guardando=false;boton.disabled=false;}
}
async function iniciar() {
  if (!formulario || !productoSelect) return;
  formulario.addEventListener('submit',confirmarVenta);
  $('sgi-venta-agregar').addEventListener('click',agregarProducto);
  document.addEventListener('sgi:solicitar-actualizacion',()=>cargarProductos().catch(e=>mensaje(e.message,true)));
  try {
    sesion=await obtenerContexto();
    if (sesion.esGeneral) return;
    await Promise.all([cargarProductos(),cargarFormas(),cargarHistorial()]);
    mensaje('Listo para registrar ventas.');
  } catch(error) {
    mensaje('Error al cargar ventas: '+error.message+'. Verifica sql/06_ventas_empleado.sql y tus permisos.',true);
  }
}
iniciar();
