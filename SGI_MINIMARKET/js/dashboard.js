// Pantalla de compatibilidad: redirige al panel según rol y sedes.
import { obtenerContexto, cerrarSesion } from "./sesiones.js";
const boton=document.getElementById("cerrarSesion");
if (boton) boton.onclick=async()=>{try{await cerrarSesion();}catch(e){alert(e.message);}};
try {
  const c=await obtenerContexto();
  location.replace(c.tienePanelAdministrador?"administrador.html":"empleado.html");
} catch(e) {location.replace("index.html");}
