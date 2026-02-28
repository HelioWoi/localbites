# 🧪 Testes de Geo-Fence e Budget

## Coordenadas de Teste

### ✅ Mooloolaba (Sunshine Coast) - DEVE PASSAR
```json
{
  "lat": -26.6839,
  "lng": 153.0918,
  "expected": "200 OK",
  "region": "sunshine"
}
```

### ✅ Brisbane CBD - DEVE PASSAR
```json
{
  "lat": -27.4698,
  "lng": 153.0251,
  "expected": "200 OK",
  "region": "brisbane"
}
```

### ❌ Sydney - DEVE BLOQUEAR
```json
{
  "lat": -33.8688,
  "lng": 151.2093,
  "expected": "403 Forbidden",
  "message": "Region not available yet"
}
```

## Testes Manuais

### 1. Teste Geo-Fence: Mooloolaba (OK)
```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/google-places \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -d '{
    "action": "searchNearby",
    "lat": -26.6839,
    "lng": 153.0918,
    "radius": 5000,
    "category": "all"
  }'

# Esperado: 200 OK com array de restaurantes (pode ser vazio se sem cache)
```

### 2. Teste Geo-Fence: Brisbane CBD (OK)
```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/google-places \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -d '{
    "action": "searchNearby",
    "lat": -27.4698,
    "lng": 153.0251,
    "radius": 5000,
    "category": "all"
  }'

# Esperado: 200 OK com array de restaurantes
```

### 3. Teste Geo-Fence: Sydney (BLOQUEADO)
```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/google-places \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -d '{
    "action": "searchNearby",
    "lat": -33.8688,
    "lng": 151.2093,
    "radius": 5000,
    "category": "all"
  }'

# Esperado: 403 Forbidden
# Response:
# {
#   "error": "Region not available yet",
#   "message": "MenuLove is currently available only on Sunshine Coast and Brisbane while we stabilise the beta.",
#   "availableRegions": ["Sunshine Coast, QLD", "Brisbane, QLD"]
# }
```

### 4. Teste Cache Stale
```sql
-- Forçar cache antigo (>30 dias) para testar enqueue de refresh
UPDATE api_cache 
SET last_fetched_at = NOW() - INTERVAL '35 days'
WHERE cache_key LIKE 'places_%';

-- Fazer request
-- Esperado: Retorna dados do cache + enfileira refresh
```

Depois verificar:
```sql
-- Ver se foi enfileirado
SELECT * FROM venue_refresh_queue 
WHERE status = 'pending' 
ORDER BY requested_at DESC 
LIMIT 5;
```

### 5. Teste Budget Diário
```sql
-- Ver budget atual
SELECT * FROM check_daily_budget();

-- Resultado esperado:
-- can_refresh | used | limit_quota | remaining
-- true        | 0    | 50          | 50
```

### 6. Teste Refresh Manual
```bash
# Executar refresh manualmente
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/refresh-venues \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]"

# Esperado: 200 OK com:
# {
#   "success": true,
#   "processed": X,
#   "successCount": Y,
#   "failCount": Z,
#   "budget": { ... }
# }
```

Depois verificar:
```sql
-- Ver items processados
SELECT * FROM venue_refresh_queue 
WHERE status = 'done' 
ORDER BY updated_at DESC 
LIMIT 10;

-- Ver budget usado
SELECT * FROM daily_refresh_budget 
WHERE day = CURRENT_DATE;
```

## Verificações de Segurança

### ✅ NUNCA chamar API externa em request de usuário
```bash
# Fazer request e verificar logs
# NÃO deve aparecer: "Calling Google Places API"
# DEVE aparecer: "[Cache HIT]" ou "[Fallback]" + "[RefreshQueue] Enqueued"
```

### ✅ Cache sempre retorna imediatamente
```bash
# Request com cache deve ser < 500ms
# Request sem cache retorna [] imediatamente e enfileira
```

### ✅ Budget respeitado
```sql
-- Simular budget esgotado
UPDATE daily_refresh_budget 
SET used = 50, limit_quota = 50 
WHERE day = CURRENT_DATE;

-- Executar refresh
-- Esperado: "Daily budget exhausted" sem processar items
```

## Queries de Monitoramento

### Ver requests por região hoje
```sql
SELECT 
  region,
  COUNT(*) as requests,
  COUNT(DISTINCT cache_key) as unique_locations
FROM venue_refresh_queue
WHERE requested_at::date = CURRENT_DATE
GROUP BY region;
```

### Ver cache hits vs misses (últimas 24h)
```sql
-- Verificar nos logs da Edge Function
-- [Cache HIT] = cache hit
-- [Cache MISS] = cache miss
-- [Fallback] = sem cache, retornou vazio
```

### Ver budget semanal
```sql
SELECT 
  day,
  used,
  limit_quota,
  (used::float / limit_quota * 100)::int as usage_percent
FROM daily_refresh_budget
WHERE day >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY day DESC;
```

### Ver items na fila por status
```sql
SELECT 
  status,
  COUNT(*) as count,
  MIN(requested_at) as oldest,
  MAX(requested_at) as newest
FROM venue_refresh_queue
GROUP BY status
ORDER BY status;
```

## Cenários de Erro

### Erro: Budget esgotado
**Sintoma:** Fila crescendo, items não processados  
**Causa:** Budget diário atingido (50 calls)  
**Solução:** Aguardar próximo dia ou aumentar limit_quota

### Erro: Muitas falhas na fila
**Sintoma:** Muitos items com status='failed'  
**Causa:** Google API key inválida ou rate limit  
**Solução:** Verificar logs, checar API key, aguardar rate limit

### Erro: Cache sempre vazio
**Sintoma:** Usuários sempre recebem []  
**Causa:** Refresh não está rodando (cron parado)  
**Solução:** Verificar cron job, executar refresh manual

## Estimativa de Custos

### Configuração Atual
- **Budget diário:** 50 calls
- **Custo por call:** $0.032
- **Custo diário máximo:** $1.60
- **Custo mensal máximo:** $48.00

### Com Cache (95% hit rate)
- **Calls reais:** ~2.5/dia
- **Custo diário:** $0.08
- **Custo mensal:** ~$2.40

### Ajustar Budget
```sql
-- Aumentar para 100 calls/dia (se necessário)
UPDATE daily_refresh_budget 
SET limit_quota = 100 
WHERE day >= CURRENT_DATE;

-- Ou via ENV var: REFRESH_DAILY_LIMIT=100
```

---

**Status:** ✅ Testes prontos para execução  
**Custo alvo:** < $100/mês (atingido com 50 calls/dia)  
**Regiões:** Sunshine Coast + Brisbane apenas
