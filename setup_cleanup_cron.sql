-- Execute este SQL no Supabase Dashboard → SQL Editor
-- Configura um cron job para executar a limpeza de itens deletados diariamente

-- Habilitar a extensão pg_cron se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar o cron job para executar todos os dias às 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-deleted-menu-items',  -- Nome do job
  '0 3 * * *',                   -- Cron expression: 3:00 AM todos os dias
  $$
  SELECT
    net.http_post(
      url:='https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/cleanup-deleted-items',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);

-- Verificar se o cron job foi criado
SELECT * FROM cron.job WHERE jobname = 'cleanup-deleted-menu-items';
