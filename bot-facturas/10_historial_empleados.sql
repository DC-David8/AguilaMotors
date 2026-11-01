-- Aguila Motors · Historial de cada empleado y fecha de entrada
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- La ficha de empleado muestra aquí los ascensos, descensos, strikes puestos o
-- quitados, cambios de datos, despidos y readmisiones.

create table if not exists public.emp_historial (
  id          bigserial primary key,
  employee_id text not null,
  at          timestamptz not null default now(),
  tipo        text,          -- alta, rango, strike, datos, despido
  texto       text not null,
  por         text
);

create index if not exists emp_historial_emp_idx on public.emp_historial (employee_id, at desc);

alter table public.emp_historial enable row level security;

-- Los Jefes ven el historial y lo apuntan (la página lo hace sola al cambiar algo).
drop policy if exists "emp_historial jefes leen" on public.emp_historial;
create policy "emp_historial jefes leen" on public.emp_historial
  for select to authenticated using ((select public.es_jefe()));

drop policy if exists "emp_historial jefes apuntan" on public.emp_historial;
create policy "emp_historial jefes apuntan" on public.emp_historial
  for insert to authenticated with check ((select public.es_jefe()));

-- Solo el Jefe Aguila puede borrar entradas (por si hay errores).
drop policy if exists "emp_historial aguila borra" on public.emp_historial;
create policy "emp_historial aguila borra" on public.emp_historial
  for delete to authenticated using ((select public.es_jefe_aguila()));

-- Fecha de entrada al taller: los que ya están quedan vacíos (la ficha usa su
-- primera semana cerrada); los nuevos se apuntan solos desde ahora.
alter table public.employees add column if not exists alta_at timestamptz;
alter table public.employees alter column alta_at set default now();
