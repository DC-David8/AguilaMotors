-- Aguila Motors · Catálogo de vehículos editable
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- Todos los que usan la página lo leen (Caja y Compraventa); solo el Jefe Aguila
-- lo cambia y sube fotos.

create table if not exists public.catalogo (
  id              text primary key,
  nombre          text not null,
  modelo          text,
  precio          numeric,
  categoria       text,
  concesionario   text,
  seccion         text,
  foto            text,
  actualizado_at  timestamptz not null default now(),
  actualizado_por text
);

alter table public.catalogo enable row level security;

drop policy if exists "catalogo todos leen" on public.catalogo;
create policy "catalogo todos leen" on public.catalogo
  for select to anon, authenticated using (true);

drop policy if exists "catalogo aguila crea" on public.catalogo;
create policy "catalogo aguila crea" on public.catalogo
  for insert to authenticated with check ((select public.es_jefe_aguila()));

drop policy if exists "catalogo aguila cambia" on public.catalogo;
create policy "catalogo aguila cambia" on public.catalogo
  for update to authenticated using ((select public.es_jefe_aguila())) with check ((select public.es_jefe_aguila()));

drop policy if exists "catalogo aguila borra" on public.catalogo;
create policy "catalogo aguila borra" on public.catalogo
  for delete to authenticated using ((select public.es_jefe_aguila()));

-- Fotos del catálogo: carpeta pública (son fotos de concesionario), solo el Jefe Aguila sube o borra.
insert into storage.buckets (id, name, public)
values ('catalogo-fotos', 'catalogo-fotos', true)
on conflict (id) do update set public = true;

drop policy if exists "catalogo-fotos aguila sube" on storage.objects;
create policy "catalogo-fotos aguila sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalogo-fotos' and (select public.es_jefe_aguila()));

drop policy if exists "catalogo-fotos aguila cambia" on storage.objects;
create policy "catalogo-fotos aguila cambia" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalogo-fotos' and (select public.es_jefe_aguila()));

drop policy if exists "catalogo-fotos aguila borra" on storage.objects;
create policy "catalogo-fotos aguila borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalogo-fotos' and (select public.es_jefe_aguila()));
