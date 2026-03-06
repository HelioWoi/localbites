# Cron Job Setup - Expiration Reminders

## 📧 Sistema de Notificações de Expiração

Este documento explica como configurar o cron job para enviar emails automáticos de aviso quando o trial ou subscription está perto de vencer.

---

## 🎯 Funcionalidade

**Emails enviados automaticamente:**
- ✅ 10 dias antes de vencer
- ✅ 5 dias antes de vencer
- ✅ 3 dias antes de vencer
- ✅ 2 dias antes de vencer
- ✅ 1 dia antes de vencer
- ✅ Quando expira (dia 0)

**Comportamento:**
- Verifica diariamente todos os partners
- Envia email apenas uma vez por tipo de reminder
- Tracking na tabela `expiration_reminders` para evitar duplicados

---

## ⚙️ Configuração do Cron Job no Supabase

### Opção 1: Via Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/quybuvapflnzcaedjbkl/database/cron-jobs

2. Clique em "Create a new cron job"

3. Configure:
   - **Name:** `check-expiring-subscriptions-daily`
   - **Schedule:** `0 9 * * *` (Todo dia às 9h AM, horário de Sydney)
   - **Command:**
     ```sql
     SELECT
       net.http_post(
         url := 'https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/check-expiring-subscriptions',
         headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
         body := '{}'::jsonb
       ) as request_id;
     ```

4. Clique em "Create cron job"

---

### Opção 2: Via SQL Editor

Execute este SQL no Supabase SQL Editor:

```sql
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to check expiring subscriptions daily at 9 AM Sydney time
SELECT cron.schedule(
  'check-expiring-subscriptions-daily',
  '0 9 * * *', -- Every day at 9 AM
  $$
  SELECT
    net.http_post(
      url := 'https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/check-expiring-subscriptions',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

---

## 🧪 Testar Manualmente

Para testar o sistema sem esperar o cron job:

1. Acesse: https://supabase.com/dashboard/project/quybuvapflnzcaedjbkl/functions

2. Selecione `check-expiring-subscriptions`

3. Clique em "Invoke function"

4. Body: `{}`

5. Clique em "Send request"

6. Verifique os logs para ver quais emails foram enviados

---

## 📊 Verificar Cron Jobs Ativos

```sql
-- Ver todos os cron jobs
SELECT * FROM cron.job;

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🗑️ Remover Cron Job (se necessário)

```sql
-- Listar jobs
SELECT jobid, jobname, schedule FROM cron.job;

-- Remover job específico
SELECT cron.unschedule('check-expiring-subscriptions-daily');
```

---

## 📧 Templates de Email

Os emails são enviados com templates diferentes baseado nos dias restantes:

### 10 dias
- **Cor:** Azul (#3b82f6)
- **Tom:** Informativo
- **Mensagem:** "Your 30-day free trial will end in 10 days"

### 5 dias
- **Cor:** Âmbar (#f59e0b)
- **Tom:** Aviso
- **Mensagem:** "Your trial expires in just 5 days"

### 3 dias
- **Cor:** Laranja (#f97316)
- **Tom:** Urgente
- **Mensagem:** "Time is running out! Your trial ends in 3 days"

### 2 dias
- **Cor:** Vermelho (#ef4444)
- **Tom:** Crítico
- **Mensagem:** "Your trial is almost over! Only 2 days left"

### 1 dia
- **Cor:** Vermelho Escuro (#dc2626)
- **Tom:** Último aviso
- **Mensagem:** "This is your final reminder! Your trial ends tomorrow"

### Expirado
- **Cor:** Cinza (#6b7280)
- **Tom:** Informativo
- **Mensagem:** "Your trial has ended. Your restaurant is now hidden from customers"

---

## 🔍 Monitoramento

### Ver emails enviados:
```sql
SELECT 
  p.restaurant_name,
  er.reminder_type,
  er.sent_at,
  er.expiration_date
FROM expiration_reminders er
JOIN partners p ON p.id = er.partner_id
ORDER BY er.sent_at DESC
LIMIT 20;
```

### Ver partners que vão expirar em breve:
```sql
SELECT 
  restaurant_name,
  email,
  trial_ends_at,
  subscription_end_date,
  CASE 
    WHEN subscription_status = 'active' AND subscription_end_date IS NOT NULL 
      THEN EXTRACT(DAY FROM (subscription_end_date - NOW()))
    WHEN trial_ends_at IS NOT NULL 
      THEN EXTRACT(DAY FROM (trial_ends_at - NOW()))
  END as days_left
FROM partners
WHERE lifetime_access = false
  AND (
    (subscription_status = 'active' AND subscription_end_date > NOW())
    OR trial_ends_at > NOW()
  )
ORDER BY days_left ASC;
```

---

## ⚠️ Troubleshooting

### Emails não estão sendo enviados:

1. **Verificar se cron job está ativo:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'check-expiring-subscriptions-daily';
   ```

2. **Verificar logs do cron job:**
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-expiring-subscriptions-daily')
   ORDER BY start_time DESC 
   LIMIT 5;
   ```

3. **Verificar se RESEND_API_KEY está configurada:**
   - Supabase Dashboard → Settings → Edge Functions
   - Verificar se `RESEND_API_KEY` existe

4. **Testar Edge Function manualmente:**
   - Invoke `check-expiring-subscriptions` via dashboard
   - Verificar logs para erros

---

## 📝 Notas Importantes

- **Horário:** Cron job roda às 9h AM (horário de Sydney)
- **Frequência:** Uma vez por dia
- **Duplicados:** Sistema previne envio de emails duplicados via tabela `expiration_reminders`
- **Prioridade:** Subscription ativa tem prioridade sobre trial
- **Lifetime Access:** Partners com lifetime access são ignorados

---

## 🚀 Próximos Passos

Após configurar o cron job:

1. ✅ Aplicar migration da tabela `expiration_reminders`
2. ✅ Configurar cron job (via dashboard ou SQL)
3. ✅ Testar manualmente uma vez
4. ✅ Monitorar logs nas primeiras execuções
5. ✅ Verificar se emails estão chegando corretamente

---

**Configuração completa!** O sistema vai enviar emails automaticamente todos os dias às 9h AM.
