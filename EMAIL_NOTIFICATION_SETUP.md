# Email Notifications Setup - Novos Parceiros

## 🎯 **O QUE FOI CRIADO:**

Sistema automático de notificação por email quando novos parceiros se cadastrarem.

**Seu email:** heliocwoi@gmail.com

---

## ⚠️ **IMPORTANTE - LIMITAÇÃO DO SUPABASE:**

O Supabase **NÃO tem serviço de email integrado**. A Edge Function que criei apenas **loga** as informações no console.

Para **REALMENTE ENVIAR EMAILS**, você precisa integrar com um provedor de email:
- **Resend** (Recomendado) - 100 emails grátis/mês
- **SendGrid** - 100 emails grátis/dia
- **Mailgun** - 5,000 emails grátis/mês

---

## 🚀 **SETUP RÁPIDO (2 PASSOS):**

### **1. Deploy da Edge Function**

No terminal, execute:

```bash
cd /Users/heliowoi/Documents/local-bites
npx supabase functions deploy notify-new-partner --no-verify-jwt
```

### **2. Executar SQL no Supabase**

1. Acesse: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de: `/supabase/migrations/create_partner_notification_trigger.sql`
4. **IMPORTANTE:** Substitua a URL na linha 7:
   ```sql
   url := 'https://SEU-PROJECT-ID.supabase.co/functions/v1/notify-new-partner',
   ```
   Troque `SEU-PROJECT-ID` pelo ID do seu projeto Supabase

5. Execute o SQL

---

## ✅ **COMO TESTAR:**

1. Cadastre um novo partner no app
2. Vá no Supabase Dashboard → **Edge Functions** → **notify-new-partner** → **Logs**
3. Você verá algo como:
   ```
   🎉 New Partner Signup!
   Restaurant: Novo Restaurante
   Email: teste@email.com
   Time: February 5, 2026 at 9:50 PM
   Sending notification to: heliocwoi@gmail.com
   ```

---

## 📧 **PARA ENVIAR EMAILS DE VERDADE:**

### **Opção A - Resend (Recomendado)**

1. Crie conta em: https://resend.com
2. Pegue sua API Key
3. Adicione no Supabase:
   - Dashboard → Settings → Secrets
   - Nome: `RESEND_API_KEY`
   - Valor: sua API key

4. Atualize a Edge Function:

```typescript
// Adicione no início do arquivo
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// Substitua o console.log por:
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'LocalBites <noreply@localbites.com>',
    to: [ADMIN_EMAIL],
    subject: `🎉 New Partner: ${partnerName}`,
    html: `
      <h2>New Partner Signup!</h2>
      <p><strong>Restaurant:</strong> ${partnerName}</p>
      <p><strong>Email:</strong> ${partnerEmail}</p>
      <p><strong>Time:</strong> ${createdAt}</p>
      <br>
      <a href="https://localbites.com/admin">View in Admin Dashboard</a>
    `
  })
})
```

5. Re-deploy:
   ```bash
   npx supabase functions deploy notify-new-partner --no-verify-jwt
   ```

---

## 🔍 **TROUBLESHOOTING:**

**Trigger não está funcionando?**
- Verifique se a URL da Edge Function está correta
- Veja os logs no Supabase Dashboard → Database → Functions

**Edge Function não está sendo chamada?**
- Verifique os logs: Dashboard → Edge Functions → notify-new-partner → Logs
- Teste manualmente: Dashboard → Edge Functions → notify-new-partner → Invoke

**Quer testar sem cadastrar novo partner?**
Execute este SQL:
```sql
SELECT notify_new_partner();
```

---

## 📝 **PRÓXIMOS PASSOS:**

1. **Agora:** Deploy da Edge Function + SQL Trigger (funciona com logs)
2. **Depois:** Integrar Resend para emails reais (5 minutos)
3. **Futuro:** Email templates bonitos com HTML

---

## ❓ **DÚVIDAS?**

- **Quanto custa Resend?** 100 emails grátis/mês, depois $0.001 por email
- **Posso usar meu Gmail?** Não recomendado, pode ser bloqueado como spam
- **Funciona em produção?** Sim, mas precisa configurar domínio no Resend

---

**Status Atual:** ⚠️ Apenas logs no console (não envia email real)
**Para enviar emails:** Configure Resend seguindo "Opção A" acima
