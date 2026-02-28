# 🎯 Lógica de Primeira Visita - UX Garantida

## Objetivo
**Garantir que usuários NUNCA vejam lista vazia na primeira visita**, mesmo que precise chamar Google Places API.

---

## Nova Lógica Implementada

### Cenário 1: Cache Existe
```typescript
// Cache HIT - Retorna imediatamente (mesmo se stale)
if (cached && cached.data) {
  // Se stale (>30 dias), enfileira refresh em background
  if (isStale) {
    enqueue_venue_refresh(); // Non-blocking
  }
  return cached.data; // Resposta rápida
}
```

**Resultado:** Resposta < 500ms, zero custo de API

---

### Cenário 2: Cache NÃO Existe (Primeira Visita)
```typescript
// Cache MISS - CHAMA GOOGLE API
console.log('[FIRST VISIT] Calling Google Places API');

// 1. Buscar partners ativos (prioridade)
const partnersData = await getActivePartners();

// 2. Chamar Google Places API
const googlePlaces = await fetch('https://places.googleapis.com/v1/places:searchNearby');

// 3. Combinar: Partners PRIMEIRO + Google Places
const allPlaces = [...partnersData, ...googlePlaces];

// 4. Ordenar: Partners sempre no topo
allPlaces.sort((a, b) => {
  if (a.isPartner && !b.isPartner) return -1; // Partner primeiro
  if (!a.isPartner && b.isPartner) return 1;
  return a.distanceMeters - b.distanceMeters; // Depois por distância
});

// 5. Salvar no cache
await saveToCache(cacheKey, allPlaces);

// 6. Retornar imediatamente
return allPlaces;
```

**Resultado:** 
- ✅ Usuário SEMPRE vê restaurantes (partners + Google)
- ✅ Partners aparecem PRIMEIRO
- ✅ Cache salvo para próximas visitas
- ⚠️ Custo: 1 chamada de API ($0.032)

---

## Fluxo Completo: Mooloolaba → Alexandra Headland

### Primeira Visita: Mooloolaba

**Request:** `lat: -26.6839, lng: 153.0918`

1. **Cache check:** MISS (nunca visitado)
2. **Busca partners:** Brazzos, Backstreet, Flume (3 partners)
3. **Chama Google API:** 20 venues de Mooloolaba
4. **Combina:** [Brazzos, Backstreet, Flume, ...20 venues]
5. **Salva cache:** `places_-26.684_153.092_8000_all_v2`
6. **Retorna:** 23 restaurantes

**Custo:** $0.032 (1 API call)  
**Tempo:** ~2s (API externa)

---

### Segunda Visita: Mooloolaba (mesmo usuário ou outro)

**Request:** `lat: -26.6839, lng: 153.0918`

1. **Cache check:** HIT ✅
2. **Retorna:** 23 restaurantes (do cache)

**Custo:** $0 (cache)  
**Tempo:** < 500ms

---

### Terceira Visita: Alexandra Headland (1.5km de distância)

**Request:** `lat: -26.6678, lng: 153.1050`

**Cache key:** `places_-26.668_153.105_8000_all_v2`

#### Opção A: Outro usuário já visitou Alexandra HD
1. **Cache check:** HIT ✅
2. **Retorna:** Restaurantes de Alexandra HD (do cache)

**Custo:** $0  
**Tempo:** < 500ms

#### Opção B: Primeira vez em Alexandra HD
1. **Cache check:** MISS
2. **Busca partners:** Brazzos, Backstreet, Flume (3 partners)
3. **Chama Google API:** 20 venues de Alexandra HD
4. **Combina:** [Partners, ...venues]
5. **Salva cache:** `places_-26.668_153.105_8000_all_v2`
6. **Retorna:** 23+ restaurantes

**Custo:** $0.032 (1 API call)  
**Tempo:** ~2s

**Importante:** Usuário vê:
- Partners (sempre)
- Venues de Alexandra HD (novos)
- Alguns venues de Mooloolaba podem aparecer se dentro do raio (8km)

---

