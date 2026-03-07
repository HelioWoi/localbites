# Activation Recovery System - MenuLove

Sistema automático de recuperação de cadastros não confirmados para aumentar a taxa de ativação de novos parceiros.

---

## 📋 **VISÃO GERAL**

Quando um parceiro cria uma conta mas não confirma o email, o sistema envia automaticamente uma sequência de emails de recuperação para incentivá-lo a completar o cadastro.

---

## 📧 **FLUXO DE EMAILS**

| Tempo | Email | Objetivo | Remetente |
|-------|-------|----------|-----------|
| **10 min** | Email 1 | Reforçar confirmação | MenuLove Team |
| **12 horas** | Email 2 | Lembrar e reduzir fricção | MenuLove Team |
| **24 horas** | Email 3 | Mostrar valor | Helio Woi, MenuLove |
| **48 horas** | Email 4 | Criar urgência | MenuLove Team |
| **72 horas** | Email 5 | Toque humano e oferta de ajuda | Helio Woi, Founder - MenuLove |

---

## 🎯 **CONTEÚDO DOS EMAILS**

### **Email 1 - 10 minutos**
- **Subject:** "Please confirm your email to activate your MenuLove dashboard"
- **Objetivo:** Reforçar a necessidade de confirmar email
- **CTA:** "Confirm My Email"
- **Destaque:** 30 dias de trial grátis após confirmação

### **Email 2 - 12 horas**
- **Subject:** "Your MenuLove dashboard is waiting for you"
- **Objetivo:** Mostrar que outros restaurantes já usam
- **CTA:** "Activate My Account"
- **Destaque:** Benefícios sociais (outros cafés/restaurantes usando)

### **Email 3 - 24 horas**
- **Subject:** "Your video menu could already be live"
- **Objetivo:** Mostrar o que está perdendo
- **CTA:** "Activate My Account Now"
- **Destaque:** TikTok-style menu, QR code, analytics

### **Email 4 - 48 horas**
- **Subject:** "Do you still want your MenuLove account?"
- **Objetivo:** Criar urgência (conta pode ser removida)
- **CTA:** "Confirm My Email"
- **Destaque:** Segurança da plataforma

### **Email 5 - 72 horas (Pessoal)**
- **Subject:** "Quick question about your MenuLove account"
- **Objetivo:** Toque humano, oferta de ajuda pessoal
- **CTA:** "Activate My Account"
- **Destaque:** Ajuda pessoal do fundador, sem compromisso
- **Assinatura:** Helio Woi, Founder - MenuLove

---

## 🛠️ **ARQUITETURA TÉCNICA**

### **1. Tabela: `activation_emails`**

Rastreia quais emails já foram enviados para evitar duplicatas.

```sql
CREATE TABLE activation_emails (
  id UUID PRIMARY KEY,
  partner_id UUID REFERENCES partners(id),
  email_type TEXT, -- '10min', '12h', '24h', '48h', '72h'
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
);
```

### **2. Edge Function: `send-activation-reminder`**

Envia um email de ativação específico usando Resend API.

**Input:**
```json
{
  "partner": {
    "id": "uuid",
    "email": "partner@example.com",
    "restaurant_name": "Restaurant Name"
  },
  "emailType": "10min" | "12h" | "24h" | "48h" | "72h"
}
```

**Output:**
```json
{
  "success": true,
  "messageId": "resend-message-id",
  "partner": "Restaurant Name",
  "emailType": "10min"
}
```

### **3. Edge Function: `check-unconfirmed-accounts`**

Roda a cada hora via cron job e verifica contas não confirmadas.

**Lógica:**
1. Busca todos os parceiros com `email_confirmed = false`
2. Calcula tempo desde criação da conta
3. Determina qual email enviar baseado no tempo
4. Verifica se email já foi enviado (tabela `activation_emails`)
5. Envia email via `send-activation-reminder`
6. Registra envio na tabela `activation_emails`

**Regras de Timing:**
- **10 min - 12h:** Envia email "10min"
- **12h - 24h:** Envia email "12h"
- **24h - 48h:** Envia email "24h"
- **48h - 72h:** Envia email "48h"
- **72h+:** Envia email "72h"

