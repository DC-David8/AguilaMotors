-- Aguila Motors · Bot de facturas (paso 1)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create table if not exists public.discord_log (
  id         text primary key,          -- ID del mensaje de Discord
  ts         timestamptz not null,      -- fecha del mensaje
  author     text,
  content    text,
  embeds     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists discord_log_ts_idx on public.discord_log (ts);

alter table public.discord_log enable row level security;

-- Solo los Jefes pueden leerla desde la página. Nadie puede escribir desde
-- la página: solo el bot (que usa la clave interna de Supabase).
drop policy if exists "discord_log jefes leen" on public.discord_log;
create policy "discord_log jefes leen" on public.discord_log
  for select to authenticated using ((select public.es_jefe()));

revoke insert, update, delete on public.discord_log from anon, authenticated;
