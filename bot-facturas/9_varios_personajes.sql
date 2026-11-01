-- Aguila Motors · Varios personajes con el mismo Discord (char1, char2…)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- Necesita haber ejecutado antes 5_despidos.sql.

-- 1) Por si la columna discord no admitía repetidos: se quita esa restricción.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.employees'::regclass and con.contype = 'u' and att.attname = 'discord'
  loop
    execute format('alter table public.employees drop constraint %I', r.conname);
  end loop;
  for r in
    select i.relname
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_attribute att on att.attrelid = x.indrelid and att.attnum = any (x.indkey)
    where x.indrelid = 'public.employees'::regclass and x.indisunique and not x.indisprimary and att.attname = 'discord'
  loop
    execute format('drop index if exists public.%I', r.relname);
  end loop;
end $$;

-- Orden de los rangos (mayor = más alto).
create or replace function public.rango_nivel(r text)
returns int
language sql
immutable
as $$
  select case r
    when 'Jefe Aguila' then 7 when 'Jefe' then 6 when 'Mano Derecha' then 5
    when 'Subjefe' then 4 when 'Experimentado' then 3 when 'Mecánico' then 2
    when 'Chalán' then 1 else 0 end
$$;

-- 2) Rango del que entra: si tiene varios personajes, el más alto.
create or replace function public.mi_rango()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.rank
  from public.employees e
  where coalesce(e.discord, '') <> ''
    and e.discord = coalesce(auth.jwt() -> 'user_metadata' ->> 'provider_id', auth.jwt() -> 'user_metadata' ->> 'sub')
    and e.despedido_at is null
  order by public.rango_nivel(e.rank) desc
  limit 1
$$;

-- 3) Tarjeta de sesión (nombre y rango): el personaje de rango más alto.
drop function if exists public.mi_perfil();
create function public.mi_perfil()
returns table (name text, surname text, rank text)
language sql
stable
security definer
set search_path = public
as $$
  select e.name::text, e.surname::text, e.rank::text
  from public.employees e
  where coalesce(e.discord, '') <> ''
    and e.discord = coalesce(auth.jwt() -> 'user_metadata' ->> 'provider_id', auth.jwt() -> 'user_metadata' ->> 'sub')
    and e.despedido_at is null
  order by public.rango_nivel(e.rank) desc
  limit 1
$$;
grant execute on function public.mi_perfil() to authenticated;
