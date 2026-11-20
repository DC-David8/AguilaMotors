-- Aguila Motors · Comisiones del compraventa (paso 23)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
--
-- 10 % de la ganancia para el mediador de la venta y 5 % para el de la compra
-- (ganancia = venta − compra − gastos; sin comisión si hay pérdida o es un
-- traspaso a $ 0). La calcula la página del Jefe Aguila al procesar el log
-- del compraventa y se paga con la semana en que se vendió el coche. Aquí
-- solo se guardan nombres e importes de la comisión (no precios de compra),
-- así la Jefatura que cierre la semana la ve en Pagos.

create table if not exists public.cv_comisiones (
  venta_uid   text primary key,           -- la venta (cv_tx.uid)
  semana      date not null,              -- domingo de la semana de pago
  plate       text,
  modelo      text,
  ganancia    numeric not null,
  med_venta   text,
  com_venta   numeric not null default 0,
  med_compra  text,
  com_compra  numeric not null default 0,
  calc_at     timestamptz not null default now()
);
create index if not exists cv_comisiones_semana on public.cv_comisiones (semana);
alter table public.cv_comisiones enable row level security;
drop policy if exists "cv_comisiones jefatura lee" on public.cv_comisiones;
create policy "cv_comisiones jefatura lee" on public.cv_comisiones
  for select to authenticated using ((select public.es_jefe()));
drop policy if exists "cv_comisiones aguila escribe" on public.cv_comisiones;
create policy "cv_comisiones aguila escribe" on public.cv_comisiones
  for all to authenticated using ((select public.es_jefe_aguila())) with check ((select public.es_jefe_aguila()));
grant select, insert, update, delete on public.cv_comisiones to authenticated;
