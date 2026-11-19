// Cambio administrativo de contraseña: solo administrador activo, solo cuentas de empleados.
import { createClient } from 'npm:@supabase/supabase-js@2';
const headers={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
};
const responder=(status:number,cuerpo:Record<string,unknown>)=>new Response(JSON.stringify(cuerpo),{status,headers});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return responder(405,{error:'Método no permitido.'});
  const url=Deno.env.get('SUPABASE_URL');
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!service)return responder(503,{error:'Falta configurar Supabase.'});
  const token=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return responder(401,{error:'Sesión no válida.'});
  const api=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:auth,error:errAuth}=await api.auth.getUser(token);
  if(errAuth||!auth.user)return responder(401,{error:'Sesión inválida.'});
  const {data:admin,error:errAdmin}=await api.from('usuarios')
    .select('rol,activo').eq('id',auth.user.id).maybeSingle();
  if(errAdmin||!admin?.activo||admin.rol!=='administrador')return responder(403,{error:'Acción exclusiva del administrador.'});
  let b:Record<string,unknown>;
  try{b=await req.json();}catch{return responder(400,{error:'Solicitud inválida.'});}
  if(!b||typeof b!=='object'||Array.isArray(b))return responder(400,{error:'Solicitud inválida.'});
  const id=String(b.empleado_id??'');
  const clave=String(b.clave??'');
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id) ||
     clave.length<12||clave.length>128||!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave)||!/[0-9]/.test(clave)){
    return responder(400,{error:'Identificador de empleado o contraseña inválidos.'});
  }
  if(id===auth.user.id)return responder(403,{error:'No puedes usar este módulo para modificar tu propia contraseña.'});
  const {data:empleado,error:errEmpleado}=await api.from('usuarios')
    .select('id,rol').eq('id',id).maybeSingle();
  if(errEmpleado || empleado?.rol!=='empleado')return responder(404,{error:'Empleado no encontrado.'});
  const {error:errUpdate}=await api.auth.admin.updateUserById(id,{password:clave});
  if(errUpdate)return responder(400,{error:'Supabase no pudo actualizar esa contraseña.'});
  return responder(200,{ok:true});
});
