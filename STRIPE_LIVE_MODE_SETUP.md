# Stripe Live Mode Setup Guide

## 🎯 Overview

Guia completo para migrar do Stripe Test Mode para Live Mode (produção real).

---

## ⚠️ PRÉ-REQUISITOS

Antes de começar, certifique-se:

- ✅ Dados de teste limpos do Supabase
- ✅ Código commitado e em produção
- ✅ Stripe account verificado e aprovado
- ✅ Business details completos no Stripe
- ✅ Bank account conectado para receber pagamentos

---

## 📋 CHECKLIST DE MIGRAÇÃO

### **PARTE 1: LIMPAR DADOS DE TESTE**

1. **Backup (Opcional)**
   ```sql
   -- Execute no Supabase SQL Editor se quiser backup
   CREATE TABLE partners_backup AS SELECT * FROM partners;
   CREATE TABLE menu_items_backup AS SELECT * FROM menu_items;
   ```

2. **Limpar Dados**
   - Execute o script: `CLEAN_TEST_DATA.sql`
   - Verifique que todas as tabelas estão vazias
   - Limpe Storage bucket `menu-videos` manualmente

3. **Verificar**
   ```sql
   SELECT COUNT(*) FROM partners; -- Deve retornar 0
   SELECT COUNT(*) FROM menu_items; -- Deve retornar 0
   ```

---

### **PARTE 2: CONFIGURAR STRIPE LIVE MODE**

#### **2.1 Ativar Live Mode no Stripe Dashboard**

1. Acesse: https://dashboard.stripe.com
2. Toggle no canto superior direito: **Test Mode → Live Mode**
3. Complete business verification se solicitado

#### **2.2 Criar Live Mode Products e Prices**

**Monthly Plan:**
```
1. Products → Create Product
   - Name: LocalBites Pro - Monthly
   - Description: Monthly subscription for restaurant partners
   - Price: $29 AUD / month
   - Billing period: Monthly
   - Save product
   - Copy Price ID (ex: price_LIVE_XXXXXXXXX)
```

**Annual Plan:**
```
1. Products → Create Product
   - Name: LocalBites Pro - Annual
   - Description: Annual subscription for restaurant partners (2 months free)
   - Price: $290 AUD / year
   - Billing period: Yearly
   - Save product
   - Copy Price ID (ex: price_LIVE_YYYYYYYYY)
```

#### **2.3 Obter Live Mode API Keys**

1. Developers → API Keys
2. **Publishable Key** (começa com `pk_live_...`)
   - Copie este valor
3. **Secret Key** (começa com `sk_live_...`)
   - Copie este valor (NUNCA compartilhe!)

---

### **PARTE 3: ATUALIZAR ENVIRONMENT VARIABLES**

#### **3.1 No Supabase (Edge Functions)**

1. Supabase Dashboard → Settings → Edge Functions
2. Atualize as seguintes secrets:

```
STRIPE_SECRET_KEY = [Your Stripe Live Secret Key]
STRIPE_WEBHOOK_SECRET = [Your Webhook Secret - update after creating webhook]
```

#### **3.2 No Frontend (.env ou Vercel/Netlify)**

Atualize o arquivo `.env` ou variáveis de ambiente da hospedagem:

```env
VITE_STRIPE_PUBLISHABLE_KEY=[Your Stripe Live Publishable Key]
```

**IMPORTANTE:** Não commite o `.env` com keys reais!

---

### **PARTE 4: CONFIGURAR WEBHOOK LIVE**

#### **4.1 Criar Webhook Endpoint**

1. Stripe Dashboard → Developers → Webhooks
2. Clique **"Add endpoint"**
3. **Endpoint URL:**
   ```
   https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/stripe-webhook
   ```
4. **Events to send:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `checkout.session.completed`

5. Clique **"Add endpoint"**

#### **4.2 Obter Webhook Signing Secret**

1. Clique no webhook que você criou
2. Copie o **Signing secret** (começa com `whsec_...`)
3. Atualize no Supabase:
   ```
   STRIPE_WEBHOOK_SECRET = whsec_XXXXXXXXXXXXXXXXXXXXXXXX
   ```

---

### **PARTE 5: ATUALIZAR CÓDIGO**

#### **5.1 Atualizar Price IDs**

Encontre e substitua no código:

**Arquivo:** `screens/partner/SubscriptionManager.tsx`

```typescript
// ANTES (Test Mode)
const MONTHLY_PRICE_ID = 'price_1SwsaOIG1T8Ip1Z0QZUp224w';
const ANNUAL_PRICE_ID = 'price_1SvzdrIG1T8Ip1Z0EQGKZjer';

// DEPOIS (Live Mode)
const MONTHLY_PRICE_ID = 'price_LIVE_XXXXXXXXX'; // Seu Live Price ID
const ANNUAL_PRICE_ID = 'price_LIVE_YYYYYYYYY'; // Seu Live Price ID
```

