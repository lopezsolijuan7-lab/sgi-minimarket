
import { supabase } from "./config.js";

export async function iniciarInventario(rolEsperado) {
  const $ = (id) => document.getElementById(id);

  const formulario = $("formulario-producto");
  const mensaje = $("mensaje-producto");
  const tabla = $("tabla-productos");

  let usuarioActual = null;
  let productos = [];
  let editandoId = null;

  function informar(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.style.color = error ? "#dc2626" : "#059669";
  }

  function crearCelda(fila, valor) {
    const celda = document.createElement("td");
    celda.textContent = String(valor ?? "");
    fila.appendChild(celda);
    return celda;
  }

  function reiniciarFormulario() {
    editandoId = null;
    formulario.reset();

    if ($("titulo-formulario")) {
      $("titulo-formulario").textContent = "Registrar producto";
      $("guardar-producto").textContent = "Guardar producto";
      $("cancelar-edicion").hidden = true;
    }
  }

  async function verificarAcceso() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      location.replace("index.html");
      return false;
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from("perfiles")
      .select("nombre, rol, activo")
      .eq("id", data.user.id)
      .single();

    if (errorPerfil || !perfil || !perfil.activo) {
      await supabase.auth.signOut();
      location.replace("index.html");
      return false;
    }

    if (perfil.rol !== rolEsperado) {
      location.replace(
        perfil.rol === "administrador"
          ? "administrador.html"
          : "empleado.html"
      );
      return false;
    }

    usuarioActual = data.user;
    $("nombre-usuario").textContent =
      "Bienvenido, " + perfil.nombre;

    return true;
  }

  function mostrarProductos() {
    const busqueda = $("buscar").value.toLowerCase().trim();
    tabla.replaceChildren();

    const filtrados = productos.filter((producto) =>
      [producto.codigo, producto.nombre, producto.categoria]
        .some((valor) =>
          String(valor ?? "").toLowerCase().includes(busqueda)
        )
    );

    for (const producto of filtrados) {
      const fila = document.createElement("tr");

      crearCelda(fila, producto.codigo);
      crearCelda(fila, producto.nombre);
      crearCelda(fila, producto.categoria);
      crearCelda(fila, "S/ " + Number(producto.precio).toFixed(2));
      crearCelda(fila, producto.stock);

      const estado = crearCelda(
        fila,
        producto.stock <= producto.stock_minimo
          ? "Stock bajo"
          : "Disponible"
      );

      estado.className =
        producto.stock <= producto.stock_minimo
          ? "estado-bajo"
          : "estado-normal";

      if (rolEsperado === "administrador") {
        const acciones = document.createElement("td");

        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.className = "accion editar";
        editar.onclick = () => {
          editandoId = producto.id;

          $("codigo").value = producto.codigo;
          $("nombre").value = producto.nombre;
          $("categoria").value = producto.categoria;
          $("precio").value = producto.precio;
          $("stock").value = producto.stock;
          $("stock-minimo").value = producto.stock_minimo;

          $("titulo-formulario").textContent = "Modificar producto";
          $("guardar-producto").textContent = "Guardar cambios";
          $("cancelar-edicion").hidden = false;

          location.hash = "registro";
        };

        const eliminar = document.createElement("button");
        eliminar.textContent = "Eliminar";
        eliminar.className = "accion eliminar";
        eliminar.onclick = async () => {
          if (!confirm("¿Deseas eliminar este producto?")) return;

          const { error } = await supabase
            .from("productos")
            .delete()
            .eq("id", producto.id)
            .select("id")
            .single();

          if (error) {
            informar("Error al eliminar: " + error.message, true);
            return;
          }

          informar("Producto eliminado correctamente.");
          await cargarProductos();
        };

        acciones.append(editar, eliminar);
        fila.appendChild(acciones);
      }

      tabla.appendChild(fila);
    }

    if (filtrados.length === 0) {
      const fila = document.createElement("tr");
      const celda = crearCelda(
        fila,
        "No hay productos para mostrar."
      );
      celda.colSpan = rolEsperado === "administrador" ? 7 : 6;
      tabla.appendChild(fila);
    }
  }

  async function cargarProductos() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      informar("Error al consultar productos: " + error.message, true);
      return;
    }

    productos = data ?? [];

    $("total-productos").textContent = productos.length;

    $("total-unidades").textContent = productos.reduce(
      (total, p) => total + Number(p.stock),
      0
    );

    $("stock-bajo").textContent = productos.filter(
      (p) => p.stock <= p.stock_minimo
    ).length;

    mostrarProductos();
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const datos = {
      codigo: $("codigo").value.trim(),
      nombre: $("nombre").value.trim(),
      categoria: $("categoria").value,
      precio: Number($("precio").value),
      stock: Number($("stock").value),
      stock_minimo: Number($("stock-minimo").value)
    };

    if (
      !datos.codigo ||
      !datos.nombre ||
      !datos.categoria ||
      !Number.isFinite(datos.precio) ||
      datos.precio < 0 ||
      !Number.isInteger(datos.stock) ||
      datos.stock < 0 ||
      !Number.isInteger(datos.stock_minimo) ||
      datos.stock_minimo < 0
    ) {
      informar("Revisa los datos del formulario.", true);
      return;
    }

    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      let resultado;

      if (editandoId !== null) {
        if (rolEsperado !== "administrador") {
          throw new Error("No tienes permiso para modificar.");
        }

        resultado = await supabase
          .from("productos")
          .update(datos)
          .eq("id", editandoId)
          .select("id")
          .single();
      } else {
        resultado = await supabase
          .from("productos")
          .insert({
            ...datos,
            registrado_por: usuarioActual.id
          })
          .select("id")
          .single();
      }

      if (resultado.error) throw resultado.error;

      reiniciarFormulario();
      informar("Producto guardado correctamente.");
      await cargarProductos();

    } catch (error) {
      informar("No se pudo guardar: " + error.message, true);
    } finally {
      boton.disabled = false;
    }
  });

  $("buscar").addEventListener("input", mostrarProductos);

  if ($("cancelar-edicion")) {
    $("cancelar-edicion").onclick = reiniciarFormulario;
  }

  $("cerrar-sesion").onclick = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      informar("Error al cerrar sesión: " + error.message, true);
      return;
    }

    location.replace("index.html");
  };

  try {
    if (await verificarAcceso()) {
      await cargarProductos();
    }
  } catch (error) {
    informar("Error del sistema: " + error.message, true);
  }
}
