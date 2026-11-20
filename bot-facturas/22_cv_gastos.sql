-- Aguila Motors · Gastos de cada coche del Compraventa (paso 22)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
--
-- Lo que se gasta en un coche antes de revenderlo (reparación, tuning,
-- pintura…). La página resta estos gastos al calcular la ganancia de la venta.
-- Solo el Jefe Aguila los ve y los apunta (igual que el historial).

create table if not exists public.cv_gastos (
  id          bigserial primary key,
  ciclo       text not null,               -- matrícula + fecha de la compra
  plate       text not null,
  fecha       timestamptz not null default now(),
  concepto    text,
  importe     numeric not null,
  por         text
);
create index if not exists cv_gastos_ciclo on public.cv_gastos (ciclo);
alter table public.cv_gastos enable row level security;
drop policy if exists "cv_gastos aguila" on public.cv_gastos;
create policy "cv_gastos aguila" on public.cv_gastos
  for all to authenticated using ((select public.es_jefe_aguila())) with check ((select public.es_jefe_aguila()));
grant select, insert, update, delete on public.cv_gastos to authenticated;
grant usage, select on all sequences in schema public to authenticated;
