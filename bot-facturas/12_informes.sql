-- Aguila Motors · Registro de informes de inspección (sección 🛡️ Informes)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- Solo el Jefe Aguila los ve, crea, cambia y borra (función es_jefe_aguila).

create table if not exists public.informes (
  id          text primary key,              -- id interno del informe
  numero      text,                          -- INSP-2026-0013 (al emitir); vacío en borradores
  anio        int,
  correlativo int,
  estado      text not null default 'borrador', -- borrador | emitido
  tipo        text not null,                 -- nitro, danos, incautado, modificaciones, grua, presupuesto
  agencia     text,                          -- FBI, LSPD, LSSD, Particular
  placa       text,
  vehiculo    text,
  matricula   text,
  resultado   text,
  codigo      text unique,                   -- código de verificación (AM-XXXX-XXXX)
  datos       jsonb not null default '{}'::jsonb, -- todo el formulario (incluida la captura)
  creado_por  text,
  created_at  timestamptz not null default now(),
  emitido_at  timestamptz,
  updated_at  timestamptz not null default now()
);

create unique index if not exists informes_numero_idx on public.informes (numero) where numero is not null;
create index if not exists informes_matricula_idx on public.informes (matricula);

alter table public.informes enable row level security;

drop policy if exists "informes jefe aguila" on public.informes;
create policy "informes jefe aguila" on public.informes
  for all to authenticated
  using ((select public.es_jefe_aguila()))
  with check ((select public.es_jefe_aguila()));