### **4. Cron Job**

```sql
SELECT cron.schedule(
  'hourly-activation-check',
  '0 * * * *',  -- Every hour
  $$ SELECT net.http_post(...) $$
);
```

---

## 📊 **MONITORAMENTO**

### **Verificar Emails Enviados**

```sql
SELECT 
  p.restaurant_name,
  p.email,
  p.created_at,
  ae.email_type,
  ae.sent_at
FROM partners p
LEFT JOIN activation_emails ae ON ae.partner_id = p.id
WHERE p.email_confirmed = false
ORDER BY p.created_at DESC;
```

### **Verificar Cron Job**

```sql
SELECT * FROM cron.job WHERE jobname = 'hourly-activation-check';
```

### **Logs da Edge Function**

Acesse: **Supabase Dashboard → Edge Functions → check-unconfirmed-accounts → Logs**

---

## 🧪 **TESTES**

### **Teste Manual - Enviar Email Específico**

```sql
SELECT
  net.http_post(
    url := 'https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/send-activation-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object(
      'partner', jsonb_build_object(
        'id', 'partner-uuid',
        'email', 'test@example.com',
        'restaurant_name', 'Test Restaurant'
      ),
      'emailType', '10min'
    )
  ) as request_id;
```

### **Teste Manual - Rodar Check Completo**

```sql
SELECT
  net.http_post(
    url := 'https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/check-unconfirmed-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) as request_id;
```

---

## 📈 **MÉTRICAS ESPERADAS**

- **Taxa de Abertura:** 40-60%
- **Taxa de Clique:** 15-25%
- **Taxa de Conversão (confirmação):** 20-35%
- **Email mais efetivo:** Geralmente o email pessoal (72h)

---

## 🔧 **MANUTENÇÃO**

### **Adicionar Novo Email ao Fluxo**

1. Adicionar novo `emailType` na Edge Function `send-activation-reminder`
2. Adicionar lógica de timing na Edge Function `check-unconfirmed-accounts`
3. Testar manualmente antes de deploy

### **Ajustar Timing dos Emails**

Editar a lógica em `check-unconfirmed-accounts/index.ts`:

```typescript
if (minutesSinceCreation >= 10 && minutesSinceCreation < 720) {
  emailType = '10min';
} else if (hoursSinceCreation >= 12 && hoursSinceCreation < 24) {
  emailType = '12h';
}
// ... etc
```

### **Desabilitar Sistema Temporariamente**

```sql
-- Desabilitar cron job
SELECT cron.unschedule('hourly-activation-check');

-- Reabilitar
SELECT cron.schedule(...); -- usar SQL completo acima
```

---

## ⚠️ **IMPORTANTE**

1. **Reply-to:** Todos os emails têm `reply_to: contact@menulove.com.au`
2. **From Name:**
   - Emails 1, 2, 4: "MenuLove Team"
   - Emails 3, 5: "Helio Woi" (pessoal)
3. **Resend API:** Requer `RESEND_API_KEY` configurada nas Edge Functions
4. **Service Role Key:** Necessária para cron job funcionar

---

## 📝 **CHANGELOG**

- **2026-03-07:** Sistema criado e deployed
  - 5 emails no fluxo de recuperação
  - Cron job horário configurado
  - Tabela `activation_emails` criada
  - Edge Functions deployed

---

## 🆘 **TROUBLESHOOTING**

### **Emails não estão sendo enviados**

1. Verificar logs da Edge Function `check-unconfirmed-accounts`
2. Verificar se cron job está ativo: `SELECT * FROM cron.job`
3. Verificar se `RESEND_API_KEY` está configurada
4. Testar manualmente com SQL acima

### **Emails duplicados**

1. Verificar constraint `idx_activation_emails_unique`
2. Verificar lógica de verificação em `check-unconfirmed-accounts`

### **Cron job não está rodando**

1. Verificar se `pg_net` está habilitado: `SELECT * FROM pg_extension WHERE extname = 'pg_net'`
2. Verificar se `service_role_key` está configurada corretamente
3. Verificar logs do Supabase Dashboard

---

**Sistema desenvolvido para MenuLove - Video Menus & Smart Discovery**
