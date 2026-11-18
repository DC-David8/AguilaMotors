-- Aguila Motors · Log de empleados en Discord (paso 17)
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
--
-- licencia    = Pendiente / Tiene (se cambia en la ficha del empleado).
-- log_msg_id  = el mensaje de esa persona en el canal del log, para que el
--               bot edite siempre el mismo en vez de publicar otro.

alter table public.employees add column if not exists licencia   text not null default 'Pendiente';
alter table public.employees add column if not exists log_msg_id text;
