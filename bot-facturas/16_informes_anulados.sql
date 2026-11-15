-- Aguila Motors · Informes anulados en la verificación pública (v139)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- (Necesita antes el 12_informes.sql y el 13_verificar_informes.sql.)
--
-- Desde la v139 un informe emitido se puede ANULAR: sigue en el registro con su
-- sello de ANULADO. Esta versión de la función hace que el QR de un informe
-- anulado diga «DOCUMENTO ANULADO» (con la fecha y el motivo) en vez de
-- «no válido». Sigue devolviendo solo los datos de siempre de UN código
-- concreto: nunca el propietario, las fotos ni el resto del formulario.
-- Sin ejecutar este SQL todo funciona igual; solo que un informe anulado
-- aparece en la página del QR como «documento no válido».

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
    'inspector', i.datos->>'inspector',
    'estado', i.estado,
    'anulado_at', i.datos->>'anuladoAt',
    'anulado_motivo', i.datos->>'anuladoMotivo'
  )
  from public.informes i
  where i.codigo = upper(btrim(p_codigo))
    and i.estado in ('emitido', 'anulado')
    and length(btrim(p_codigo)) between 8 and 20
  limit 1;
$$;

revoke all on function public.verificar_informe(text) from public;
grant execute on function public.verificar_informe(text) to anon, authenticated;
