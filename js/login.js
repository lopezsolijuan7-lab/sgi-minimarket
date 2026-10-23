
import { supabase } from "./config.js";

const formulario = document.getElementById("loginForm");
const mensaje = document.getElementById("mensaje");
const boton = document.getElementById("btnIngresar");

// Verificar que Supabase responda
async function probarConexion() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Error de Supabase:", error.message);
    } else {
      console.log("Supabase responde correctamente");
      console.log("Sesión activa:", !!data.session);
    }
  } catch (error) {
    console.error("Error de conexión:", error);
  }
}

probarConexion();

// Iniciar sesión
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const correo = document.getElementById("correo").value.trim();
  const password = document.getElementById("password").value;

  boton.disabled = true;
  boton.textContent = "Verificando...";
  mensaje.textContent = "";

  try {
    // Autenticación con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: password
    });

    if (error) {
      console.error("Error de autenticación:", error.message);

      if (error.message === "Invalid API key") {
        throw new Error("La clave de Supabase no es válida.");
      }

      if (error.message === "Email not confirmed") {
        throw new Error("El correo todavía no está confirmado.");
      }

      throw new Error("Correo o contraseña incorrectos.");
    }

    if (!data.user) {
      throw new Error("No se pudo identificar al usuario.");
    }

    // Consultar el perfil del usuario
    const { data: perfil, error: errorPerfil } = await supabase
      .from("perfiles")
      .select("nombre, rol, activo")
      .eq("id", data.user.id)
      .single();

    if (errorPerfil || !perfil) {
      console.error("Error de perfil:", errorPerfil);
      await supabase.auth.signOut();
      throw new Error("No se pudo verificar el perfil del usuario.");
    }

    // Comprobar si la cuenta está activa
    if (!perfil.activo) {
      await supabase.auth.signOut();
      throw new Error("Esta cuenta está desactivada.");
    }

    // Comprobar rol
    if (!["administrador", "empleado"].includes(perfil.rol)) {
      await supabase.auth.signOut();
      throw new Error("Rol no autorizado.");
    }

    console.log("Inicio de sesión correcto");
    console.log("Usuario:", perfil.nombre);
    console.log("Rol:", perfil.rol);

    mensaje.style.color = "green";
    mensaje.textContent = "Bienvenido, " + perfil.nombre;

    // Abrir el panel principal
    window.location.replace("dashboard.html");

  } catch (error) {
    console.error("Error del login:", error);
    mensaje.style.color = "red";
    mensaje.textContent = error.message;

  } finally {
    boton.disabled = false;
    boton.textContent = "Ingresar al sistema";
  }
});
