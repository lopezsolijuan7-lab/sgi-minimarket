
import { supabase } from "./config.js";

// ==========================================
// SGI MINIMARKET - PANEL ADMINISTRATIVO
// ==========================================

const elemento = (id) => document.getElementById(id);

const soles = (valor) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN"
  }).format(valor);

const colores = [
  "#1688f0",
  "#10b981",
  "#fbbf24",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#64748b"
];

// ==========================================
// MENSAJES DEL PANEL
// ==========================================

function crearMensaje(contenedor, mensaje) {
  if (!contenedor) return;

  contenedor.replaceChildren();

  const aviso = document.createElement("div");
  aviso.className = "empty-chart";
  aviso.textContent = mensaje;

  contenedor.appendChild(aviso);
}

// ==========================================
// GRÁFICO DE BARRAS
// Preparado para productos más vendidos
// ==========================================

function dibujarBarras(contenedor, datos) {
  if (!contenedor) return;

  contenedor.replaceChildren();

  if (!datos.length) {
    crearMensaje(
      contenedor,
      "Todavía no hay ventas registradas."
    );
    return;
  }

  const maximo = Math.max(
    ...datos.map(item => item.cantidad),
    1
  );

  datos.slice(0, 5).forEach((item, indice) => {
    const fila = document.createElement("div");
    fila.className = "chart-row";

    const nombre = document.createElement("span");
    nombre.className = "chart-name";
    nombre.textContent = item.nombre;
    nombre.title = item.nombre;

    const pista = document.createElement("div");
    pista.className = "chart-track";

    const barra = document.createElement("div");
    barra.className = "chart-fill";

    barra.style.width =
      `${(item.cantidad / maximo) * 100}%`;

    barra.style.backgroundColor =
      colores[indice % colores.length];

    const cantidad = document.createElement("strong");
    cantidad.className = "chart-value";

    cantidad.textContent =
      item.cantidad.toLocaleString("es-PE");

    pista.appendChild(barra);
    fila.append(nombre, pista, cantidad);
    contenedor.appendChild(fila);
  });
}

// ==========================================
// GRÁFICO CIRCULAR DE CATEGORÍAS
// ==========================================

function mostrarCategorias(productos) {
  const agrupados = new Map();

  productos.forEach(producto => {
    const categoria =
      producto.categoria || "Sin categoría";

    const anterior = agrupados.get(categoria) || {
      nombre: categoria,
      cantidad: 0,
      productos: 0
    };

    anterior.cantidad += Number(producto.stock) || 0;
    anterior.productos += 1;

    agrupados.set(categoria, anterior);
  });

  const datos = [...agrupados.values()]
    .sort((a, b) => b.cantidad - a.cantidad);

  const total = datos.reduce(
    (suma, item) => suma + item.cantidad,
    0
  );

  const dona = elemento("grafico-dona");
  const donaTotal = elemento("dona-total");
  const leyenda = elemento("leyenda-categorias");
  const resumen = elemento("resumen-categorias");

  if (!dona || !donaTotal || !leyenda || !resumen) {
    console.error(
      "Faltan elementos del gráfico circular en administrador.html"
    );
    return;
  }

  donaTotal.textContent =
    total.toLocaleString("es-PE");

  leyenda.replaceChildren();
  resumen.replaceChildren();

  let posicion = 0;
  const segmentos = [];

  datos.forEach((item, indice) => {
    const porcentaje = total > 0
      ? (item.cantidad / total) * 100
      : 0;

    const color = colores[indice % colores.length];

    if (porcentaje > 0) {
      segmentos.push(
        `${color} ${posicion}% ${posicion + porcentaje}%`
      );
    }

    posicion += porcentaje;

    // LEYENDA DEL GRÁFICO

    const fila = document.createElement("div");
    fila.className = "legend-item";

    const etiqueta = document.createElement("span");
    etiqueta.className = "legend-label";

    const indicador = document.createElement("span");
    indicador.className = "legend-color";
    indicador.style.backgroundColor = color;

    const nombre = document.createElement("span");
    nombre.textContent = item.nombre;

    etiqueta.append(indicador, nombre);

    const valor = document.createElement("strong");
    valor.textContent = `${porcentaje.toFixed(1)}%`;

    fila.append(etiqueta, valor);
    leyenda.appendChild(fila);

    // TARJETA DEL RESUMEN

    const tarjeta = document.createElement("div");
    tarjeta.className = "category-tile";

    const titulo = document.createElement("strong");
    titulo.textContent = item.nombre;

    const descripcion = document.createElement("span");
    descripcion.textContent =
      `${item.productos} productos · ${item.cantidad} unidades`;

    tarjeta.append(titulo, descripcion);
    resumen.appendChild(tarjeta);
  });

  // PINTAR EL GRÁFICO CIRCULAR

  dona.style.background = segmentos.length
    ? `conic-gradient(${segmentos.join(", ")})`
    : "#e7edf3";

  if (datos.length === 0) {
    leyenda.textContent =
      "No hay categorías registradas.";

    resumen.textContent =
      "No hay productos registrados.";
  }
}

