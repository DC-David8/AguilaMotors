-- Aguila Motors · Imagen de la licencia de cada empleado (paso 19)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
--
-- Las licencias marcadas (Coche, Moto, Camión, Avión) se guardan en la columna
-- employees.licencia (paso 17). Aquí va la IMAGEN de la licencia: una por
-- empleado, en una tabla privada (no es una carpeta pública): solo la ve la
-- Jefatura y solo el Jefe Aguila la sube, cambia o quita.

create table if not exists public.emp_licencias (
  employee_id text primary key,
  foto        text not null,                 -- imagen comprimida (data:image/jpeg;base64,…)
  updated_at  timestamptz not null default now(),
  por         text
);
alter table public.emp_licencias enable row level security;

drop policy if exists "emp_licencias jefatura lee" on public.emp_licencias;
create policy "emp_licencias jefatura lee" on public.emp_licencias
  for select to authenticated using ((select public.es_jefe()));

drop policy if exists "emp_licencias aguila sube" on public.emp_licencias;
create policy "emp_licencias aguila sube" on public.emp_licencias
  for insert to authenticated with check ((select public.es_jefe_aguila()));

drop policy if exists "emp_licencias aguila cambia" on public.emp_licencias;
create policy "emp_licencias aguila cambia" on public.emp_licencias
  for update to authenticated using ((select public.es_jefe_aguila())) with check ((select public.es_jefe_aguila()));

drop policy if exists "emp_licencias aguila borra" on public.emp_licencias;
create policy "emp_licencias aguila borra" on public.emp_licencias
  for delete to authenticated using ((select public.es_jefe_aguila()));

-- Lo que ya estaba como «Tiene» o «Pendiente» pasa a «sin marcar»: se marcan
-- los tipos en la ficha.
update public.employees set licencia = '' where licencia in ('Pendiente', 'Tiene');
alter table public.employees alter column licencia set default '';
