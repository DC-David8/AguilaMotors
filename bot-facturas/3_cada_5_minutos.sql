-- Aguila Motors · Bot de facturas (paso 3, opcional si usas Integrations → Cron)
-- Ejecuta la función leer-logs cada 5 minutos.
-- Cambia TU-PROYECTO solo si tu URL de Supabase es distinta.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('aguila-leer-logs')
where exists (select 1 from cron.job where jobname = 'aguila-leer-logs');

select cron.schedule(
  'aguila-leer-logs',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://tguizsunuekxqfgiclfq.supabase.co/functions/v1/leer-logs',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
