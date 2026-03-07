# Security System Setup - MenuLove

Sistema completo de proteção anti-bot e segurança para cadastro de parceiros.

---

## 🔒 **CAMADAS DE SEGURANÇA IMPLEMENTADAS**

### **1. Google reCAPTCHA v3** ✅
- Proteção invisível contra bots
- Score de 0.0 a 1.0 (1.0 = humano)
- Bloqueio automático para score < 0.5

### **2. Rate Limiting** ✅
- Máximo 3 cadastros por IP por hora
- Máximo 10 tentativas por email por dia
- Bloqueio temporário automático

### **3. Honeypot Fields** ✅
- Campos invisíveis que bots preenchem
- Detecção instantânea de bots simples

### **4. Email Validation** ✅
- Bloqueio de emails temporários/descartáveis
- Blacklist de 20+ domínios conhecidos
- Validação de formato e domínio

### **5. Behavioral Analysis** ✅
- Tempo mínimo de preenchimento (3 segundos)
- Detecção de preenchimento muito rápido
- Análise de padrões suspeitos

---

## 🛠️ **CONFIGURAÇÃO NECESSÁRIA**

### **1. Google reCAPTCHA v3**

#### **Passo 1: Criar Conta no Google reCAPTCHA**
1. Acesse: https://www.google.com/recaptcha/admin
2. Clique em "+" para criar novo site
3. Configurações:
   - **Label:** MenuLove Partner Signup
   - **reCAPTCHA type:** reCAPTCHA v3
   - **Domains:** 
     - `menulove.com.au`
     - `localhost` (para testes)
   - Aceite os termos

#### **Passo 2: Copiar as Keys**
Você receberá:
- **Site Key** (pública) - vai no frontend
- **Secret Key** (privada) - vai no backend

#### **Passo 3: Adicionar no Supabase**
```bash
# No Supabase Dashboard → Settings → Edge Functions → Secrets
# Adicionar:
RECAPTCHA_SECRET_KEY=sua_secret_key_aqui
```

#### **Passo 4: Adicionar no Frontend**
Criar arquivo `.env`:
```
VITE_RECAPTCHA_SITE_KEY=sua_site_key_aqui
```

---

## 📊 **TABELAS CRIADAS**

### **1. signup_attempts**
Rastreia todas as tentativas de cadastro para análise e rate limiting.

```sql
CREATE TABLE signup_attempts (
  id UUID PRIMARY KEY,
  ip_address TEXT NOT NULL,
  email TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  recaptcha_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE
);
```

### **2. temp_email_domains**
Blacklist de domínios de email temporário.

```sql
CREATE TABLE temp_email_domains (
  id UUID PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE
);
```

**Domínios bloqueados:**
- tempmail.com
- temp-mail.org
- guerrillamail.com
- 10minutemail.com
- mailinator.com
- throwaway.email
- getnada.com
- maildrop.cc
- trashmail.com
- yopmail.com
- fakeinbox.com
- sharklasers.com
- E mais 8 domínios...

---

## 🔧 **EDGE FUNCTION: verify-signup**

### **Endpoint:**
```
POST https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/verify-signup
```

### **Request Body:**
```json
{
  "email": "partner@example.com",
  "recaptchaToken": "token_from_recaptcha",
  "honeypot": "",
  "formStartTime": 1234567890,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### **Response (Success):**
```json
{
  "allowed": true,
  "recaptchaScore": 0.9,
  "message": "Verification successful"
}
```

### **Response (Blocked):**
```json
{
  "allowed": false,
  "reason": "Too many signup attempts. Please try again in 1 hour."
}
```

### **Blocked Reasons:**
- `honeypot` - Bot detectado (preencheu campo invisível)
- `too_fast` - Formulário preenchido muito rápido
- `low_recaptcha` - Score reCAPTCHA baixo (< 0.5)
- `temp_email` - Email temporário/descartável
- `rate_limit_ip` - Muitas tentativas do mesmo IP
- `rate_limit_email` - Muitas tentativas com mesmo email

---

## 📝 **INTEGRAÇÃO NO FRONTEND**

### **1. Adicionar Honeypot Field**

No formulário de cadastro, adicionar campo invisível:

```tsx
{/* Honeypot - hidden field for bot detection */}
<input
  type="text"
  name="website"
  value={honeypot}
  onChange={(e) => setHoneypot(e.target.value)}
  style={{ 
    position: 'absolute', 
    left: '-9999px',
    width: '1px',
    height: '1px'
  }}
  tabIndex={-1}
  autoComplete="off"
