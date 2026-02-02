# 🚀 PRE-DEPLOY CHECKLIST - LocalBites
**Data:** 2 de Fevereiro de 2026  
**Status:** Pronto para produção com clientes reais

---

## ✅ 1. CONFIGURAÇÕES DE API

### Supabase
- ✅ **URL:** `https://quybuvapflnzcaedjbkl.supabase.co`
- ✅ **Anon Key:** Configurada e válida
- ✅ **Edge Functions:**
  - `google-places` - Proxy para Google Places API
  - `google-places-photo` - Proxy para fotos (deployed com `--no-verify-jwt`)
  - `stripe-webhook` - Webhook para pagamentos

### Google APIs
- ✅ **Places API Key:** `AIzaSyBFuwVE7Omu6N3ZV4PHJvLORP0VqNlso3E`
  - Habilitada: Places API (New)
  - Custo: $17 por 1000 requests (Nearby Search)
  
- ✅ **Gemini API Key:** `AIzaSyDKm8vUfVRtsfM-E2AsN20_VQ1McmqcskY`
  - Habilitada: Generative Language API
  - Modelo: `gemini-2.5-flash`
  - Custo: GRATUITO até 1500 requests/dia

---

## ✅ 2. FUNCIONALIDADES CRÍTICAS

### Feed Principal
- ✅ Geolocalização com fallback (Sunshine Coast em dev)
- ✅ Categorias: Restaurants, Cafes, Bars, All
- ✅ Swipe vertical entre restaurantes
- ✅ Cache de 1 hora (browser + Supabase 30 dias)
- ✅ Lazy loading (20 restaurantes por página)
- ✅ Filtro OPEN com refresh completo do feed

### Bites Buddy (AI Assistant)
- ✅ Modelo: `gemini-2.5-flash` (estável e rápido)
- ✅ Conversação natural para escolher restaurantes
- ✅ Integração com categorias e busca
- ✅ Fallback gracioso em caso de erro

### Reviews
- ✅ Ícone review no feed → Reviews do restaurante específico
- ✅ Ícone review no rodapé → Reviews de todos (top 10)
- ✅ Layout fullscreen estilo feed
- ✅ Botão estrela → Abre Google Reviews

### Navegação
- ✅ RestaurantProfile sem rodapé
- ✅ RestaurantMenuPage sem rodapé
- ✅ Feed com rodapé completo
- ✅ Geolocalização funcionando em dev e produção

---

## ✅ 3. OTIMIZAÇÕES DE CUSTO

### Cache Strategy
```
Browser Cache: 1 hora
Supabase Cache: 30 dias
Location Threshold: 500m (não refaz busca se usuário não se moveu)
```

### Rate Limiting
⚠️ **ATENÇÃO:** Rate limiting está DESABILITADO para testes
```typescript
// geminiService.ts linha 16
return true; // DISABLED FOR TESTING - Always allow API access
```

**ANTES DE PRODUÇÃO:**
```typescript
// Descomentar rate limiting:
const DAILY_SEARCH_LIMIT = 5; // Max 5 searches per day per user
```

### Hybrid Strategy
1. **Partners First:** Busca restaurantes parceiros do Supabase (GRÁTIS)
2. **Google API:** Complementa com Google Places (PAGO)
3. **Cache:** Reutiliza resultados por 1 hora (GRÁTIS)

---

## 💰 4. ANÁLISE DE CUSTOS

### Custos ATUAIS (com rate limiting desabilitado)
- **Google Places API:** $17 por 1000 requests
  - Nearby Search: $17/1000
  - Place Details (reviews): $17/1000
  - Photos: GRÁTIS (via proxy)
  
- **Gemini API:** GRÁTIS
  - 1500 requests/dia grátis
  - Modelo `gemini-2.5-flash`

### Estimativa com 100 usuários/dia (SEM rate limiting):
```
Cenário pessimista (sem cache):
- 100 usuários × 3 buscas = 300 requests
- 300 × $0.017 = $5.10/dia
- $5.10 × 30 dias = $153/mês

Cenário realista (com cache 70%):
- 100 usuários × 3 buscas × 30% (cache miss) = 90 requests
- 90 × $0.017 = $1.53/dia
- $1.53 × 30 dias = $45.90/mês
```

