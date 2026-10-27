-- Aguila Motors · Permisos de Compraventa
--   · Almacén (y Catálogo en la página): Jefes y empleados desde Experimentado.
--   · Historial completo de compras y ventas: solo el Jefe Aguila.
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

-- Rango del que ha iniciado sesión (por su ID de Discord; los despedidos no cuentan).
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
  limit 1
$$;

create or replace function public.puede_compraventa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select public.es_jefe()), false)
      or coalesce((select public.mi_rango()) in ('Experimentado', 'Subjefe'), false)
$$;

-- Vehículos en el almacén: último movimiento de cada matrícula = compra de la empresa.
create or replace function public.almacen_v2()
returns table (uid text, ts text, sort text, mediator text, owner text, buyer text,
               price numeric, model text, plate text, company text, photo text)
language sql
stable
security definer
set search_path = public
as $$
  with ultimo as (
    select distinct on (t.plate) t.*
    from public.cv_tx t
    order by t.plate, t.sort desc nulls first, t.uid desc
  )
  select u.uid::text, u.ts::text, u.sort::text, u.mediator::text, u.owner::text, u.buyer::text,
         u.price::numeric, u.model::text, u.plate::text, u.company::text, p.path::text
  from ultimo u
  left join public.cv_photos p on p.plate = u.plate
  where (select public.puede_compraventa())
    and coalesce(u.buyer, '') ilike 'society\_%'
    and coalesce(u.owner, '') not ilike 'society\_%'
$$;

grant execute on function public.almacen_v2() to authenticated;

-- La función antigua ya no se usa: nadie la puede llamar desde fuera.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'almacen' and pronamespace = 'public'::regnamespace) then
    execute 'revoke execute on function public.almacen() from public, anon, authenticated';
  end if;
end $$;

-- El historial (tabla cv_tx) solo lo lee el Jefe Aguila. Se añade como regla
-- restrictiva: se suma a las que ya había sin tocarlas.
drop policy if exists "cv_tx solo jefe aguila lee" on public.cv_tx;
create policy "cv_tx solo jefe aguila lee" on public.cv_tx
  as restrictive
  for select
  to anon, authenticated
  using ((select public.es_jefe_aguila()));
