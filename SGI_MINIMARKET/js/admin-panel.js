// Estadísticas: se calculan sobre el inventario YA FILTRADO por sede y por RLS.
const $ = (id) => document.getElementById(id);
const dinero = (n) => new Intl.NumberFormat("es-PE", {style:"currency",currency:"PEN"}).format(n);
const colores=["#1688f0","#10b981","#fbbf24","#f43f5e","#8b5cf6","#06b6d4","#f97316"];

function mostrarEstadisticas(registros) {
  const valor = registros.reduce((s,p) => s + Number(p.precio)*Number(p.stock), 0);
  if ($("valor-inventario")) $("valor-inventario").textContent = dinero(valor);
  const agrupados = new Map();
  for(const p of registros) {
    const nombre=p.categoria||"Sin categoría";
    const categoria=agrupados.get(nombre)||{nombre,unidades:0,productos:new Set()};
    categoria.unidades+=Number(p.stock);
    categoria.productos.add(p.id);
    agrupados.set(nombre,categoria);
  }
  const lista=[...agrupados.values()].sort((a,b)=>b.unidades-a.unidades);
  const total=lista.reduce((s,i)=>s+i.unidades,0);
  if ($("dona-total")) $("dona-total").textContent=total.toLocaleString("es-PE");
  const dona=$("grafico-dona"), leyenda=$("leyenda-categorias"),resumen=$("resumen-categorias");
  if (leyenda) leyenda.replaceChildren();
  if (resumen) resumen.replaceChildren();
  let pos=0;
  const segmentos=[];
  lista.forEach((cat,indice)=>{
    const porcentaje=total ? cat.unidades/total*100 : 0;
    const color=colores[indice%colores.length];
    if(porcentaje>0) segmentos.push(`${color} ${pos}% ${pos+porcentaje}%`);
    pos+=porcentaje;
    if(leyenda) {
      const fila=document.createElement("div");fila.className="legend-item";
      const etiqueta=document.createElement("span");etiqueta.className="legend-label";
      const indicador=document.createElement("span");indicador.className="legend-color";
      indicador.style.backgroundColor=color;
      const nombre=document.createElement("span");nombre.textContent=cat.nombre;
      etiqueta.append(indicador,nombre);
      const valor=document.createElement("strong");valor.textContent=porcentaje.toFixed(1)+"%";
      fila.append(etiqueta,valor);leyenda.append(fila);
    }
    if(resumen){
      const item=document.createElement("div");item.className="category-tile";
      const titulo=document.createElement("strong");titulo.textContent=cat.nombre;
      const detalles=document.createElement("span");
      detalles.textContent=`${cat.productos.size} productos · ${cat.unidades} unidades`;
      item.append(titulo,detalles);resumen.append(item);
    }
  });
  if(dona)dona.style.background=segmentos.length?`conic-gradient(${segmentos.join(",")})`:"#e7edf3";
  if(!lista.length){if(leyenda)leyenda.textContent="No hay categorías con inventario.";
    if(resumen)resumen.textContent="No hay productos asignados a esta sucursal.";}

  const bajos=registros.filter(p=>p.stock<=p.stock_minimo);
  if ($("contador-alertas")) $("contador-alertas").textContent=
    `${bajos.length} ${bajos.length===1?"alerta":"alertas"}`;
  const alertas=$("lista-alertas");
  if(alertas) {
    alertas.replaceChildren();
    if(!bajos.length){const p=document.createElement("p");p.className="alert-ok";
      p.textContent="No hay existencias por debajo del mínimo.";alertas.append(p);}
    else for(const p of bajos){
      const fila=document.createElement("div");fila.className="alert-item";
      const nombre=document.createElement("span");
      nombre.textContent=`${p.sucursal_nombre} · ${p.codigo} · ${p.nombre}`;
      const detalle=document.createElement("strong");
      detalle.textContent=`${p.stock===0?"AGOTADO":"STOCK BAJO"} · ${p.stock} / mínimo ${p.stock_minimo}`;
      fila.append(nombre,detalle);alertas.append(fila);
    }
  }
}

const fecha=$("fecha-actual");
if(fecha) fecha.textContent=new Intl.DateTimeFormat("es-PE",{dateStyle:"long"}).format(new Date());
if($("grafico-vendidos")) $("grafico-vendidos").textContent=
  "El registro de ventas no forma parte de los Sprints 0–2. Gráfico pendiente.";
document.addEventListener("sgi:inventario-actualizado",e=>mostrarEstadisticas(e.detail.registros||[]));