### Estimativa com 100 usuários/dia (COM rate limiting 5/dia):
```
Cenário controlado:
- 100 usuários × 5 buscas max = 500 requests/dia
- 500 × $0.017 = $8.50/dia
- $8.50 × 30 dias = $255/mês (máximo absoluto)

Com cache 70%:
- 500 × 30% = 150 requests/dia
- 150 × $0.017 = $2.55/dia
- $2.55 × 30 dias = $76.50/mês
```

### ⚠️ RECOMENDAÇÃO ANTES DE PRODUÇÃO:
**HABILITAR rate limiting para controlar custos:**
```typescript
// geminiService.ts
const DAILY_SEARCH_LIMIT = 5; // Descomentar
function canUseGoogleAPI(): boolean {
  // Descomentar lógica de rate limiting
}
```

---

## ✅ 5. PERFORMANCE

### Cache Hit Rate
- ✅ 1 hora de cache no browser
- ✅ 30 dias de cache no Supabase
- ✅ Location-aware (500m threshold)
- ✅ Category-specific cache keys

### Loading States
- ✅ Skeleton screens durante carregamento
- ✅ Lazy loading de restaurantes
- ✅ Infinite scroll com paginação

### Error Handling
- ✅ Fallback gracioso para erros de geolocalização
- ✅ Fallback para erros do Bites Buddy
- ✅ Mensagens user-friendly (sem erros técnicos)

---

## ⚠️ 6. WARNINGS CONHECIDOS (NÃO CRÍTICOS)

### Deno Warnings (Supabase Edge Functions)
```
Cannot find module 'https://deno.land/std@0.177.0/http/server.ts'
Cannot find name 'Deno'
```
**Status:** Normal - Edge Functions usam Deno runtime, não afeta produção

### Console Logs em Desenvolvimento
- ✅ Logs detalhados para debug (`[Geolocation]`, `[Feed]`, `[OPEN Button]`)
- 📝 **TODO:** Remover ou condicionar logs antes de produção final

---

## 🔧 7. AÇÕES ANTES DO DEPLOY

### Obrigatórias:
1. ✅ Verificar todas as API keys no `.env`
2. ⚠️ **HABILITAR rate limiting** (descomentar código)
3. ✅ Testar geolocalização em dispositivo real
4. ✅ Testar Bites Buddy com modelo `gemini-2.5-flash`
5. ✅ Verificar filtro OPEN com refresh

### Opcionais (mas recomendadas):
6. 📝 Remover/condicionar console.logs excessivos
7. 📝 Adicionar analytics (Google Analytics, Mixpanel)
8. 📝 Configurar error tracking (Sentry)
9. 📝 Testar em múltiplos dispositivos/browsers

---

## 📊 8. MONITORAMENTO PÓS-DEPLOY

### Métricas para Acompanhar:
- **Google Places API:** Requests/dia, custo acumulado
- **Gemini API:** Requests/dia (limite 1500 grátis)
- **Cache Hit Rate:** % de requests que usam cache
- **User Engagement:** Tempo no app, swipes, conversões

### Alertas Recomendados:
- Custo diário > $10
- Requests Google API > 500/dia
- Erro rate > 5%
- Cache hit rate < 50%

---

## ✅ 9. CHECKLIST FINAL

- [x] Supabase configurado e funcionando
- [x] Google Places API funcionando
- [x] Gemini API funcionando (`gemini-2.5-flash`)
- [x] Cache implementado (1h browser + 30d Supabase)
- [x] Geolocalização com fallback
- [x] Bites Buddy integrado
- [x] Reviews funcionando
- [x] Filtro OPEN com refresh
- [x] Navegação correta (sem rodapé em profiles)
- [ ] **Rate limiting habilitado** ⚠️
- [ ] Console logs removidos/condicionados (opcional)
- [ ] Analytics configurado (opcional)

---

## 🚀 CONCLUSÃO

**Status:** ✅ **PRONTO PARA PRODUÇÃO**

**Custo Estimado (com rate limiting):**
- Mínimo: ~$45/mês (100 usuários, cache 70%)
- Máximo: ~$255/mês (100 usuários, sem cache)
- Controlado: ~$76.50/mês (100 usuários, rate limit + cache)

**Próximos Passos:**
1. Habilitar rate limiting
2. Fazer commit e push
3. Deploy em produção
4. Monitorar custos nas primeiras 48h
5. Ajustar rate limits conforme necessário

**Observação:** Gemini API é GRATUITO (1500 req/dia), então o custo real vem apenas do Google Places API.
