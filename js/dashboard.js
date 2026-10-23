
import { supabase } from "./config.js";

const panel = document.getElementById("panel");
const bienvenida = document.getElementById("bienvenida");
const rolUsuario = document.getElementById("rolUsuario");
const descripcion = document.getElementById("descripcion");
const cerrarSesion = document.getElementById("cerrarSesion");

async function verificarSesion() {

  const { data, error } =
    await supabase.auth.getUser();

  if (error || !data.user) {
    window.location.replace("index.html");
    return;
  }

  const { data: perfil, error: errorPerfil } =
    await supabase
      .from("perfiles")
      .select("nombre, rol, activo")
      .eq("id", data.user.id)
      .single();

  if (
    errorPerfil ||
    !perfil ||
    !perfil.activo ||
    !["administrador", "empleado"].includes(perfil.rol)
  ) {
    await supabase.auth.signOut();
    window.location.replace("index.html");
    return;
  }

  bienvenida.textContent =
    "Bienvenido, " + perfil.nombre;

  rolUsuario.textContent =
    "Rol: " + perfil.rol;

  if (perfil.rol === "administrador") {
    descripcion.textContent =
      "Panel del administrador del minimarket";
  } else {
    descripcion.textContent =
      "Panel del empleado del minimarket";
  }

  panel.style.display = "block";
}

cerrarSesion.addEventListener("click", async () => {

  cerrarSesion.disabled = true;

  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("No se pudo cerrar la sesión.");
    cerrarSesion.disabled = false;
    return;
  }

  window.location.replace("index.html");
});

verificarSesion();