// ==========================================
// ALERTAS DE STOCK Y REPOSICIÓN
// ==========================================

function mostrarAlertas(productos) {
  const bajos = productos.filter(producto =>
    Number(producto.stock) <=
    Number(producto.stock_minimo)
  );

  const contador = elemento("contador-alertas");
  const lista = elemento("lista-alertas");

  if (!contador || !lista) return;

  contador.textContent =
    `${bajos.length} ${bajos.length === 1 ? "alerta" : "alertas"}`;

  lista.replaceChildren();

  if (bajos.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.className = "alert-ok";

    mensaje.textContent =
      "✓ Todos los productos tienen existencias suficientes.";

    lista.appendChild(mensaje);
    return;
  }

  bajos.sort(
    (a, b) => Number(a.stock) - Number(b.stock)
  );

  bajos.forEach(producto => {
    const fila = document.createElement("div");
    fila.className = "alert-item";

    const nombre = document.createElement("span");
    nombre.textContent =
      `${producto.codigo} · ${producto.nombre}`;

    const estado = document.createElement("strong");

    const stock = Number(producto.stock);
    const minimo = Number(producto.stock_minimo);

    if (stock === 0) {
      estado.textContent = "AGOTADO - Reposición urgente";
      estado.style.color = "#dc2626";
    } else {
      estado.textContent =
        `STOCK BAJO - ${stock} disponibles / mínimo ${minimo}`;

      estado.style.color = "#d97706";
    }

    fila.append(nombre, estado);
    lista.appendChild(fila);
  });
}

// ==========================================
// ESTADÍSTICAS REALES DE SUPABASE
// ==========================================

async function actualizarPanel() {
  const { data: productos, error } = await supabase
    .from("productos")
    .select(
      "codigo,nombre,categoria,precio,stock,stock_minimo"
    );

  if (error) {
    console.error("Error al consultar productos:", error);

    crearMensaje(
      elemento("leyenda-categorias"),
      "No se pudo cargar el inventario: " + error.message
    );

    return;
  }

  const lista = productos || [];

  const valorTotal = lista.reduce(
    (total, producto) =>
      total +
      Number(producto.precio) *
      Number(producto.stock),
    0
  );

  const valorInventario = elemento("valor-inventario");

  if (valorInventario) {
    valorInventario.textContent = soles(valorTotal);
  }

  mostrarCategorias(lista);
  mostrarAlertas(lista);
}

// ==========================================
// PRODUCTOS MÁS VENDIDOS
// Pendiente del módulo de ventas
// ==========================================

function mostrarVentasPendientes() {
  crearMensaje(
    elemento("grafico-vendidos"),
    "📊 El gráfico de productos más vendidos se activará " +
    "cuando implementemos el registro de ventas. " +
    "Las barras mostrarán cantidades reales vendidas."
  );
}

// ==========================================
// FECHA ACTUAL
// ==========================================

const fechaActual = elemento("fecha-actual");

if (fechaActual) {
  fechaActual.textContent =
    new Intl.DateTimeFormat("es-PE", {
      dateStyle: "long"
    }).format(new Date());
}

// ==========================================
// INICIAR PANEL
// ==========================================

mostrarVentasPendientes();
actualizarPanel();

// ==========================================
// ACTUALIZACIÓN DESPUÉS DE CAMBIOS
// ==========================================

const tabla = elemento("tabla-productos");

if (tabla) {
  let actualizacionPendiente = false;

  const observador = new MutationObserver(() => {
    if (actualizacionPendiente) return;

    actualizacionPendiente = true;

    Promise.resolve().then(async () => {
      try {
        await actualizarPanel();
      } catch (error) {
        console.error(
          "Error al actualizar el panel:",
          error
        );
      } finally {
        actualizacionPendiente = false;
      }
    });
  });

  observador.observe(tabla, {
    childList: true
  });
}
