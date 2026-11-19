// Alta de personal autorizada en servidor. La clave de servicio nunca llega al navegador.
import { createClient } from 'npm:@supabase/supabase-js@2';
const headers = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
};
const responder = (status:number, cuerpo:Record<string,unknown>) =>
  new Response(JSON.stringify(cuerpo),{status,headers});
const validaClave = (s:string) => s.length >= 12 && s.length <= 128 &&
  /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(s) && /[0-9]/.test(s);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return responder(405,{error:'Método no permitido.'});
  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return responder(503,{error:'Falta configurar Supabase.'});
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responder(401,{error:'Sesión no autorizada.'});
  const api = createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:identidad,error:errToken} = await api.auth.getUser(token);
  if (errToken || !identidad.user) return responder(401,{error:'Sesión inválida.'});
  const {data:perfil,error:errPerfil} = await api.from('usuarios')
    .select('rol,activo').eq('id',identidad.user.id).maybeSingle();
  if (errPerfil || perfil?.rol !== 'administrador' || !perfil.activo) {
    return responder(403,{error:'Solo un administrador activo puede registrar empleados.'});
  }
  let b:Record<string,unknown>;
  try {b = await req.json();} catch {return responder(400,{error:'Formulario inválido.'});}
  if (!b || typeof b !== 'object' || Array.isArray(b)) return responder(400,{error:'Formulario inválido.'});
  const nombre = String(b.nombre ?? '').trim().replace(/\s+/g,' ');
  const correo = String(b.correo ?? '').trim().toLowerCase();
  const clave = String(b.clave ?? '');
  const sucursal_id = Number(b.sucursal_id);
  if (nombre.length < 2 || nombre.length > 120 ||
      correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      !Number.isSafeInteger(sucursal_id) || sucursal_id < 1 || !validaClave(clave)) {
    return responder(400,{error:'Nombre, correo, sucursal o contraseña inválidos.'});
  }
  const {data:sede,error:errSede} = await api.from('sucursales')
    .select('id').eq('id',sucursal_id).eq('activo',true).maybeSingle();
  if (errSede || !sede) return responder(400,{error:'La sucursal no está activa.'});

  // Administrador responsable de verificar identidad y correo del colaborador.
  // email_confirm=true permite el acceso inmediato con la clave temporal proporcionada.
  // El empleado puede cambiarla desde Mi cuenta o recuperarla mediante correo.
  const {data:creada,error:errCrear} = await api.auth.admin.createUser({
    email:correo,password:clave,email_confirm:true,user_metadata:{nombre}
  });
  if (errCrear || !creada?.user?.id) return responder(409,{
    error:errCrear?.message || 'Este correo ya pertenece a otra cuenta.'
  });
  const id=creada.user.id;
  const registro={nombre,rol:'empleado',activo:true,sucursal_id};
  const {data:existente,error:errConsulta} = await api.from('usuarios')
    .select('rol').eq('id',id).maybeSingle();
  if (errConsulta || (existente && existente.rol !== 'empleado')) {
    return responder(500,{error:'Cuenta creada, pero no pudo verificarse el perfil. Revisa Auth antes de reintentar.'});
  }
  const resultado = existente
    ? await api.from('usuarios').update(registro).eq('id',id).eq('rol','empleado')
    : await api.from('usuarios').insert({id,...registro});
  if (resultado.error) {
    return responder(500,{error:'Cuenta creada, pero no se pudo asignar la sucursal. Corrige el perfil desde Supabase.'});
  }
  return responder(200,{ok:true});
});
