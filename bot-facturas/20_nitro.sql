-- Aguila Motors · Licencias de nitro (paso 20)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces:
-- los datos iniciales solo se meten si las tablas están vacías.
--
-- Solo el Jefe Aguila asigna, retira y registra donaciones; la Jefatura lo ve.
-- Si el titular de una licencia es DESPEDIDO, la licencia vuelve sola a «Por
-- asignar» y queda apuntado en el historial (lo hace la base de datos).

-- 1) Licencias ---------------------------------------------------------------
create table if not exists public.nitro_licencias (
  n            int primary key,              -- Licencia 1, 2, 3…
  employee_id  text,                         -- titular (vacío = por asignar)
  asignada_at  date,
  principal    boolean not null default false
);

-- 2) Donaciones --------------------------------------------------------------
create table if not exists public.nitro_donaciones (
  id          bigserial primary key,
  fecha       date not null,
  importe     numeric not null,              -- en €
  licencias   int not null default 1,
  por_id      text,                          -- empleado que la hizo
  created_at  timestamptz not null default now()
);

-- 3) Historial de movimientos ------------------------------------------------
create table if not exists public.nitro_movs (
  id           bigserial primary key,
  fecha        date not null default (now() at time zone 'Europe/Madrid')::date,
  tipo         text not null,                -- compra · donacion · asigna · retira · devuelta
  n            int,
  employee_id  text,
  nombre       text,                         -- nombre en ese momento
  texto        text,                         -- detalle (importe, motivo…)
  created_at   timestamptz not null default now()
);

-- 4) Mensajes del bot en el canal (para editarlos siempre los mismos) --------
create table if not exists public.nitro_msgs (
  clave   text primary key,                  -- inversiones · asignacion · normas · historial
  msg_id  text
);

-- Permisos: la Jefatura lee; solo el Jefe Aguila escribe.
do $$
declare t text;
begin
  foreach t in array array['nitro_licencias', 'nitro_donaciones', 'nitro_movs', 'nitro_msgs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s jefatura lee" on public.%I', t, t);
    execute format('create policy "%s jefatura lee" on public.%I for select to authenticated using ((select public.es_jefe()))', t, t);
    execute format('drop policy if exists "%s aguila escribe" on public.%I', t, t);
    execute format('create policy "%s aguila escribe" on public.%I for all to authenticated using ((select public.es_jefe_aguila())) with check ((select public.es_jefe_aguila()))', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- 5) Si despiden al titular, la licencia vuelve sola --------------------------
create or replace function public.nitro_devolver_al_despedir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare l record;
begin
  if new.despedido_at is not null and old.despedido_at is null then
    for l in select n from nitro_licencias where employee_id = new.id::text and not principal loop
      update nitro_licencias set employee_id = null, asignada_at = null where n = l.n;
      insert into nitro_movs (tipo, n, employee_id, nombre, texto)
      values ('devuelta', l.n, new.id::text, trim(coalesce(new.name, '') || ' ' || coalesce(new.surname, '')), 'baja del taller');
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists nitro_devolver on public.employees;
create trigger nitro_devolver after update of despedido_at on public.employees
  for each row execute function public.nitro_devolver_al_despedir();

-- 6) Datos actuales (los del canal) — solo si está vacío ---------------------
insert into public.nitro_licencias (n, employee_id, asignada_at, principal)
select 1, (select id::text from public.employees where discord = '696575473580376115' and despedido_at is null limit 1), date '2026-10-05', true
where not exists (select 1 from public.nitro_licencias);
insert into public.nitro_licencias (n, employee_id, asignada_at, principal)
select 2, (select id::text from public.employees where discord = '1010942234830569492' and despedido_at is null limit 1), date '2026-10-21', false
where not exists (select 1 from public.nitro_licencias where n = 2);
insert into public.nitro_licencias (n, employee_id, asignada_at, principal)
select 3, null, null, false
where not exists (select 1 from public.nitro_licencias where n = 3);

insert into public.nitro_donaciones (fecha, importe, licencias, por_id)
select date '2026-10-21', 100, 2, (select id::text from public.employees where discord = '696575473580376115' limit 1)
where not exists (select 1 from public.nitro_donaciones);

insert into public.nitro_movs (fecha, tipo, n, employee_id, nombre, texto)
select * from (values
  (date '2026-10-05', 'compra', 1, null::text, null::text, 'con la compra del taller'),
  (date '2026-10-21', 'donacion', null::int, null, null, '2 licencias nuevas (100 €)')
) v
where not exists (select 1 from public.nitro_movs);
insert into public.nitro_movs (fecha, tipo, n, employee_id, nombre)
select date '2026-10-21', 'asigna', 2, e.id::text, trim(e.name || ' ' || e.surname)
from public.employees e
where e.discord = '1010942234830569492'
  and not exists (select 1 from public.nitro_movs where tipo = 'asigna');

-- Comprobar:
--   select * from public.nitro_licencias order by n;
--   select * from public.nitro_movs order by fecha, id;
