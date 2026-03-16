# OG Tags Edge Function - Fix Audit

## 🔴 PROBLEMA IDENTIFICADO

**Evidência:**
```bash
curl -s https://menulove.com.au/r/la-casa-beach-bar | head -120
```

**Retornou:**
- `og:url = https://menulove.com.au/`
- `og:title = MenuLove™ - Video Menus for Restaurants`
- `og:image = default MenuLove image`

**Conclusão:** Edge Function NÃO estava executando.

---

## 🔍 CAUSA RAIZ

### **Problema 1: Filtro de Crawler**
```typescript
// ❌ CÓDIGO ANTIGO (ERRADO)
const isCrawler = /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|slack/i.test(userAgent);

if (!isCrawler) {
  return context.next(); // curl não é crawler!
}
```

**Impacto:**
- Edge Function só executava para bots/crawlers
- `curl` não tem user-agent de crawler
- Testes com `curl` sempre retornavam HTML padrão
- Facebook/Twitter Debugger também pode não ser detectado

### **Problema 2: Geração de HTML do Zero**
```typescript
// ❌ CÓDIGO ANTIGO (ERRADO)
const html = generateHTML(restaurant, request.url);
return new Response(html, {...});
```

**Impacto:**
- Gerava HTML completo manualmente (297 linhas)
- Difícil manter sincronizado com index.html
- Propenso a erros e inconsistências

### **Problema 3: Falta de Debug Headers**
```typescript
// ❌ CÓDIGO ANTIGO (SEM DEBUG)
return new Response(html, {
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  },
});
```

**Impacto:**
- Impossível confirmar se função estava executando
- Sem visibilidade de dados do restaurante
- Difícil debugar em produção

---

## ✅ SOLUÇÃO IMPLEMENTADA

### **Fix 1: Remover Filtro de Crawler**
```typescript
// ✅ CÓDIGO NOVO (CORRETO)
export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only handle /r/:slug routes
  if (!path.startsWith('/r/')) {
    return context.next();
  }

  // Extract slug from path
  const slug = path.replace('/r/', '').split('?')[0];
  
  // Fetch restaurant data
  const restaurant = await getRestaurantBySlug(slug);
  
  // ... continua ...
}
```

**Benefícios:**
- ✅ Executa SEMPRE para rotas `/r/:slug`
- ✅ Funciona com `curl`, browsers, crawlers
- ✅ Testável com ferramentas normais

### **Fix 2: Modificar HTML Existente**
```typescript
// ✅ CÓDIGO NOVO (CORRETO)
// Get the original index.html from the SPA
const response = await context.next();
let html = await response.text();

// Replace OG tags in HTML
html = html
  .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${ogUrl}" />`)
  .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${ogTitle}" />`)
  .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${ogDescription}" />`)
  .replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${ogImage}" />`)
  // ... mais replacements ...
```

**Benefícios:**
- ✅ Usa HTML real do index.html
- ✅ Sempre sincronizado com build
- ✅ Apenas substitui OG tags necessárias
- ✅ Mantém todo resto do HTML intacto

### **Fix 3: Adicionar Debug Headers**
```typescript
// ✅ CÓDIGO NOVO (CORRETO)
return new Response(html, {
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=3600',
    // Debug headers
    'x-og-function': 'executed',
    'x-og-slug': slug,
    'x-og-restaurant-found': restaurant ? 'yes' : 'no',
    'x-og-title': ogTitle,
    'x-og-image': ogImage,
  },
});
```

**Benefícios:**
- ✅ Confirma execução da função
- ✅ Mostra slug extraído
- ✅ Indica se restaurante foi encontrado
- ✅ Mostra valores de OG tags aplicados

---

## 🧪 COMO TESTAR APÓS DEPLOY

### **Teste 1: Verificar Headers**
```bash
curl -I https://menulove.com.au/r/la-casa-beach-bar
```

**Esperado:**
```
x-og-function: executed
x-og-slug: la-casa-beach-bar
x-og-restaurant-found: yes
x-og-title: La Casa Beach Bar
x-og-image: https://...profile_image_url...
```

### **Teste 2: Verificar OG Tags**
```bash
curl -s https://menulove.com.au/r/la-casa-beach-bar | grep -A 5 "og:title"
```

**Esperado:**
```html
<meta property="og:title" content="La Casa Beach Bar" />
<meta property="og:description" content="Explore the menu of La Casa Beach Bar through short videos." />
<meta property="og:image" content="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/restaurant-images/..." />
```

### **Teste 3: Facebook Debugger**
```
https://developers.facebook.com/tools/debug/

URL: https://menulove.com.au/r/la-casa-beach-bar
```

**Esperado:**
- Title: "La Casa Beach Bar"
- Description: "Explore the menu of La Casa Beach Bar through short videos."
- Image: Profile image do restaurante

### **Teste 4: Twitter Card Validator**
```
https://cards-dev.twitter.com/validator

URL: https://menulove.com.au/r/la-casa-beach-bar
```

**Esperado:**
- Card: summary_large_image
- Title: "La Casa Beach Bar"
- Image: Profile image do restaurante

---

## 📋 MUDANÇAS NO CÓDIGO

### **Arquivo:** `netlify/edge-functions/og-tags.ts`

**Linhas modificadas:**
- Removido: Filtro de crawler (linhas 272-279)
- Removido: Função `generateHTML` (linhas 37-261)
- Adicionado: Fetch de index.html real (linha 281-282)
- Adicionado: Replace de OG tags (linhas 293-338)
- Adicionado: Debug headers (linhas 344-349)

**Tamanho:**
- Antes: 297 linhas
- Agora: 127 linhas
- Redução: 57% menos código

---

## ✅ CHECKLIST DE DEPLOY

- [x] Código corrigido
- [x] Build passou sem erros
- [ ] Commit e push
- [ ] Aguardar deploy Netlify (~2-3 min)
- [ ] Testar com `curl -I` (verificar headers)
- [ ] Testar com `curl -s | grep og:title`
- [ ] Testar com Facebook Debugger
- [ ] Testar com Twitter Card Validator
- [ ] Remover debug headers (opcional, após confirmar funcionamento)

---

## 🎯 RESULTADO ESPERADO

**Antes (ERRADO):**
```bash
curl -s https://menulove.com.au/r/la-casa-beach-bar | grep og:title
<meta property="og:title" content="MenuLove™ - Video Menus for Restaurants" />
```

**Depois (CORRETO):**
```bash
curl -s https://menulove.com.au/r/la-casa-beach-bar | grep og:title
<meta property="og:title" content="La Casa Beach Bar" />
```

---

**Fix completo e pronto para deploy!** 🚀
