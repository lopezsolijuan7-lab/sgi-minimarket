// Modulos comerciales SGI MINIMARKET - compatible con el modelo existente Supabase.
// Las operaciones que escriben datos usan RPC transaccionales SECURITY DEFINER.
// No insertar compras, recepciones, stock ni cajas directamente desde el navegador.
import { supabase } from './config.js';
import { obtenerContexto } from './sesiones.js';

const $ = id => document.getElementById(id);
const esAdmin = document.body.classList.contains('admin-body');
const moneda = n => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(n) || 0);
const fecha = s => s ? new Date(s).toLocaleString('es-PE') : '—';
function mensaje(id, valor, error = false) {
  const elemento = $(id);
  if (elemento) { elemento.textContent = valor; elemento.dataset.error = String(error); }
}
function celda(fila, valor) {
  const td = document.createElement('td');
  td.textContent = String(valor ?? '—');
  fila.append(td);
  return td;
}
function boton(texto, accion, secondary = false) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'sgi-action sgi-small' + (secondary ? ' sgi-secondary' : '');
  b.textContent = texto; b.addEventListener('click', accion);
  return b;
}
function opcion(select, valor, nombre) {
  const op = document.createElement('option');
  op.value = String(valor); op.textContent = String(nombre); select.append(op);
}
function vacio(tbody, columnas, texto) {
  const fila = document.createElement('tr'); const td = celda(fila, texto);
  td.colSpan = columnas; td.className = 'sgi-no-datos'; tbody.append(fila);
}
function entero(n) { return Number.isSafeInteger(Number(n)) && Number(n) >= 0; }

let contexto = null;
let sucursales = [];
let proveedores = [];
let catalogo = [];
let compras = [];
let detalles = [];
let entregas = [];
let detalleEntregas = [];
let carrito = [];
let compraSeleccionada = null;
let idOperacion = null;
let ocupado = false;

function sucursalActual() {
  if (!esAdmin) {
    const asignada = Number(contexto?.perfil?.sucursal_id);
    return Number.isSafeInteger(asignada) && asignada > 0 ? asignada : null;
  }
  const selector = $('selector-sucursal');
  const elegido = selector?.value || String(sucursales[0]?.id || '');
  if (esAdmin && elegido === 'todas') return null; // vista consolidada
  const id = Number(elegido);
  return sucursales.some(s => Number(s.id) === id) ? id : null;
}
function sucursalFiltro() {
  if (esAdmin && $('selector-sucursal')?.value === 'todas') return null;
  return sucursalActual();
}
function nombreSede(id) { return sucursales.find(s => Number(s.id) === Number(id))?.nombre || 'Sucursal'; }
function nombreProveedor(id) { return proveedores.find(p => Number(p.id) === Number(id))?.razon_social || `Proveedor ${id}`; }
function nombreProducto(id) { return catalogo.find(p => Number(p.id) === Number(id))?.nombre || `Producto ${id}`; }
function errorBD(error, archivo) {
  return `${error.message}. Si aún no aplicaste la migración, revisa sql/${archivo} en Supabase SQL Editor.`;
}

async function cargarCatalogo() {
  const [pr, pd] = await Promise.all([
    supabase.from('proveedores').select('id,ruc,razon_social,contacto,activo').order('razon_social').limit(500),
    supabase.from('productos').select('id,codigo,nombre,activo').order('nombre').limit(1000)
  ]);
  if (pr.error) throw pr.error;
  if (pd.error) throw pd.error;
  proveedores = pr.data || [];
  catalogo = pd.data || [];
  const selectProveedor = $('sgi-compra-proveedor');
  if (selectProveedor) {
    const antiguo = selectProveedor.value;
    selectProveedor.replaceChildren(); opcion(selectProveedor, '', 'Seleccionar proveedor');
    proveedores.filter(p => p.activo).forEach(p => opcion(selectProveedor, p.id, `${p.razon_social} · ${p.ruc || 'Sin RUC'}`));
    selectProveedor.value = antiguo;
  }
  const selectProducto = $('sgi-compra-producto');
  if (selectProducto) {
    const antiguo = selectProducto.value;
    selectProducto.replaceChildren(); opcion(selectProducto, '', 'Seleccionar producto');
    catalogo.filter(p => p.activo).forEach(p => opcion(selectProducto, p.id, `${p.codigo} · ${p.nombre}`));
    selectProducto.value = antiguo;
  }
  const tbody = $('sgi-prov-lista');
  if (tbody) {
    tbody.replaceChildren();
    for (const p of proveedores) {
      const tr = document.createElement('tr');
      celda(tr, p.ruc || '—'); celda(tr, p.razon_social); celda(tr, p.contacto || '—');
      celda(tr, p.activo ? 'Activo' : 'Inactivo'); tbody.append(tr);
    }
    if (!proveedores.length) vacio(tbody, 4, 'Aún no hay proveedores registrados.');
  }
}

