
import { supabase } from "./config.js";

// ELEMENTOS DEL FORMULARIO
const formulario = document.getElementById("loginForm");
const mensaje = document.getElementById("mensaje");
const boton = document.getElementById("btnIngresar");

// MOSTRAR MENSAJES
function mostrarMensaje(texto, color = "red") {
    mensaje.textContent = texto;
    mensaje.style.color = color;
}

// CONSULTAR PERFIL Y ABRIR PANTALLA CORRESPONDIENTE
async function abrirPanel(usuario) {

    const { data: perfil, error } = await supabase
        .from("perfiles")
        .select("nombre, rol, activo")
        .eq("id", usuario.id)
        .single();

    if (error || !perfil) {
        console.error("Error al consultar perfil:", error);
        throw new Error(
            "No se encontró tu perfil en Supabase."
        );
    }

    if (!perfil.activo) {
        throw new Error(
            "Tu cuenta está desactivada. Contacta al administrador."
        );
    }

    if (perfil.rol === "administrador") {

        mostrarMensaje(
            "Bienvenido, " + perfil.nombre,
            "green"
        );

        window.location.replace("administrador.html");
        return;
    }

    if (perfil.rol === "empleado") {

        mostrarMensaje(
            "Bienvenido, " + perfil.nombre,
            "green"
        );

        window.location.replace("empleado.html");
        return;
    }

    throw new Error("Tu cuenta no tiene un rol autorizado.");
}

// COMPROBAR CONEXIÓN CON SUPABASE
async function probarConexion() {

    try {

        const { data, error } =
            await supabase.auth.getSession();

        if (error) {
            console.error(
                "Error de Supabase:",
                error.message
            );
            return;
        }

        console.log("Conexión con Supabase correcta");
        console.log("Sesión activa:", !!data.session);

    } catch (error) {

        console.error(
            "Error de conexión:",
            error.message
        );
    }
}

probarConexion();

// INICIAR SESIÓN
formulario.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const correo = document
        .getElementById("correo")
        .value.trim();

    const password = document
        .getElementById("password")
        .value;

    boton.disabled = true;
    boton.textContent = "Verificando...";
    mostrarMensaje("Comprobando credenciales...", "#64748b");

    try {

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email: correo,
                password: password
            });

        if (error) {

            console.error(
                "Error de autenticación:",
                error.message
            );

            if (error.message === "Invalid API key") {
                throw new Error(
                    "La clave pública de Supabase no es válida."
                );
            }

            if (error.message === "Email not confirmed") {
                throw new Error(
                    "El correo todavía no está confirmado."
                );
            }

            if (error.message === "Invalid login credentials") {
                throw new Error(
                    "Correo o contraseña incorrectos."
                );
            }

            throw new Error(error.message);
        }

        if (!data.user) {
            throw new Error(
                "No se pudo identificar al usuario."
            );
        }

        mostrarMensaje(
            "Credenciales correctas. Verificando permisos...",
            "#64748b"
        );

        // REDIRECCIÓN SEGÚN EL ROL
        await abrirPanel(data.user);

    } catch (error) {

        console.error("Error de acceso:", error);

        // Evitar conservar una sesión sin autorización
        await supabase.auth.signOut();

        mostrarMensaje(error.message);

    } finally {

        boton.disabled = false;
        boton.textContent = "Ingresar al sistema";
    }

});
