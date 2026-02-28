# 🛡️ Estratégia de Proteção contra Custos de API

## Problema
Quando você anunciar no social media (Instagram, Facebook, TikTok), milhares de pessoas podem acessar simultaneamente, gerando custos excessivos com Google Places API.

## ✅ Proteções Já Implementadas

### 1. Cache de 30 dias no Supabase
- **Localização:** `supabase/functions/google-places/index.ts`
- **Como funciona:** Primeira busca chama Google API, próximas 30 dias leem do cache
- **Economia:** ~95% de redução em chamadas repetidas
- **Tabela:** `api_cache`

```typescript
const PLACES_CACHE_HOURS = 720; // 30 dias
```

### 2. Cache por Localização (Agrupamento)
- **Como funciona:** Usuários em raio de ~110m compartilham mesmo cache
- **Economia:** 1 chamada serve múltiplos usuários próximos
- **Implementação:** `getCacheKey()` arredonda coordenadas

```typescript
function getCacheKey(lat: number, lng: number, radius: number): string {
  const roundedLat = Math.round(lat * 1000) / 1000; // ~110m
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `places_${roundedLat}_${roundedLng}_${radius}`;
}
```

### 3. Partners no Banco (Zero Custo)
- **Como funciona:** Partners (Backstreet, Flume, Brazzos) salvos no Supabase
- **Economia:** 100% - nunca chama Google API para partners
- **Prioridade:** Partners aparecem primeiro no feed

## 🚀 Novas Proteções (Implementar)

### 4. Rate Limiting por IP
**Objetivo:** Limitar chamadas por usuário/IP para evitar abuso

**Configuração:**
- **Por IP:** 50 requests/hora
- **Por usuário autenticado:** 100 requests/hora  
- **Global:** 10.000 requests/hora (proteção DDoS)

**Arquivos criados:**
- `supabase/functions/_shared/rateLimiter.ts`
- `supabase/migrations/20260228_add_rate_limiting.sql`

**Como implementar:**
1. Rodar migration no Supabase
2. Importar `rateLimiter` na Edge Function
3. Checar limite antes de chamar Google API

### 5. Fallback para Dados Estáticos
**Objetivo:** Se API falhar ou atingir limite, mostrar partners do banco

**Implementação:**
```typescript
try {
  // Tentar Google API
  const googlePlaces = await searchGooglePlaces(...);
} catch (error) {
  // Fallback: mostrar apenas partners (zero custo)
  console.warn('Google API failed, showing partners only');
  return partnerRestaurants;
}
```

## 📊 Estimativa de Custos

### Cenário: Campanha no Instagram (10.000 visitantes/dia)

**Sem proteção:**
- 10.000 visitantes × $0.032/request = **$320/dia** 💸
- **$9.600/mês** 😱

**Com cache de 30 dias:**
- Primeira visita: $0.032
- Próximas 29 dias: $0
- ~95% economia = **$480/mês** ✅

**Com cache + rate limiting:**
- Bloqueia bots e scrapers
- Limita abuso
- ~98% economia = **$192/mês** ✅✅

**Com cache + rate limiting + fallback:**
- Se API falhar, mostra partners (zero custo)
- Usuário sempre vê conteúdo
- **$192/mês máximo** ✅✅✅

## 🎯 Recomendações

### Para Lançamento de Campanha
1. ✅ **Antes:** Rodar migrations de rate limiting
2. ✅ **Monitorar:** Dashboard do Google Cloud (quota usage)
3. ✅ **Alertas:** Configurar alerta se custo > $50/dia
4. ✅ **Fallback:** Sempre mostrar partners se API falhar

### Limites Seguros
- **Máximo por dia:** $50 (1.562 chamadas únicas)
- **Máximo por mês:** $500 (15.625 chamadas únicas)
- **Com cache:** Suporta ~300.000 visitantes/mês

### Monitoramento
```sql
-- Ver chamadas de API por hora
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as requests
FROM api_rate_limits
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;

-- Ver IPs com mais chamadas
SELECT 
  identifier,
  count,
  created_at
FROM api_rate_limits
ORDER BY count DESC
LIMIT 20;
```

## 🚨 Ações de Emergência

### Se custo disparar:
1. **Imediato:** Desativar Edge Function temporariamente
2. **Fallback:** App mostra apenas partners do banco
3. **Investigar:** Checar logs para identificar abuso
4. **Ajustar:** Reduzir rate limits se necessário

### Desativar Google API temporariamente:
```typescript
// Em geminiService.ts
const EMERGENCY_MODE = true; // Só mostra partners

if (EMERGENCY_MODE) {
  return partnerRestaurants; // Zero custo
}
```

## 📈 Próximos Passos

1. [ ] Rodar migration de rate limiting em produção
2. [ ] Implementar rate limiter na Edge Function
3. [ ] Configurar alertas no Google Cloud Console
4. [ ] Testar fallback em ambiente local
5. [ ] Documentar processo de emergência

## 💡 Dicas Extras

- **Partners pagam:** Eles aparecem primeiro e nunca custam API
- **Cache é rei:** 30 dias é muito tempo, aproveite
- **Monitore sempre:** Google Cloud Console → APIs & Services → Quotas
- **Tenha fallback:** Usuário sempre vê conteúdo, mesmo se API falhar

---

**Resumo:** Com as proteções implementadas, você pode rodar campanhas de social media com segurança, sabendo que os custos estão controlados e o app sempre funciona.