function dibujarCarrito() {
  const tbody = $('sgi-compra-carrito');
  if (!tbody) return;
  tbody.replaceChildren();
  for (const item of carrito) {
    const tr = document.createElement('tr');
    celda(tr, nombreProducto(item.producto_id)); celda(tr, item.cantidad);
    celda(tr, moneda(item.costo_unitario)); celda(tr, moneda(item.cantidad * item.costo_unitario));
    const td = document.createElement('td');
    td.append(boton('Quitar', () => {
      carrito = carrito.filter(p => p.producto_id !== item.producto_id);
      dibujarCarrito();
    }, true)); tr.append(td); tbody.append(tr);
  }
  if (!carrito.length) vacio(tbody, 5, 'Agrega productos a la orden de compra.');
  $('sgi-compra-total').textContent = 'Total: ' + moneda(carrito.reduce((acc, item) => acc + item.cantidad * item.costo_unitario, 0));
}

function pendiente(detalle) {
  const recibido = detalleEntregas.filter(r => Number(r.detalle_compra_id) === Number(detalle.id))
    .reduce((n, r) => n + Number(r.cantidad_recibida) + Number(r.cantidad_danada), 0);
  return { recibido, pendiente: Math.max(0, Number(detalle.cantidad) - recibido) };
}
function estadoCompra(compra) {
  if (compra.estado === 'anulada') return 'Anulada';
  if (compra.estado === 'recibida') return 'Recibida';
  const items = detalles.filter(d => Number(d.compra_id) === Number(compra.id));
  return items.some(d => pendiente(d).recibido > 0) ? 'Recepción parcial' : entregas.some(r => Number(r.compra_id)===Number(compra.id)) ? 'Faltantes reportados' : 'Pendiente';
}

