# Exemplo de Integração - Sistema de Segurança

Como integrar o sistema de segurança anti-bot no formulário de cadastro de parceiros.

---

## 📝 **PASSO A PASSO**

### **1. Adicionar Estados no Componente**

```tsx
import { useState } from 'react';
import { executeRecaptcha } from '../utils/recaptcha';
import { supabase } from '../lib/supabase';

const PartnerSignupForm = () => {
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  
  // Security states
  const [honeypot, setHoneypot] = useState('');
  const [formStartTime] = useState(Date.now());
  const [isVerifying, setIsVerifying] = useState(false);
  
  // ... outros estados
```

### **2. Adicionar Honeypot Field (Campo Invisível)**

```tsx
return (
  <form onSubmit={handleSubmit}>
    {/* Honeypot - Campo invisível para detectar bots */}
    <input
      type="text"
      name="website"
      value={honeypot}
      onChange={(e) => setHoneypot(e.target.value)}
      style={{ 
        position: 'absolute', 
        left: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0
      }}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
    />
    
    {/* Campos normais do formulário */}
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="Email"
      required
    />
    
    {/* ... outros campos ... */}
  </form>
);
```

### **3. Modificar handleSubmit**

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsVerifying(true);

  try {
    // 1. Get reCAPTCHA token
    let recaptchaToken = '';
    try {
      recaptchaToken = await executeRecaptcha('partner_signup');
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      // Continue sem reCAPTCHA (score será 0)
    }

    // 2. Get IP address
    let ipAddress = '0.0.0.0';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      ipAddress = ipData.ip;
    } catch (error) {
      console.error('IP fetch error:', error);
    }

    // 3. Verify signup with security checks
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-signup', {
      body: {
        email,
        recaptchaToken,
        honeypot,
        formStartTime,
        ipAddress,
        userAgent: navigator.userAgent,
      },
    });

    if (verifyError) {
      throw new Error('Security verification failed');
    }

    if (!verifyData.allowed) {
      // Signup blocked by security system
      alert(verifyData.reason);
      setIsVerifying(false);
      return;
    }

    // 4. Security checks passed - Continue with normal signup
    console.log('✅ Security verification passed. reCAPTCHA score:', verifyData.recaptchaScore);

    // ... resto do código de signup ...
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          restaurant_name: restaurantName,
          // ... outros dados
        },
      },
    });

    if (signupError) throw signupError;

    // Success!
    alert('Account created successfully! Please check your email to confirm.');

  } catch (error: any) {
    console.error('Signup error:', error);
    alert(error.message || 'Failed to create account. Please try again.');
  } finally {
    setIsVerifying(false);
  }
};
```

### **4. Atualizar Botão de Submit**

```tsx
<button 
  type="submit" 
  disabled={isVerifying}
  style={{
    opacity: isVerifying ? 0.6 : 1,
    cursor: isVerifying ? 'not-allowed' : 'pointer',
  }}
>
  {isVerifying ? 'Verifying...' : 'Create Account'}
</button>
```

---

## 🔧 **CONFIGURAÇÃO NECESSÁRIA**

### **1. Criar conta no Google reCAPTCHA**
- Acesse: https://www.google.com/recaptcha/admin
- Crie novo site (reCAPTCHA v3)
- Adicione domínio: `menulove.com.au` e `localhost`

### **2. Adicionar Keys**

**Frontend (.env):**
```
VITE_RECAPTCHA_SITE_KEY=sua_site_key_aqui
```

**Backend (Supabase Dashboard → Settings → Edge Functions → Secrets):**
```
RECAPTCHA_SECRET_KEY=sua_secret_key_aqui
```

### **3. Aplicar Migration**

Execute no Supabase SQL Editor:
```sql
-- Já está criado o arquivo:
-- supabase/migrations/20260307_create_signup_security.sql
```

---

## ✅ **CHECKLIST DE INTEGRAÇÃO**

- [ ] Adicionar `honeypot` state
- [ ] Adicionar `formStartTime` state
- [ ] Adicionar campo honeypot invisível no formulário
- [ ] Importar `executeRecaptcha` de `utils/recaptcha`
- [ ] Modificar `handleSubmit` para chamar `verify-signup`
- [ ] Adicionar loading state durante verificação
- [ ] Configurar reCAPTCHA keys (.env e Supabase)
- [ ] Aplicar migration `20260307_create_signup_security.sql`
- [ ] Testar com email válido (deve passar)
- [ ] Testar com email temporário (deve bloquear)
- [ ] Testar preenchendo honeypot (deve bloquear)

---

## 🧪 **TESTES RECOMENDADOS**

### **Teste 1: Signup Normal**
- Email válido: `test@gmail.com`
- Preencher formulário normalmente (> 3 segundos)
- **Esperado:** ✅ Signup permitido

### **Teste 2: Email Temporário**
- Email: `test@tempmail.com`
- **Esperado:** ❌ Bloqueado com mensagem "Please use a valid business email"

### **Teste 3: Honeypot (simular bot)**
- Abrir DevTools → Console
- Executar: `document.querySelector('input[name="website"]').value = 'bot'`
- Submeter formulário
- **Esperado:** ❌ Bloqueado com "Security check failed"

### **Teste 4: Rate Limiting**
- Fazer 4 tentativas de signup seguidas
- **Esperado:** 4ª tentativa bloqueada com "Too many signup attempts"

---

## 📊 **MONITORAMENTO**

Após integração, monitore no Supabase:

```sql
-- Ver últimas tentativas
SELECT * FROM signup_attempts 
ORDER BY created_at DESC 
LIMIT 20;

-- Ver bloqueios por motivo
SELECT 
  blocked_reason, 
  COUNT(*) 
FROM signup_attempts 
WHERE success = false 
GROUP BY blocked_reason;
```

---

## ⚠️ **IMPORTANTE**

1. **Não quebra código existente** - Sistema funciona em paralelo
2. **Fallback gracioso** - Se reCAPTCHA falhar, signup continua (com score 0)
3. **Mensagens amigáveis** - Usuários legítimos veem mensagens claras
4. **Logs detalhados** - Tudo registrado em `signup_attempts`

---

**Quando estiver pronto para integrar, siga este guia passo a passo!** 🚀