#### **5.2 Verificar Edge Functions**

Certifique-se que as Edge Functions estão usando as variáveis de ambiente:

```typescript
// supabase/functions/create-checkout-session/index.ts
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

// supabase/functions/stripe-webhook/index.ts
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
```

---

### **PARTE 6: DEPLOY**

#### **6.1 Redeploy Edge Functions**

```bash
cd supabase/functions

# Deploy create-checkout-session
supabase functions deploy create-checkout-session --no-verify-jwt

# Deploy stripe-webhook
supabase functions deploy stripe-webhook --no-verify-jwt
```

#### **6.2 Deploy Frontend**

```bash
# Build production
npm run build

# Deploy to your hosting (Vercel/Netlify/etc)
# Make sure environment variables are updated!
```

---

### **PARTE 7: TESTAR EM PRODUÇÃO**

#### **7.1 Teste de Signup**

1. Acesse: https://www.localbites.com.au/partner
2. Crie uma conta real com seus dados
3. Verifique que trial de 14 dias foi criado
4. Verifique no Supabase que partner foi criado

#### **7.2 Teste de Checkout**

1. No Partner Dashboard, clique "Upgrade to Pro"
2. Escolha Monthly ou Annual
3. Use **cartão real** (será cobrado!)
4. Complete checkout
5. Verifique:
   - ✅ Redirecionamento para dashboard
   - ✅ Status mudou para "active"
   - ✅ Analytics desbloqueado
   - ✅ Email de confirmação recebido

#### **7.3 Teste de Webhook**

1. Stripe Dashboard → Developers → Webhooks
2. Clique no seu webhook
3. Veja "Recent deliveries"
4. Verifique que eventos estão sendo entregues com sucesso (200 OK)

#### **7.4 Teste de Cancelamento**

1. No Partner Dashboard, clique "Manage Subscription"
2. Cancele a subscription
3. Verifique que status mudou para "canceled"
4. Verifique que ainda tem acesso até o fim do período

---

## 🔍 MONITORAMENTO

### **Logs para Monitorar:**

1. **Supabase Logs**
   - Edge Functions logs
   - Database logs

2. **Stripe Dashboard**
   - Payments
   - Subscriptions
   - Webhook deliveries
   - Failed payments

3. **Admin Dashboard**
   - Novos partners
   - Subscription status
   - Revenue metrics

---

## ⚠️ TROUBLESHOOTING

### **Erro: "Invalid API Key"**
- Verifique que está usando `sk_live_...` (não `sk_test_...`)
- Verifique que a key está correta no Supabase

### **Erro: "No such price"**
- Verifique que os Price IDs no código são os Live Mode IDs
- Verifique que os produtos existem no Stripe Live Mode

### **Webhook não está funcionando**
- Verifique que o endpoint URL está correto
- Verifique que `STRIPE_WEBHOOK_SECRET` está atualizado
- Verifique logs da Edge Function `stripe-webhook`

### **Checkout não redireciona**
- Verifique `success_url` e `cancel_url` na Edge Function
- Verifique que o domínio está correto (não localhost)

---

## 📊 MÉTRICAS IMPORTANTES

Monitore estas métricas após ir ao vivo:

- **Conversion Rate:** Trial → Paid
- **Churn Rate:** Cancelamentos / Total subscriptions
- **MRR (Monthly Recurring Revenue):** Total mensal
- **Failed Payments:** Cartões recusados
- **Webhook Success Rate:** Deve ser ~100%

---

## 🎉 CHECKLIST FINAL

Antes de anunciar publicamente:

- [ ] Dados de teste limpos
- [ ] Stripe Live Mode ativado
- [ ] Live Price IDs atualizados no código
- [ ] Environment variables atualizadas
- [ ] Edge Functions deployadas
- [ ] Frontend deployado
- [ ] Webhook configurado e testado
- [ ] Teste completo de signup → checkout → cancelamento
- [ ] Admin Dashboard funcionando
- [ ] Monitoring configurado
- [ ] Backup strategy definida

---

## 🚨 IMPORTANTE

**Você está agora em PRODUÇÃO!**

- Todos os pagamentos são REAIS
- Todos os dados são de CLIENTES REAIS
- Monitore DIARIAMENTE nos primeiros dias
- Responda RAPIDAMENTE a problemas
- Tenha suporte pronto para partners

---

## 📞 SUPORTE

**Stripe Support:**
- Email: support@stripe.com
- Dashboard: https://dashboard.stripe.com/support

**Supabase Support:**
- Discord: https://discord.supabase.com
- Email: support@supabase.io

---

**Boa sorte com o lançamento! 🚀**
