import { supabase } from './config.js';
const form=document.getElementById('sgi-form-cambiar-mi-clave');
if(form){
  form.addEventListener('submit',async evento=>{
    evento.preventDefault();
    const status=document.getElementById('sgi-cambiar-mi-clave-estado');
    const actual=document.getElementById('sgi-clave-actual').value;
    const nueva=document.getElementById('sgi-clave-nueva').value;
    const confirmar=document.getElementById('sgi-clave-nueva-confirmar').value;
    if(nueva!==confirmar||nueva.length<12||nueva.length>128||
       !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(nueva)||!/[0-9]/.test(nueva)){
      status.textContent='Las contraseñas deben coincidir y tener al menos 12 caracteres con letras y números.';
      status.dataset.error='true';return;
    }
    const b=form.querySelector('[type="submit"]');b.disabled=true;
    status.textContent='Comprobando identidad...';
    try{
      const {data:user,error:eUser}=await supabase.auth.getUser();
      if(eUser||!user?.user?.email)throw new Error('Tu sesión no está disponible.');
      const {error:ePass}=await supabase.auth.signInWithPassword({email:user.user.email,password:actual});
      if(ePass)throw new Error('La contraseña actual es incorrecta.');
      const {error:eUpdate}=await supabase.auth.updateUser({password:nueva});
      if(eUpdate)throw eUpdate;
      form.reset();status.dataset.error='false';
      status.textContent='Tu contraseña se ha actualizado correctamente.';
    }catch(error){status.dataset.error='true';status.textContent=error.message||'No se pudo cambiar la contraseña.';}
    finally{b.disabled=false;}
  });
}