async function cargarCompras() {
  const tbody = $('sgi-compras-lista');
  if (!tbody) return;
  try {
    let consulta = supabase.from('compras')
      .select('id,proveedor_id,sucursal_id,fecha_compra,total,estado,observaciones')
      .order('fecha_compra', { ascending: false }).limit(100);
    const sucursal = sucursalFiltro();
    if (sucursal) consulta = consulta.eq('sucursal_id', sucursal);
    const { data, error } = await consulta;
    if (error) throw error;
    compras = data || [];
    detalles = []; entregas = []; detalleEntregas = [];
    if (compras.length) {
      const ids = compras.map(c => c.id);
      const [respDetalles, respRec] = await Promise.all([
        supabase.from('detalle_compras').select('id,compra_id,producto_id,cantidad,costo_unitario,subtotal')
          .in('compra_id', ids).limit(1000),
        supabase.from('recepciones_compra').select('id,compra_id,usuario_id,fecha_recepcion')
          .in('compra_id', ids).limit(1000)
      ]);
      if (respDetalles.error) throw respDetalles.error;
      if (respRec.error) throw respRec.error;
      detalles = respDetalles.data || [];
      entregas = respRec.data || [];
      if (entregas.length) {
        const rd = await supabase.from('detalle_recepciones')
          .select('recepcion_id,detalle_compra_id,cantidad_recibida,cantidad_danada,cantidad_faltante')
          .in('recepcion_id', entregas.map(r => r.id)).limit(2000);
        if (rd.error) throw rd.error;
        detalleEntregas = rd.data || [];
      }
    }
    dibujarCompras();
    mensaje('sgi-compra-estado', `${compras.length} órdenes consultadas. Solo se muestran las 100 más recientes.`);
    // Si se recargó la lista tras confirmar una recepción, cerrar el formulario.
    if (compraSeleccionada && !compras.some(c => c.id === compraSeleccionada.id)) cancelarRecepcion();
  } catch (error) {
    tbody.replaceChildren(); vacio(tbody, esAdmin ? 8 : 6, 'No se pudieron consultar las compras.');
    mensaje('sgi-compra-estado', errorBD(error, '04_compras_recepciones.sql'), true);
  }
}
function dibujarCompras() {
  const tbody = $('sgi-compras-lista');
  if (!tbody) return;
  tbody.replaceChildren();
  for (const compra of compras) {
    const tr = document.createElement('tr');
    celda(tr, `#${compra.id}`);
    if (esAdmin) celda(tr, nombreSede(compra.sucursal_id));
    celda(tr, nombreProveedor(compra.proveedor_id));
    celda(tr, fecha(compra.fecha_compra));
    if (esAdmin) celda(tr, moneda(compra.total));
    const compraDetalleIds = new Set(detalles.filter(d => Number(d.compra_id) === Number(compra.id)).map(d => Number(d.id)));
    const faltantes = detalleEntregas.filter(r => compraDetalleIds.has(Number(r.detalle_compra_id)))
      .reduce((s, r) => s + Number(r.cantidad_faltante || 0), 0);
    celda(tr, faltantes);
    celda(tr, estadoCompra(compra));
    const td = document.createElement('td');
    if (compra.estado === 'pendiente' && detalles.some(d => d.compra_id === compra.id && pendiente(d).pendiente > 0)) {
      td.append(boton('Ver / recibir', () => abrirRecepcion(compra)));
    } else td.textContent = compra.estado === 'pendiente' ? 'Sin saldo o detalle' : 'Cerrada';
    tr.append(td); tbody.append(tr);
  }
  if (!compras.length) vacio(tbody, esAdmin ? 8 : 6, 'No hay compras pendientes para tu zona de trabajo.');
}
function cancelarRecepcion() {
  compraSeleccionada = null; idOperacion = null;
  const panel = $('sgi-panel-recepcion'); if (panel) panel.hidden = true;
  mensaje('sgi-recepcion-estado', '');
}
function abrirRecepcion(compra) {
  compraSeleccionada = compra;
  idOperacion = crypto.randomUUID();
  $('sgi-panel-recepcion').hidden = false;
  $('sgi-recepcion-titulo').textContent = `Confirmar entrega de orden #${compra.id}`;
  const tbody = $('sgi-recepcion-detalles'); tbody.replaceChildren();
  for (const det of detalles.filter(d => d.compra_id === compra.id)) {
    const resta = pendiente(det);
    if (!resta.pendiente) continue;
    const tr = document.createElement('tr'); tr.dataset.detalle = String(det.id); tr.dataset.restante = String(resta.pendiente);
    celda(tr, nombreProducto(det.producto_id)); celda(tr, moneda(det.costo_unitario)); celda(tr, det.cantidad); celda(tr, resta.recibido); celda(tr, resta.pendiente);
    for (const tipo of ['bueno','danado','faltante']) {
      const td = document.createElement('td'); const inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.max = String(resta.pendiente); inp.step = '1'; inp.value = '0';
      inp.required = true; inp.dataset.cantidad = tipo;
      inp.setAttribute('aria-label', `${tipo === 'bueno' ? 'Unidades buenas' : tipo === 'danado' ? 'Unidades dañadas' : 'Unidades faltantes'} de ${nombreProducto(det.producto_id)}`);
      td.append(inp); tr.append(td);
    }
    tbody.append(tr);
  }
  $('sgi-recepcion-notas').value = '';
  mensaje('sgi-recepcion-estado', 'Marca lo recibido, lo dañado y lo faltante antes de confirmar.');
  $('sgi-panel-recepcion').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function enviarRecepcion(evento) {
  evento.preventDefault();
  if (ocupado || !compraSeleccionada) return;
  const items = [];
  for (const tr of $('sgi-recepcion-detalles').querySelectorAll('tr[data-detalle]')) {
    const buenas = Number(tr.querySelector('[data-cantidad="bueno"]').value);
    const danadas = Number(tr.querySelector('[data-cantidad="danado"]').value);
    const faltantes = Number(tr.querySelector('[data-cantidad="faltante"]').value);
    const restante = Number(tr.dataset.restante);
    if (![buenas, danadas, faltantes].every(v => entero(v) && v <= restante) || buenas + danadas + faltantes > restante) {
      mensaje('sgi-recepcion-estado', 'Las cantidades deben ser enteros y no superar las unidades pendientes.', true);
      return;
    }
    if (buenas + danadas + faltantes > 0) items.push({ detalle_compra_id: Number(tr.dataset.detalle), cantidad_recibida: buenas, cantidad_danada: danadas, cantidad_faltante: faltantes });
  }
  if (!items.length) {
    mensaje('sgi-recepcion-estado', 'Indica al menos una unidad recibida, dañada o faltante.', true);
    return;
  }
  const form = $('sgi-form-recepcion'); const submit = form.querySelector('[type="submit"]');
  ocupado = true; submit.disabled = true;
  try {
    const { data, error } = await supabase.rpc('sgi_confirmar_recepcion', {
      p_compra_id: compraSeleccionada.id, p_operacion_id: idOperacion,
      p_items: items, p_observaciones: $('sgi-recepcion-notas').value.trim()
    });
    if (error) throw error;
    cancelarRecepcion();
    await cargarCompras();
    document.dispatchEvent(new CustomEvent('sgi:solicitar-actualizacion'));
    mensaje('sgi-compra-estado', `Reporte #${data} registrado. Solo las unidades buenas sumaron al stock; los faltantes siguen pendientes.`);
  } catch (error) {
    // Se reutiliza el UUID de la operación para reintentos tras fallos de red.
    mensaje('sgi-recepcion-estado', 'No fue posible confirmar: ' + error.message, true);
  } finally { ocupado = false; submit.disabled = false; }
}

async function enviarCompra(evento) {
  evento.preventDefault();
  if (!esAdmin || ocupado) return;
  const sede = sucursalActual();
  const proveedor = Number($('sgi-compra-proveedor').value);
  if (!sede) { mensaje('sgi-compra-estado', 'Selecciona una sucursal concreta, no "Todas".', true); return; }
  if (!proveedores.some(p => p.id === proveedor && p.activo)) { mensaje('sgi-compra-estado', 'Selecciona un proveedor activo.', true); return; }
  if (!carrito.length) { mensaje('sgi-compra-estado', 'Agrega productos antes de registrar una orden.', true); return; }
  const botonSubmit = $('sgi-form-compra').querySelector('[type="submit"]');
  ocupado = true; botonSubmit.disabled = true;
  try {
    const { data, error } = await supabase.rpc('sgi_crear_compra', {
      p_proveedor_id: proveedor, p_sucursal_id: sede,
      p_observaciones: $('sgi-compra-notas').value.trim(), p_items: carrito
    });
    if (error) throw error;
    carrito = []; dibujarCarrito(); $('sgi-form-compra').reset();
    await cargarCompras();
    mensaje('sgi-compra-estado', `Orden #${data} registrada. Pendiente de recibir mercadería.`);
  } catch (error) { mensaje('sgi-compra-estado', 'No se guardó la orden: ' + error.message, true); }
  finally { ocupado = false; botonSubmit.disabled = false; }
}

async function enviarProveedor(evento) {
  evento.preventDefault();
  if (!esAdmin) return;
  const submit = $('sgi-form-proveedor').querySelector('[type="submit"]'); submit.disabled = true;
  try {
    const args = {
      p_ruc: $('sgi-prov-ruc').value.trim(), p_razon_social: $('sgi-prov-razon').value.trim(),
      p_contacto: $('sgi-prov-contacto').value.trim(), p_telefono: $('sgi-prov-telefono').value.trim(),
      p_correo: $('sgi-prov-correo').value.trim(), p_direccion: $('sgi-prov-direccion').value.trim()
    };
    const { data, error } = await supabase.rpc('sgi_registrar_proveedor', args);
    if (error) throw error;
    $('sgi-form-proveedor').reset();
    await cargarCatalogo();
    mensaje('sgi-prov-estado', `Proveedor #${data} registrado.`);
  } catch (error) { mensaje('sgi-prov-estado', error.message, true); }
  finally { submit.disabled = false; }
}

async function cargarCajas() {
  const tb = $('sgi-cajas-lista'), tt = $('sgi-turnos-lista');
  if (!tb || !tt) return;
  try {
    let p = supabase.from('puntos_caja').select('id,sucursal_id,codigo,nombre,activo').order('sucursal_id').order('codigo').limit(200);
    let t = supabase.from('cajas').select('id,sucursal_id,punto_caja_id,fecha_apertura,monto_inicial,estado').order('fecha_apertura', { ascending: false }).limit(80);
    const sede = sucursalFiltro();
    if (sede) { p = p.eq('sucursal_id',sede); t = t.eq('sucursal_id',sede); }
    const [rP,rT] = await Promise.all([p,t]);
    if (rP.error) throw rP.error;
    if (rT.error) throw rT.error;
    const puntos = rP.data || [], turnos = rT.data || [];
    const ids = new Map(puntos.map(c=>[Number(c.id),c.nombre]));
    tb.replaceChildren(); tt.replaceChildren();
    for (const item of puntos) {
      const tr = document.createElement('tr');
      celda(tr,nombreSede(item.sucursal_id));celda(tr,item.codigo);celda(tr,item.nombre);celda(tr,item.activo?'Sí':'No');tb.append(tr);
    }
    if (!puntos.length) vacio(tb,4,'No hay cajas configuradas para la sucursal.');
    for (const turno of turnos) {
      const tr = document.createElement('tr');
      celda(tr,`#${turno.id}`);celda(tr,fecha(turno.fecha_apertura));celda(tr,nombreSede(turno.sucursal_id));
      celda(tr,ids.get(Number(turno.punto_caja_id)) || `Punto #${turno.punto_caja_id}`);
      celda(tr,moneda(turno.monto_inicial));celda(tr,turno.estado);tt.append(tr);
    }
    if (!turnos.length) vacio(tt,6,'No hay turnos registrados todavía.');
    mensaje('sgi-cajas-estado', `${puntos.length} cajas consultadas para el filtro actual.`);
  } catch(error) { tb.replaceChildren();tt.replaceChildren();
    vacio(tb,4,'No se pudieron consultar puntos de caja.');
    mensaje('sgi-cajas-estado',errorBD(error,'05_cajas_consultas.sql'),true); }
}
async function enviarCaja(evento) {
  evento.preventDefault();
  const sede = sucursalActual();
  if (!sede) { mensaje('sgi-cajas-estado','Selecciona una sucursal concreta.',true); return; }
  const submit = $('sgi-form-caja').querySelector('[type="submit"]');submit.disabled = true;
  try {
    const {data,error} = await supabase.rpc('sgi_crear_punto_caja', {
      p_sucursal_id:sede,p_codigo:$('sgi-caja-codigo').value.trim().toUpperCase(),
      p_nombre:$('sgi-caja-nombre').value.trim()
    });
    if (error) throw error;
    $('sgi-form-caja').reset();await cargarCajas();
    mensaje('sgi-cajas-estado',`Punto de caja #${data} creado en ${nombreSede(sede)}.`);
  } catch(error) { mensaje('sgi-cajas-estado', error.message,true); }
  finally {submit.disabled = false;}
}

async function cargarVentas() {
  const tb = $('sgi-ventas-lista');if (!tb) return;
  try {
    let query = supabase.from('ventas')
      .select('id,sucursal_id,fecha_venta,total,estado').order('fecha_venta',{ascending:false}).limit(70);
    const sede=sucursalFiltro();if(sede) query=query.eq('sucursal_id',sede);
    const {data,error}=await query;
    if (error) throw error;
    const ventas=data || [];
    let pagos=[],comprobantes=[],itemsVenta=[],formas=[],vouchers=[];
    if(ventas.length) {
      const ids=ventas.map(v=>v.id);
      const [p,c,d,met]=await Promise.all([
        supabase.from('pagos').select('id,venta_id,monto,estado,forma_pago_id').in('venta_id',ids).limit(500),
        supabase.from('comprobantes').select('venta_id,tipo,serie,numero,estado').in('venta_id',ids).limit(200),
        supabase.from('detalle_ventas').select('venta_id,producto_id,cantidad,precio_unitario,subtotal').in('venta_id',ids).limit(1000),
        supabase.from('formas_pago').select('id,nombre').order('id').limit(50)
      ]);
      for (const respuesta of [p,c,d,met]) if (respuesta.error) throw respuesta.error;
      pagos=p.data || [];comprobantes=c.data || [];itemsVenta=d.data || [];formas=met.data || [];
      if(pagos.length) {
        const vouchersResp=await supabase.from('vouchers').select('pago_id,numero_operacion')
          .in('pago_id',pagos.map(p=>p.id)).limit(500);
        if(vouchersResp.error) throw vouchersResp.error;
        vouchers=vouchersResp.data || [];
      }
    }
    tb.replaceChildren();
    for(const v of ventas) {
      const tr=document.createElement('tr');
      celda(tr,`#${v.id}`);celda(tr,fecha(v.fecha_venta));celda(tr,nombreSede(v.sucursal_id));
      celda(tr,moneda(v.total));celda(tr,v.estado);
      celda(tr,moneda(pagos.filter(p=>p.venta_id===v.id&&p.estado==='confirmado').reduce((s,p)=>s+Number(p.monto),0)));
      const co=comprobantes.find(c=>c.venta_id===v.id);
      celda(tr,co?`${co.tipo} ${co.serie||''}-${co.numero??''} (${co.estado})`:'Sin comprobante');
      const td=document.createElement('td');
      td.append(boton('Ver detalle', () => {
        $('sgi-panel-venta').hidden=false;
        $('sgi-venta-titulo').textContent=`Venta #${v.id} · ${nombreSede(v.sucursal_id)}`;
        const det=$('sgi-venta-detalles'), tp=$('sgi-venta-pagos');
        det.replaceChildren();tp.replaceChildren();
        const productos=itemsVenta.filter(x=>x.venta_id===v.id);
        for(const x of productos) {
          const r=document.createElement('tr');
          celda(r,nombreProducto(x.producto_id));celda(r,x.cantidad);
          celda(r,moneda(x.precio_unitario));celda(r,moneda(x.subtotal));det.append(r);
        }
        if(!productos.length) vacio(det,4,'Sin líneas de venta.');
        const pagosVenta=pagos.filter(x=>x.venta_id===v.id);
        for(const x of pagosVenta) {
          const r=document.createElement('tr');
          celda(r,formas.find(f=>f.id===x.forma_pago_id)?.nombre || `Método ${x.forma_pago_id}`);
          celda(r,moneda(x.monto));celda(r,x.estado);
          celda(r,vouchers.find(f=>f.pago_id===x.id)?.numero_operacion || '—');tp.append(r);
        }
        if(!pagosVenta.length) vacio(tp,4,'Sin pagos asociados.');
        $('sgi-venta-comprobante').textContent=co
          ? `Registro de ${co.tipo} serie ${co.serie||'—'} N.º ${co.numero??'—'} (${co.estado}). Verificar emisión SUNAT por separado.`
          : 'No hay comprobante asociado. Una venta registrada no equivale a comprobante SUNAT.';
        $('sgi-panel-venta').scrollIntoView({behavior:'smooth',block:'start'});
      }));
      tr.append(td);tb.append(tr);
    }
    if(!ventas.length) vacio(tb,8,'Aún no hay ventas registradas para esta sucursal.');
    mensaje('sgi-ventas-estado',`${ventas.length} ventas consultadas. Consulta limitada a las últimas 70.`);
  } catch(error) {tb.replaceChildren();vacio(tb,8,'No se pudieron consultar ventas y pagos.');
    mensaje('sgi-ventas-estado',errorBD(error,'05_cajas_consultas.sql'),true);}
}

async function inicializar() {
  try {
    contexto=await obtenerContexto();
    if(contexto.esGeneral!==esAdmin) return;
    sucursales=contexto.sucursales || [];
    if ($('sgi-agregar-producto')) $('sgi-agregar-producto').addEventListener('click',()=>{
      const id=Number($('sgi-compra-producto').value);
      const cantidad=Number($('sgi-compra-cantidad').value);
      const costo=Number($('sgi-compra-costo').value);
      if(!catalogo.some(p=>p.id===id&&p.activo)||!Number.isSafeInteger(cantidad)||cantidad<1||cantidad>1000000
        ||!Number.isFinite(costo)||costo<0||costo>99999999.99||Math.abs(Math.round(costo*100)-costo*100)>0.000001) {
        mensaje('sgi-compra-estado','Selecciona producto, cantidad entera y costo válido (máximo dos decimales).',true);return;
      }
      if(carrito.some(p=>p.producto_id===id)) {
        mensaje('sgi-compra-estado','Ese producto ya está en la orden. Quítalo para cambiar su cantidad.',true);return;
      }
      carrito.push({producto_id:id,cantidad,costo_unitario:costo});dibujarCarrito();
      mensaje('sgi-compra-estado','Producto agregado al pedido.');
    });
    if($('sgi-form-compra')) $('sgi-form-compra').addEventListener('submit',enviarCompra);
    if($('sgi-form-proveedor')) $('sgi-form-proveedor').addEventListener('submit',enviarProveedor);
    if($('sgi-form-caja')) $('sgi-form-caja').addEventListener('submit',enviarCaja);
    if($('sgi-form-recepcion')) $('sgi-form-recepcion').addEventListener('submit',enviarRecepcion);
    if($('sgi-recepcion-cancelar')) $('sgi-recepcion-cancelar').addEventListener('click',cancelarRecepcion);
    if($('sgi-venta-cerrar')) $('sgi-venta-cerrar').addEventListener('click',()=>{$('sgi-panel-venta').hidden=true;});
    if($('selector-sucursal')) $('selector-sucursal').addEventListener('change',async ()=>{
      cancelarRecepcion();await cargarCompras();
      if(esAdmin && location.hash==='#cajas') await cargarCajas();
      if(esAdmin && location.hash==='#ventas') await cargarVentas();
    });
    document.querySelectorAll('a[href="#cajas"]').forEach(a=>a.addEventListener('click',()=>{
      if(esAdmin) cargarCajas();
    }));
    document.querySelectorAll('a[href="#ventas"]').forEach(a=>a.addEventListener('click',()=>{
      if(esAdmin) cargarVentas();
    }));
    if(esAdmin) {
      try {await cargarCatalogo();} catch(error) {mensaje('sgi-prov-estado',error.message,true);}
      dibujarCarrito();
    } else {
      // Para mostrar el nombre del producto al recibir, basta el catálogo global.
      try {
        const [p,pr]=await Promise.all([
          supabase.from('productos').select('id,codigo,nombre,activo').order('nombre').limit(1000),
          supabase.from('proveedores').select('id,razon_social,activo').order('razon_social').limit(500)
        ]);
        if(p.error) throw p.error;if(pr.error) throw pr.error;
        catalogo=p.data||[]; proveedores=pr.data||[];
      } catch(error) {mensaje('sgi-compra-estado','No se cargó catálogo de recepción: '+error.message,true);}
    }
    await cargarCompras();
    if(esAdmin && location.hash==='#cajas') await cargarCajas();
    if(esAdmin && location.hash==='#ventas') await cargarVentas();
  } catch(error) {mensaje('sgi-compra-estado','No se pudo iniciar módulo comercial: '+error.message,true);}
}

inicializar();
