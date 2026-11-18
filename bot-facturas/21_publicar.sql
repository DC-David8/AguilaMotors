-- Aguila Motors · Mensajes de la semana publicados por el bot (paso 21)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
--
-- Guarda qué mensaje(s) publicó el bot para cada semana (pagas, movimientos
-- de personal y strikes), para que «Publicar» edite el mismo y no duplique.

create table if not exists public.pub_msgs (
  semana   date not null,
  clave    text not null,           -- pagas · movs · strikes
  msg_ids  text[] not null default '{}',
  at       timestamptz not null default now(),
  por      text,
  primary key (semana, clave)
);
alter table public.pub_msgs enable row level security;
drop policy if exists "pub_msgs jefatura lee" on public.pub_msgs;
create policy "pub_msgs jefatura lee" on public.pub_msgs
  for select to authenticated using ((select public.es_jefe()));
grant select on public.pub_msgs to authenticated;
-- Solo escribe la función del bot (con su llave de servicio).
