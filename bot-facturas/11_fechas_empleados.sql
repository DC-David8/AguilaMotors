-- Aguila Motors · Fechas de cada empleado: ingreso al taller y contratación
-- Pega todo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- (Necesita antes el 10_historial_empleados.sql.)
--
-- alta_at        = fecha de INGRESO al taller (su primer día; no cambia aunque
--                  le despidan y le readmitan).
-- contratado_at  = fecha de CONTRATACIÓN (la del contrato actual; al readmitir
--                  se pone la del día de la readmisión).
-- Las dos son solo fecha (sin hora). Los que ya están quedan vacíos para que el
-- Jefe Aguila ponga sus fechas reales en «Editar datos».

alter table public.employees add column if not exists alta_at date;

-- Si alta_at venía del SQL 10 como fecha y hora, se pasa a solo fecha (hora de Guatemala).
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'employees' and column_name = 'alta_at') <> 'date' then
    alter table public.employees alter column alta_at drop default;
    alter table public.employees alter column alta_at type date
      using (alta_at at time zone 'America/Guatemala')::date;
  end if;
end $$;
alter table public.employees alter column alta_at set default current_date;

alter table public.employees add column if not exists contratado_at date;
alter table public.employees alter column contratado_at set default current_date;
