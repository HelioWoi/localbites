# Dynamic Open Graph Tags Implementation

## ✅ O QUE FOI IMPLEMENTADO

Implementamos **Netlify Edge Function** para servir Open Graph tags dinâmicas para páginas de restaurantes, sem quebrar o React app.

---

## 🎯 COMPORTAMENTO

### **Root Domain** (`https://menulove.com.au`)
- ✅ Usa preview padrão do MenuLove
- ✅ Imagem: `img-site.jpg`
- ✅ Título: "MenuLove™ - Video Menus for Restaurants"

### **Restaurant Routes** (`https://menulove.com.au/r/:slug`)
- ✅ Usa dados específicos do restaurante
- ✅ Imagem: Profile image do restaurante (fallback para padrão se não existir)
- ✅ Título: Nome do restaurante
- ✅ Descrição: "Explore the menu of {restaurant} through short videos."

---

## 🔧 COMO FUNCIONA

### **1. Edge Function Intercepta Crawlers**
```typescript
// Detecta se é um crawler de rede social
const isCrawler = /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|slack/i.test(userAgent);

// Se for crawler: serve HTML com OG tags dinâmicas
// Se for usuário normal: deixa React app funcionar normalmente
```

### **2. Busca Dados do Restaurante**
```typescript
// Busca no Supabase usando o slug da URL
const restaurant = await getRestaurantBySlug(slug);

// Usa dados do restaurante para gerar OG tags
og:title = restaurant.name
og:image = restaurant.profile_image_url || DEFAULT_IMAGE
og:description = `Explore the menu of ${restaurant.name} through short videos.`
```

### **3. Serve HTML Dinâmico**
- Crawlers recebem HTML completo com OG tags
- Usuários normais recebem React app normalmente
- **Nenhuma quebra de funcionalidade!**

---

## 📋 ARQUIVOS CRIADOS

1. **`netlify/edge-functions/og-tags.ts`**
   - Edge Function principal
   - Detecta crawlers
   - Busca dados do restaurante
   - Gera HTML com OG tags dinâmicas

2. **`netlify/edge-functions/og-tags.json`**
   - Configuração da Edge Function
   - Define path: `/r/*`

3. **`netlify.toml`** (atualizado)
   - Configuração do Netlify
   - Registra Edge Function

---

## 🧪 COMO TESTAR

### **Teste 1: Facebook Debugger**
```
https://developers.facebook.com/tools/debug/

Cole a URL:
https://menulove.com.au/r/backstreet-cafe-maroochydore

Clique em "Scrape Again"

✅ Deve mostrar:
- Title: "Backstreet Cafe"
- Description: "Explore the menu of Backstreet Cafe through short videos."
- Image: Profile image do Backstreet Cafe
```

### **Teste 2: Twitter Card Validator**
```
https://cards-dev.twitter.com/validator

Cole a URL:
https://menulove.com.au/r/la-casa-beach-bar-mooloolaba

✅ Deve mostrar:
- Card: summary_large_image
- Title: "La Casa Beach Bar"
- Description: "Explore the menu of La Casa Beach Bar through short videos."
- Image: Profile image do La Casa
```

### **Teste 3: LinkedIn Post Inspector**
```
https://www.linkedin.com/post-inspector/

Cole a URL:
https://menulove.com.au/r/brazzos-smokehouse-sunshine-plaza

✅ Deve mostrar preview com dados do restaurante
```

### **Teste 4: WhatsApp**
```
Envie a URL para você mesmo no WhatsApp:
https://menulove.com.au/r/backstreet-cafe-maroochydore

✅ Deve mostrar preview com:
- Nome do restaurante
- Descrição
- Imagem do restaurante
```

---

## 🚀 DEPLOY

### **Passo 1: Commit & Push**
```bash
git add -A
git commit -m "feat: Add dynamic Open Graph tags for restaurant pages"
git push
```

### **Passo 2: Netlify Deploy Automático**
- Netlify detecta Edge Function automaticamente
- Deploy acontece em ~2-3 minutos
- Edge Function fica ativa em todas as regiões

### **Passo 3: Verificar Deploy**
```
1. Acesse Netlify Dashboard
2. Vá em "Edge Functions"
3. Confirme que "og-tags" está ativa
4. Status deve ser: "Deployed"
```

---

## ✅ CHECKLIST PÓS-DEPLOY

- [ ] Testar URL raiz (`menulove.com.au`) no Facebook Debugger
- [ ] Testar URL de restaurante (`menulove.com.au/r/backstreet-cafe-maroochydore`) no Facebook Debugger
- [ ] Testar no Twitter Card Validator
- [ ] Testar compartilhando no WhatsApp
- [ ] Confirmar que React app continua funcionando normalmente
- [ ] Confirmar que usuários normais não veem diferença

---

## 🔍 TROUBLESHOOTING

### **Problema: OG tags não aparecem**
```
Solução:
1. Limpar cache do Facebook Debugger
2. Clicar em "Scrape Again"
3. Verificar se Edge Function está ativa no Netlify
```

### **Problema: Imagem não carrega**
```
Solução:
1. Verificar se restaurant.profile_image_url existe no banco
2. Verificar se URL da imagem é acessível publicamente
3. Fallback para DEFAULT_OG_IMAGE funciona automaticamente
```

### **Problema: React app quebrou**
```
Solução:
1. Edge Function só afeta crawlers
2. Verificar console do navegador
3. Testar em modo anônimo
4. Se necessário, desativar Edge Function temporariamente
```

---

## 📊 MONITORAMENTO

### **Netlify Analytics**
```
1. Acesse Netlify Dashboard
2. Vá em "Edge Functions" > "og-tags"
3. Monitore:
   - Invocations (chamadas)
   - Execution time (tempo de execução)
   - Errors (erros)
```

### **Logs**
```
netlify functions:log og-tags

✅ Deve mostrar:
- Requests de crawlers
- Restaurant slugs buscados
- Tempo de resposta
```

---

## 🎯 BENEFÍCIOS

✅ **Melhor SEO**
- Crawlers veem conteúdo específico do restaurante
- Melhor indexação no Google

✅ **Melhor Compartilhamento**
- Preview bonito no Facebook, Twitter, WhatsApp
- Aumenta CTR (click-through rate)

✅ **Sem Quebrar App**
- React app funciona normalmente
- Zero impacto na performance para usuários

✅ **Escalável**
- Funciona para todos os restaurantes automaticamente
- Não precisa configurar manualmente

---

## 📝 PRÓXIMOS PASSOS

1. **Deploy para produção**
2. **Testar com URLs reais**
3. **Monitorar logs por 24h**
4. **Compartilhar links em redes sociais**
5. **Coletar feedback dos partners**

---

**Implementação completa e pronta para deploy!** 🚀
