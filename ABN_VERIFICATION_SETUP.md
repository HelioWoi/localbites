# ABN Verification Setup Guide

## 🎯 Overview

Sistema de verificação automática de negócios australianos usando ABN Lookup API. Valida ABN, nome do negócio e status ativo antes de permitir cadastro de partners.

---

## 🔧 Setup Instructions

### **1. Obter ABN Lookup API GUID**

A API do Australian Business Register é **GRATUITA** mas requer registro:

1. Acesse: https://abr.business.gov.au/Tools/WebServices
2. Clique em "Register for a Web Services GUID"
3. Preencha o formulário com seus dados
4. Você receberá um GUID por email (formato: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)

### **2. Configurar Edge Function no Supabase**

```bash
# Deploy da Edge Function
cd supabase/functions
supabase functions deploy verify-abn --no-verify-jwt
```

### **3. Adicionar GUID nas Environment Variables**

No Supabase Dashboard:
1. Vá em **Settings** → **Edge Functions**
2. Adicione a variável:
   - **Name:** `ABN_LOOKUP_GUID`
   - **Value:** Seu GUID da ABN Lookup API

### **4. Adicionar Campos na Tabela `partners`**

Execute no SQL Editor do Supabase:

```sql
-- Adicionar campos de verificação de negócio
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS abn VARCHAR(11),
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS gst_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Criar índice para busca rápida por ABN
CREATE INDEX IF NOT EXISTS idx_partners_abn ON partners(abn);

-- Adicionar constraint para garantir ABN único
ALTER TABLE partners 
ADD CONSTRAINT unique_abn UNIQUE (abn);
```

---

## 🎬 Como Funciona

### **Fluxo de Signup:**

1. **User acessa `/partner` e clica "Start Free Trial"**

2. **Modal pede:**
   - Restaurant Name
   - ABN (Australian Business Number)
   - Email
   - Password

3. **Sistema verifica automaticamente:**
   ```
   ✓ ABN tem 11 dígitos?
   ✓ ABN existe no registro australiano?
   ✓ ABN está ativo?
   ✓ Nome do negócio corresponde ao registrado?
   ```

4. **Se aprovado:**
   - ✅ Cria conta Supabase Auth
   - ✅ Cria registro em `partners` com:
     - `restaurant_name`: Nome oficial registrado
     - `abn`: ABN verificado
     - `entity_type`: Tipo de entidade (Company, Trust, etc)
     - `gst_registered`: Se tem GST
     - `is_verified`: true
   - ✅ Inicia trial de 14 dias
   - ✅ Redireciona para onboarding

5. **Se rejeitado:**
   - ❌ Mostra mensagem de erro específica:
     - "ABN not found or invalid"
     - "ABN is not active"
     - "Business name does not match. Registered as: [Nome Oficial]"

---

## 📊 Exemplos de Uso

### **Exemplo 1: Cadastro Válido**

```
Input:
- Restaurant Name: "Helio's Bar"
- ABN: "33 234 268 637"

API Response:
✓ ABN válido e ativo
✓ Nome registrado: "HELIO'S BAR PTY LTD"
✓ Match: 85% similarity
✓ Aprovado!

Result:
- Conta criada
- restaurant_name: "HELIO'S BAR PTY LTD"
- is_verified: true
```

### **Exemplo 2: ABN Inválido**

```
Input:
- Restaurant Name: "Fake Restaurant"
- ABN: "11 111 111 111"

API Response:
❌ ABN not found

Result:
- Cadastro bloqueado
- Mensagem: "ABN not found or invalid"
```

### **Exemplo 3: Nome Não Corresponde**

```
Input:
- Restaurant Name: "Pizza Place"
- ABN: "33 234 268 637" (ABN do Helio's Bar)

API Response:
✓ ABN válido
❌ Nome não corresponde
- Registrado como: "HELIO'S BAR PTY LTD"

Result:
- Cadastro bloqueado
- Mensagem: "Business name does not match. Registered as: HELIO'S BAR PTY LTD"
```

---

## 🔒 Segurança

### **Proteções Implementadas:**

1. ✅ **ABN Lookup API protegida via Edge Function**
   - GUID nunca exposto no client
   - Todas as chamadas passam pelo servidor

2. ✅ **Validação em múltiplas camadas:**
   - Frontend: Formato do ABN (11 dígitos)
   - Backend: Verificação com API oficial
   - Database: Constraint de ABN único

3. ✅ **Prevenção de fraudes:**
   - ABN deve existir no registro australiano
   - ABN deve estar ativo
   - Nome do negócio deve corresponder (60%+ similarity)

4. ✅ **Marcação de verificação:**
   - Campo `is_verified: true` para partners aprovados
   - Pode ser usado para badge "Verified Business"

---

## 🧪 Testando

### **ABNs de Teste (Reais):**

Você pode testar com ABNs públicos de empresas conhecidas:

```
Google Australia:
- ABN: 88 102 417 032
- Nome: GOOGLE AUSTRALIA PTY LIMITED

Woolworths:
- ABN: 88 000 014 675
- Nome: WOOLWORTHS GROUP LIMITED
```

### **Teste Manual:**

1. Acesse: http://localhost:3000/partner
2. Clique "Start free trial"
3. Preencha:
   - Restaurant Name: "Google Australia"
   - ABN: "88 102 417 032"
   - Email: test@test.com
   - Password: test123
4. Clique "Start free trial"
5. Aguarde verificação (2-3 segundos)
6. Deve mostrar: ✓ Business Verified

---

## 📝 Notas Importantes

### **Limitações da API:**

- **Gratuita** mas requer registro
- **Rate limit:** Não especificado oficialmente, mas razoável para uso normal
- **Dados públicos:** Apenas informações públicas do ABR

### **Matching de Nomes:**

O sistema usa **Levenshtein distance** para comparar nomes:
- Permite variações (Pty Ltd, PTY LTD, etc)
- Aceita nomes parciais
- Threshold: 60% de similaridade

### **Campos Opcionais:**

Estes campos são salvos mas não obrigatórios:
- `entity_type`: Tipo de entidade (Company, Trust, Individual, etc)
- `gst_registered`: Se o negócio tem GST registration

---

## 🚀 Próximos Passos

### **Melhorias Futuras:**

1. **Badge "Verified Business"**
   - Mostrar selo verde no feed
   - Aumentar confiança dos usuários

2. **Re-verificação Periódica**
   - Verificar ABN a cada 6 meses
   - Alertar se ABN ficar inativo

3. **Dashboard Admin**
   - Ver lista de partners verificados
   - Estatísticas de verificação

4. **Moderação de Conteúdo**
   - AI para detectar vídeos impróprios
   - Sistema de denúncias

---

## ❓ Troubleshooting

### **Erro: "ABN verification service not configured"**
- Verifique se `ABN_LOOKUP_GUID` está configurado no Supabase
- Redeploy da Edge Function

### **Erro: "Error verifying ABN"**
- Verifique conexão com internet
- Teste ABN manualmente em: https://abr.business.gov.au/
- Verifique logs da Edge Function

### **Cadastro bloqueado mesmo com ABN válido:**
- Verifique se nome do restaurante é similar ao registrado
- Tente usar nome oficial completo
- Verifique se ABN está ativo

---

## 📞 Suporte

Para problemas com a ABN Lookup API:
- Email: webservices@abr.gov.au
- Website: https://abr.business.gov.au/Help/WebServices

---

**Sistema implementado e pronto para uso!** 🎉