/>
```

### **2. Rastrear Tempo de Preenchimento**

```tsx
const [formStartTime] = useState(Date.now());
```

### **3. Executar reCAPTCHA no Submit**

```tsx
import { executeRecaptcha } from '../utils/recaptcha';

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Get reCAPTCHA token
  const recaptchaToken = await executeRecaptcha('partner_signup');
  
  // Get IP address (from client or server)
  const ipAddress = await fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(d => d.ip);
  
  // Verify signup
  const { data, error } = await supabase.functions.invoke('verify-signup', {
    body: {
      email,
      recaptchaToken,
      honeypot,
      formStartTime,
      ipAddress,
      userAgent: navigator.userAgent,
    },
  });
  
  if (!data.allowed) {
    alert(data.reason);
    return;
  }
  
  // Continue with signup...
};
```

---

## 📊 **MONITORAMENTO**

### **Ver Tentativas Bloqueadas**

```sql
SELECT 
  email,
  ip_address,
  blocked_reason,
  recaptcha_score,
  created_at
FROM signup_attempts
WHERE success = false
ORDER BY created_at DESC
LIMIT 50;
```

### **Estatísticas de Bloqueio**

```sql
SELECT 
  blocked_reason,
  COUNT(*) as count,
  AVG(recaptcha_score) as avg_score
FROM signup_attempts
WHERE success = false
GROUP BY blocked_reason
ORDER BY count DESC;
```

### **Rate Limiting por IP**

```sql
SELECT 
  ip_address,
  COUNT(*) as attempts,
  COUNT(CASE WHEN success = true THEN 1 END) as successful,
  MAX(created_at) as last_attempt
FROM signup_attempts
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) >= 3
ORDER BY attempts DESC;
```

---

## 🚨 **ADICIONAR DOMÍNIO À BLACKLIST**

```sql
INSERT INTO temp_email_domains (domain)
VALUES ('novo-dominio-temporario.com')
ON CONFLICT (domain) DO NOTHING;
```

---

## 🧪 **TESTES**

### **Teste 1: Honeypot**
```bash
curl -X POST https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/verify-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "honeypot": "bot filled this",
    "ipAddress": "127.0.0.1",
    "userAgent": "Test"
  }'
```

**Esperado:** `{ "allowed": false, "reason": "Security check failed..." }`

### **Teste 2: Email Temporário**
```bash
curl -X POST https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/verify-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@tempmail.com",
    "honeypot": "",
    "ipAddress": "127.0.0.1",
    "userAgent": "Test"
  }'
```

**Esperado:** `{ "allowed": false, "reason": "Please use a valid business email..." }`

### **Teste 3: Rate Limiting**
Fazer 4 requisições seguidas do mesmo IP.

**Esperado:** 4ª requisição bloqueada com `rate_limit_ip`

---

## 🔐 **SEGURANÇA DAS KEYS**

### **❌ NUNCA:**
- Commitar `.env` no git
- Expor `RECAPTCHA_SECRET_KEY` no frontend
- Compartilhar keys publicamente

### **✅ SEMPRE:**
- Usar variáveis de ambiente
- Manter secret key apenas no backend (Supabase)
- Rotacionar keys se comprometidas

---

## 📈 **MÉTRICAS DE SUCESSO**

- **Taxa de bloqueio esperada:** 5-15% (bots + tentativas inválidas)
- **Taxa de falsos positivos:** < 1% (usuários legítimos bloqueados)
- **Score reCAPTCHA médio:** > 0.7 para usuários reais

---

## 🆘 **TROUBLESHOOTING**

### **Problema: Usuários legítimos sendo bloqueados**

1. Verificar score reCAPTCHA:
```sql
SELECT AVG(recaptcha_score) 
FROM signup_attempts 
WHERE success = false AND blocked_reason = 'low_recaptcha';
```

2. Se média > 0.4, considerar baixar `MIN_RECAPTCHA_SCORE` para 0.4

### **Problema: Muitos bots passando**

1. Aumentar `MIN_RECAPTCHA_SCORE` para 0.6
2. Adicionar mais domínios temporários à blacklist
3. Reduzir rate limits

### **Problema: reCAPTCHA não carrega**

1. Verificar se `VITE_RECAPTCHA_SITE_KEY` está configurada
2. Verificar console do navegador para erros
3. Testar com site key de teste do Google

---

**Sistema implementado em: 2026-03-07**
**Última atualização: 2026-03-07**
