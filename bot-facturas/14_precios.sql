-- Aguila Motors · Precios y productos en línea (v122)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
--
-- La Caja lee de aquí los cambios de precio, imagen u ocultos de los productos
-- fijos y los productos agregados desde «Gestión de Productos». Así todos los
-- PCs, el móvil y el programa de escritorio cobran lo mismo al momento.
-- Leer: cualquiera (la Caja no pide sesión). Cambiar: solo el Jefe Aguila.

create table if not exists public.productos (
  id          text primary key,      -- ajuste: nombre normalizado del fijo · nuevo: n-xxxx
  tipo        text not null check (tipo in ('ajuste', 'nuevo')),
  nombre      text not null,
  precio      numeric,               -- ajuste sin cambio de precio: vacío
  imagen      text,
  categoria   text,
  oculto      boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.productos enable row level security;

drop policy if exists "productos todos leen" on public.productos;
create policy "productos todos leen" on public.productos
  for select to anon, authenticated using (true);

drop policy if exists "productos aguila escribe" on public.productos;
create policy "productos aguila escribe" on public.productos
  for all to authenticated
  using ((select public.es_jefe_aguila()))
  with check ((select public.es_jefe_aguila()));

grant select on public.productos to anon, authenticated;
grant insert, update, delete on public.productos to authenticated;

-- Historial de cambios de precio (quién, cuándo, de cuánto a cuánto).
-- Lo apunta la base sola; solo lo ve el Jefe Aguila.
create table if not exists public.productos_historial (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  producto    text not null,
  accion      text not null,         -- alta, cambio, baja
  antes       numeric,
  despues     numeric,
  oculto      boolean,
  por         text
);

alter table public.productos_historial enable row level security;

drop policy if exists "productos_historial aguila lee" on public.productos_historial;
create policy "productos_historial aguila lee" on public.productos_historial
  for select to authenticated using ((select public.es_jefe_aguila()));

revoke insert, update, delete on public.productos_historial from anon, authenticated;

create or replace function public.productos_apuntar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into productos_historial (producto, accion, antes, despues, oculto, por)
    values (new.nombre, 'alta', null, new.precio, new.oculto, new.updated_by);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.precio is distinct from old.precio or new.oculto is distinct from old.oculto then
      insert into productos_historial (producto, accion, antes, despues, oculto, por)
      values (new.nombre, 'cambio', old.precio, new.precio, new.oculto, new.updated_by);
    end if;
    return new;
  else
    insert into productos_historial (producto, accion, antes, despues, oculto, por)
    values (old.nombre, 'baja', old.precio, null, old.oculto, old.updated_by);
    return old;
  end if;
end;
$$;

drop trigger if exists productos_apuntar on public.productos;
create trigger productos_apuntar
  after insert or update or delete on public.productos
  for each row execute function public.productos_apuntar();
