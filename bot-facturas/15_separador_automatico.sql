-- Aguila Motors · Separador automático al cierre de la semana
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
--
-- Cada sábado a las 24:00 de ESPAÑA (domingo 00:00; en Guatemala, sábado
-- 17:00 en invierno y 16:00 en verano) publica el separador 🦅 en los canales
-- que pongas abajo, por su webhook. El cambio de hora de España se tiene en
-- cuenta solo: la tarea se despierta a las dos horas posibles y solo envía
-- cuando en España son las 00.
--
-- El mensaje es EL MISMO separador que ya usas: se copia del último que haya
-- en el canal de facturas (tabla discord_log), así la página lo sigue
-- reconociendo. Si un canal necesita otro texto, ponlo en su columna "mensaje".
--
-- Las direcciones de los webhooks quedan en una tabla privada: nadie puede
-- leerla desde la página (ni con sesión). Quien tenga una de esas direcciones
-- puede escribir en el canal: no las compartas.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1) Canales donde se publica ------------------------------------------------
create table if not exists public.separador_webhooks (
  nombre      text primary key,          -- para ti: "facturas", "pagas"…
  url         text not null,             -- https://discord.com/api/webhooks/…
  mensaje     text,                      -- vacío = el separador de siempre
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.separador_webhooks enable row level security;
revoke all on public.separador_webhooks from anon, authenticated;

-- 2) Registro de envíos (para no repetir y para ver que funcionó) ------------
create table if not exists public.separador_envios (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  canal     text,
  resultado text not null,               -- enviado, prueba, sin separador, …
  detalle   text
);
alter table public.separador_envios enable row level security;
revoke all on public.separador_envios from anon, authenticated;

-- 3) La función que envía ----------------------------------------------------
--   enviar_separador()              → la llama la tarea: solo envía si en
--                                     España son las 00 del domingo y no se
--                                     ha enviado ya en las últimas 20 horas.
--   enviar_separador(prueba => true)→ envía YA un mensaje de PRUEBA (no es el
--                                     separador: no corta la semana).
--   enviar_separador(forzar => true)→ envía YA el separador de verdad.
create or replace function public.enviar_separador(prueba boolean default false, forzar boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ahora_es  timestamp := now() at time zone 'Europe/Madrid';
  sep       text;
  w         record;
  texto     text;
  n         int := 0;
begin
  if not prueba and not forzar then
    -- Solo el domingo a las 00 (hora de España) = cierre del sábado.
    if extract(dow from ahora_es) <> 0 or extract(hour from ahora_es) <> 0 then
      return 'fuera de hora (España: ' || to_char(ahora_es, 'Dy HH24:MI') || ')';
    end if;
    if exists (select 1 from separador_envios where resultado = 'enviado' and at > now() - interval '20 hours') then
      return 'ya enviado esta semana';
    end if;
  end if;

  -- El separador de siempre: el último que hay en el canal de facturas.
  select content into sep
    from discord_log
   where content ilike '%1211602620565950514%'
   order by ts desc
   limit 1;

  for w in select * from separador_webhooks where activo loop
    texto := case when prueba then '🧪 Prueba del separador automático de Aguila Motors (puedes borrar este mensaje).'
                  else coalesce(nullif(btrim(w.mensaje), ''), sep) end;
    if texto is null then
      insert into separador_envios (canal, resultado, detalle)
      values (w.nombre, 'sin separador', 'No hay ningún separador anterior en discord_log ni mensaje propio para este canal.');
      continue;
    end if;
    if w.url !~ '^https://(discord|discordapp)\.com/api/webhooks/' then
      insert into separador_envios (canal, resultado, detalle)
      values (w.nombre, 'url no válida', 'La dirección no es un webhook de Discord.');
      continue;
    end if;
    perform net.http_post(
      url     := w.url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('content', texto)
    );
    insert into separador_envios (canal, resultado) values (w.nombre, case when prueba then 'prueba' else 'enviado' end);
    n := n + 1;
  end loop;

  return n || ' ' || case when n = 1 then 'canal' else 'canales' end || case when prueba then ' (prueba)' else '' end;
end;
$$;
revoke all on function public.enviar_separador(boolean, boolean) from public, anon, authenticated;

-- 4) La tarea: sábado a las 22:00 y 23:00 UTC (una de las dos es la
--    medianoche de España, según sea horario de verano o de invierno).
select cron.unschedule('aguila-separador')
where exists (select 1 from cron.job where jobname = 'aguila-separador');

select cron.schedule('aguila-separador', '0 22,23 * * 6', $$ select public.enviar_separador(); $$);

-- 5) TUS CANALES -------------------------------------------------------------
-- Quita los dos guiones del principio, pega la dirección de cada webhook entre
-- las comillas y ejecuta SOLO estas líneas (una por canal; el nombre es libre):
--
-- insert into public.separador_webhooks (nombre, url) values
--   ('facturas', 'PEGA-AQUI-LA-URL-DEL-WEBHOOK')
-- on conflict (nombre) do update set url = excluded.url, activo = true;
--
-- Probar ahora (manda un mensaje de prueba, no el separador):
--   select public.enviar_separador(prueba => true);
-- Ver los envíos:
--   select at, canal, resultado, detalle from public.separador_envios order by at desc limit 20;
-- Dejar de enviar a un canal:
--   update public.separador_webhooks set activo = false where nombre = 'facturas';
