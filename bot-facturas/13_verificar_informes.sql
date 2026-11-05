-- Aguila Motors · Verificación pública de informes (página v.html y QR del informe)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- (Necesita antes el 12_informes.sql.)
--
-- La tabla de informes sigue siendo solo del Jefe Aguila. Esta función deja que
-- cualquiera, sin iniciar sesión, compruebe UN código concreto (AM-XXXX-XXXX) y
-- recibe solo estos datos del informe EMITIDO: número, tipo, agencia, placa,
-- vehículo, matrícula, resultado, fecha e inspector. Nunca el propietario, la
-- captura ni el resto del formulario. No permite listar ni buscar informes.

create or replace function public.verificar_informe(p_codigo text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'numero', i.numero,
    'tipo', i.tipo,
    'agencia', i.agencia,
    'placa', i.placa,
    'vehiculo', i.vehiculo,
    'matricula', i.matricula,
    'resultado', i.resultado,
    'codigo', i.codigo,
    'ts', coalesce((i.datos->>'ts')::bigint, (extract(epoch from i.created_at) * 1000)::bigint),
    'emitido_at', i.emitido_at,
    'inspector', i.datos->>'inspector'
  )
  from public.informes i
  where i.codigo = upper(btrim(p_codigo))
    and i.estado = 'emitido'
    and length(btrim(p_codigo)) between 8 and 20
  limit 1;
$$;

revoke all on function public.verificar_informe(text) from public;
grant execute on function public.verificar_informe(text) to anon, authenticated;
