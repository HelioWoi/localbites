# Netlify Environment Variables Setup

## 🔒 SEGURANÇA CRÍTICA

A chave `SUPABASE_ANON_KEY` foi removida do código e agora usa variáveis de ambiente do Netlify.

---

## ⚠️ AÇÃO NECESSÁRIA ANTES DE DEPLOY

Você precisa configurar as variáveis de ambiente no Netlify Dashboard **ANTES** de fazer deploy.

---

## 📋 PASSO A PASSO

### **1. Acesse Netlify Dashboard**
```
https://app.netlify.com/
```

### **2. Selecione o Site MenuLove**
- Clique no site `menulove` (ou nome do seu site)

### **3. Vá em Site Settings**
- No menu lateral, clique em **"Site configuration"** ou **"Site settings"**

### **4. Acesse Environment Variables**
- No menu lateral, clique em **"Environment variables"**
- Ou vá direto: `Site settings > Environment variables`

### **5. Adicione as Variáveis**

Clique em **"Add a variable"** e adicione:

#### **Variável 1: VITE_SUPABASE_URL**
```
Key: VITE_SUPABASE_URL
Value: https://quybuvapflnzcaedjbkl.supabase.co
Scopes: All scopes (Production, Deploy Previews, Branch deploys)
```

#### **Variável 2: VITE_SUPABASE_ANON_KEY**
```
Key: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3OTY4MjAsImV4cCI6MjA1MTM3MjgyMH0.kKMZxPWTqJWZIlkQKQVqQkOjJJfGjNTvNLGJQqNGPjY
Scopes: All scopes (Production, Deploy Previews, Branch deploys)
```

### **6. Salvar**
- Clique em **"Save"** ou **"Add variable"**
- Repita para ambas as variáveis

---

## ✅ VERIFICAÇÃO

Após adicionar as variáveis, você deve ver:

```
Environment variables (2)
├── VITE_SUPABASE_URL
│   └── https://quybuvapflnzcaedjbkl.supabase.co
└── VITE_SUPABASE_ANON_KEY
    └── eyJhbGc... (hidden)
```

---

## 🚀 PRÓXIMOS PASSOS

### **1. Commit e Push**
```bash
git add -A
git commit -m "fix: Remove hardcoded secrets from Edge Function"
git push
```

### **2. Aguardar Deploy**
- Netlify fará deploy automático (~2-3 min)
- Edge Function terá acesso às env vars

### **3. Testar**
```bash
# Verificar headers
curl -I https://menulove.com.au/r/la-casa-beach-bar

# Verificar OG tags
curl -s https://menulove.com.au/r/la-casa-beach-bar | grep og:title
```

---

## 🔍 COMO FUNCIONA

### **No Código (Edge Function):**
```typescript
// ✅ SEGURO - Lê de variável de ambiente
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";
```

### **No Netlify:**
- Netlify injeta as env vars no runtime da Edge Function
- Chave nunca aparece no código fonte
- Chave nunca vai para o GitHub
- Chave fica segura no Netlify Dashboard

---

## ⚠️ IMPORTANTE

### **NÃO fazer:**
- ❌ Commitar chaves no código
- ❌ Fazer push sem configurar env vars no Netlify
- ❌ Compartilhar chaves em mensagens/emails

### **FAZER:**
- ✅ Configurar env vars no Netlify Dashboard
- ✅ Usar `Deno.env.get()` para ler variáveis
- ✅ Manter chaves apenas no Netlify Dashboard

---

## 🐛 TROUBLESHOOTING

### **Problema: Edge Function retorna erro 500**
```
Solução:
1. Verificar se env vars foram configuradas no Netlify
2. Verificar se os nomes estão corretos (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
3. Verificar se os valores estão corretos
4. Re-deploy do site
```

### **Problema: OG tags não aparecem**
```
Solução:
1. Verificar logs da Edge Function no Netlify
2. Verificar se SUPABASE_ANON_KEY está definida
3. Testar com curl -I para ver headers de debug
```

---

## 📚 REFERÊNCIAS

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Netlify Edge Functions Environment](https://docs.netlify.com/edge-functions/api/#environment-variables)
- [Deno Environment Variables](https://deno.land/manual/runtime/environment_variables)

---

**Configuração completa e segura!** 🔒