## Prioridade de Partners

### Ordenação Final
```typescript
allPlaces.sort((a, b) => {
  // 1. Partners SEMPRE primeiro
  if (a.isPartner && !b.isPartner) return -1;
  if (!a.isPartner && b.isPartner) return 1;
  
  // 2. Depois ordena por distância
  return a.distanceMeters - b.distanceMeters;
});
```

**Resultado:**
```
[
  Brazzos (partner, 500m),
  Backstreet (partner, 1.2km),
  Flume (partner, 2.5km),
  Venue A (800m),      // Mais perto que Backstreet, mas aparece depois
  Venue B (1.5km),
  Venue C (3km),
  ...
]
```

---

## Estimativa de Custos

### Sunshine Coast (área pequena, ~50km²)

**Cenário conservador:**
- Áreas únicas visitadas: 20 (Mooloolaba, Alexandra, Maroochydore, etc)
- Primeira visita cada área: 1 API call
- **Total:** 20 calls = $0.64

**Depois disso:**
- Todas as visitas usam cache
- **Custo adicional:** $0/mês

### Com Cache Hit Rate 95%
- 5% de primeira visitas (novas áreas)
- 95% de cache hits

**Mensal:**
- Novas áreas: ~10 calls/mês = $0.32
- Cache hits: 0 calls = $0
- **Total:** ~$0.32/mês

---

## Comparação: Antes vs Depois

| Métrica | Antes (Fallback) | Depois (API First Visit) |
|---------|------------------|--------------------------|
| **Primeira visita** | Partners + caches próximos | Partners + Google API |
| **UX primeira visita** | Pode ser vazio | SEMPRE tem dados |
| **Custo primeira visita** | $0 | $0.032 |
| **Tempo primeira visita** | < 500ms | ~2s |
| **Visitas subsequentes** | Cache (< 500ms) | Cache (< 500ms) |
| **Custo mensal** | $0 | ~$0.32 |

---

## Garantias

✅ **Usuário NUNCA vê lista vazia** (primeira visita chama API)  
✅ **Partners SEMPRE aparecem primeiro** (prioridade na ordenação)  
✅ **Visitas subsequentes são rápidas** (cache < 500ms)  
✅ **Custo controlado** (~$0.32/mês para novas áreas)  
✅ **Geo-fence mantido** (Sunshine + Brisbane apenas)  
✅ **Budget mantido** (50 calls/dia para refresh background)  

---

## Logs Esperados

### Primeira Visita
```
[Cache MISS] No cache for places_-26.684_153.092_8000_all_v2
[FIRST VISIT] No cache for places_-26.684_153.092_8000_all_v2 - calling Google Places API
[Partners] Found 3 active partners
[API Call] Searching 3 points, 3 type groups
[API] center@2000m, types restaurant: 8 results, 8 new
[API] center@5000m, types restaurant: 12 results, 4 new
[API] center@8000m, types restaurant: 15 results, 3 new
[API] Found 18 total places (3 partners + 15 from Google)
[Cache SAVE] Cached 18 places for places_-26.684_153.092_8000_all_v2
```

### Visita Subsequente
```
[Cache HIT] 18 places, age: 0.1 days, stale: false
```

---

## Resumo Executivo

### O que mudou
- **Primeira visita:** Agora chama Google API (antes retornava fallback)
- **Partners:** Sempre aparecem primeiro na lista
- **UX:** Garantido que usuário sempre vê restaurantes

### O que NÃO mudou
- Geo-fence (Sunshine + Brisbane)
- Budget diário (50 calls/dia para refresh background)
- Cache subsequente (< 500ms)
- Refresh via cron (6h, 12h, 18h, 24h)

### Custo adicional
- **Primeira visita por área:** $0.032
- **Estimativa mensal:** ~$0.32 (10 novas áreas/mês)
- **Ainda dentro do budget:** < $100/mês ✅

---

**Status:** ✅ Implementado e pronto para deploy  
**UX:** Garantida - nunca lista vazia  
**Custo:** Controlado - < $1/mês adicional
