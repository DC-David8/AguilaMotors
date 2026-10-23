-- Aguila Motors · Semanas cerradas y strikes
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create table if not exists public.pagos_semanas (
  semana      date primary key,        -- domingo con el que empieza la semana (hora España)
  desde       date,
  hasta       date,
  datos       jsonb not null,           -- lo que facturó y cobró cada uno y quién llevó strike
  cerrada_por text,
  created_at  timestamptz not null default now()
);

alter table public.pagos_semanas enable row level security;

-- Solo los Jefes ven, cierran y reabren semanas.
drop policy if exists "pagos_semanas jefes" on public.pagos_semanas;
create policy "pagos_semanas jefes" on public.pagos_semanas
  for all to authenticated
  using ((select public.es_jefe()))
  with check ((select public.es_jefe()));
