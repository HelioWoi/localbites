# Team Invitation System - Setup Guide

## 📋 Overview

Sistema completo de convite por email para novos membros da equipe admin com criação de senha e instruções de login.

---

## 🗄️ 1. Database Setup

Execute este SQL no Supabase SQL Editor:

```sql
-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  invited_by TEXT,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster token lookups
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything
CREATE POLICY "Service role can manage invitations"
ON team_invitations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to read their own invitations
CREATE POLICY "Users can read their invitations"
ON team_invitations
FOR SELECT
TO authenticated
USING (email = auth.jwt()->>'email');
```

---

## 🔧 2. Edge Function Deployment

Deploy the invitation email Edge Function:

```bash
cd supabase/functions
supabase functions deploy send-team-invitation --no-verify-jwt
```

---

## 🔑 3. Environment Variables

Add to Supabase Edge Function secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**Nota:** RESEND_API_KEY já deve estar configurado se você já usa Resend.

---

## 📧 4. Email Template

O email enviado inclui:
- ✅ Branding MenuLove
- ✅ Link único de ativação (expira em 7 dias)
- ✅ Instruções claras de setup
- ✅ Design responsivo HTML
- ✅ Fallback texto plano

**Assunto:** "You're invited to MenuLove Admin Panel"

**De:** noreply@menulove.com.au

---

## 🔄 5. Fluxo Completo

```
1. Admin adiciona email na aba Team
   ↓
2. Sistema cria registro em super_admins
   ↓
3. Edge Function envia email via Resend
   ↓
4. Email contém link: /admin/setup?token=xxx
   ↓
5. User clica no link
   ↓
6. Página AdminSetup valida token
   ↓
7. User cria senha
   ↓
8. Sistema cria auth user (Supabase Auth)
   ↓
9. Token marcado como usado
   ↓
10. Redirect para /admin (login)
```

---

## 🧪 6. Testing

### Teste Manual:

1. Acesse Admin Dashboard → Team
2. Adicione um email de teste
3. Verifique se email foi recebido
4. Clique no link do email
5. Crie senha na página de setup
6. Faça login no /admin

### Verificar no Database:

```sql
-- Ver convites pendentes
SELECT * FROM team_invitations WHERE used = false;

-- Ver convites usados
SELECT * FROM team_invitations WHERE used = true;

-- Ver membros da equipe
SELECT * FROM super_admins ORDER BY created_at DESC;
```

---

## 🔒 7. Security Features

- ✅ Token único UUID v4
- ✅ Expiração de 7 dias
- ✅ Token usado apenas uma vez
- ✅ RLS policies habilitadas
- ✅ Validação de email
- ✅ Senha mínima 8 caracteres
- ✅ Supabase Auth integration

---

## 🎨 8. UI Components

### Admin Dashboard - Team Tab
- Input de email
- Botão "Add Team Member"
- Lista de membros com badge "You"
- Botão "Remove" (não pode remover a si mesmo)

### Setup Page (/admin/setup)
- Validação de token
- Display do email
- Input de senha com toggle show/hide
- Confirmação de senha
- Instruções de login
- Mensagens de erro claras
- Success screen com redirect

---

## 📝 9. Error Handling

### Possíveis Erros:

1. **"Invalid invitation link"**
   - Token não existe no banco
   - Token expirado
   - Token já usado

2. **"Failed to send email"**
   - Resend API key inválida
   - Email inválido
   - Limite de emails atingido

3. **"Email already registered"**
   - Email já existe em super_admins
   - Código de erro: 23505

---

## 🚀 10. Deploy Checklist

- [ ] SQL executado no Supabase
- [ ] Edge Function deployed
- [ ] RESEND_API_KEY configurada
- [ ] Teste de envio de email
- [ ] Teste de criação de senha
- [ ] Teste de login
- [ ] Verificar RLS policies
- [ ] Commit no Git

---

## 📧 11. Email Configuration

**Resend Configuration:**
- Domain: menulove.com.au
- From: noreply@menulove.com.au
- Subject: You're invited to MenuLove Admin Panel

**Template Variables:**
- `email`: Email do convidado
- `setupUrl`: Link de setup com token
- `invitedBy`: Email de quem convidou

---

## 🔄 12. Future Improvements

- [ ] Resend invitation se expirado
- [ ] Notificação quando membro aceita convite
- [ ] Histórico de convites enviados
- [ ] Bulk invite (múltiplos emails)
- [ ] Custom expiration time
- [ ] Email customizável por admin

---

## 📞 13. Support

Se houver problemas:

1. Verificar logs da Edge Function no Supabase
2. Verificar se email foi enviado no Resend Dashboard
3. Verificar se token existe no banco
4. Verificar RLS policies
5. Verificar console do browser para erros

---

**Implementado em:** 9 de Março de 2026
**Versão:** 1.0
**Status:** ✅ Pronto para produção
