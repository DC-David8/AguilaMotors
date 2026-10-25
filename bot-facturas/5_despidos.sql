-- Aguila Motors · Registro de despidos
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- Al despedir no se borra a nadie: se guarda cuándo, quién y por qué, y se le
-- quita el Discord (así pierde el acceso). El Discord queda en discord_previo
-- por si se le readmite.

alter table public.employees add column if not exists despedido_at     timestamptz;
alter table public.employees add column if not exists despedido_por    text;
alter table public.employees add column if not exists despedido_motivo text;
alter table public.employees add column if not exists discord_previo   text;
