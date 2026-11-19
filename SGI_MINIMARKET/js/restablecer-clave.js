import { supabase } from './config.js';
const $=id=>document.getElementById(id);
let permitido=false;
let sesionRecuperacion=null;
const informar=(texto,error=false)=>{const p=$('sgi-reset-status');p.textContent=texto;p.dataset.error=String(error);};
const habilitar=(session)=>{
  permitido=Boolean(session?.user);
  sesionRecuperacion=session;
  $('sgi-reset-btn').disabled=!permitido;
  informar(permitido?'Enlace verificado. Ingresa una contraseña nueva.':'El enlace no contiene una sesión válida.',!permitido);
};
supabase.auth.onAuthStateChange((evento,session)=>{
  if(evento==='PASSWORD_RECOVERY') habilitar(session);
});
// Supabase procesa el enlace y dispara PASSWORD_RECOVERY.
// No permitir cambios por solo tener una sesión ordinaria activa.
$('sgi-reset-form').addEventListener('submit',async evento=>{
  evento.preventDefault();
  if(!permitido || !sesionRecuperacion){informar('Solicita otro enlace de recuperación.',true);return;}
  const clave=$('sgi-reset-password').value,confirmar=$('sgi-reset-confirmar').value;
  if(clave!==confirmar||clave.length<12||clave.length>128||
      !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave)||!/[0-9]/.test(clave)){
    informar('La contraseña debe tener 12 o más caracteres, letras y números. Comprueba ambas entradas.',true);return;
  }
  const boton=$('sgi-reset-btn');boton.disabled=true;
  informar('Actualizando contraseña...');
  try{
    const {error}=await supabase.auth.updateUser({password:clave});
    if(error)throw error;
    permitido=false;sesionRecuperacion=null;
    $('sgi-reset-form').reset();
    await supabase.auth.signOut();
    informar('Contraseña actualizada. Ya puedes iniciar sesión con tu nueva clave.');
    $('sgi-reset-exito').hidden=false;
  }catch(error){informar(error.message||'No se pudo actualizar la contraseña.',true);boton.disabled=false;}
});
