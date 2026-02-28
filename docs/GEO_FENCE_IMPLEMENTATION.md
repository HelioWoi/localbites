# 🌏 Geo-Fence Implementation Guide

## Objetivo
Restringir o serviço MenuLove para **Sunshine Coast** e **Brisbane** apenas, implementando:
1. Bloqueio geográfico (geo-fence)
2. Stale-while-revalidate cache
3. Fila de refresh controlada por budget diário
4. Fallback seguro para dados do banco

## Arquivos Criados/Modificados

### 1. Geo-Fence Utility
**Arquivo:** `supabase/functions/_shared/geoFence.ts`
- Define bounding boxes para Sunshine Coast e Brisbane
- Função `isAllowedRegion(lat, lng)` retorna região ou null
- Função `getBlockedRegionResponse()` retorna 403 com mensagem amigável

### 2. Migrations SQL
**Arquivo:** `supabase/migrations/20260228_add_refresh_queue.sql`
- Tabela `venue_refresh_queue`: fila de refresh em background
- Tabela `daily_refresh_budget`: controle de quota diária (250 calls/dia)
- Funções: `enqueue_venue_refresh()`, `check_daily_budget()`, `increment_daily_budget()`

**Arquivo:** `supabase/migrations/20260228_add_last_fetched_at.sql`
- Adiciona coluna `last_fetched_at` na tabela `api_cache`
- Usado para tracking de stale-while-revalidate

### 3. Edge Function: Refresh Venues
**Arquivo:** `supabase/functions/refresh-venues/index.ts`
- Processa fila de refresh em background
- Batch de 50 itens por execução
- Respeita budget diário (250 calls/dia = ~$240/mês)
- Marca items como done/failed
- Incrementa budget usado

### 4. Edge Function: Google Places (Atualizada)
**Arquivo:** `supabase/functions/google-places/index.ts`
- Importa `geoFence` utility
- Valida região no início do request
- Retorna 403 se fora de Sunshine/Brisbane
- Implementa stale-while-revalidate:
  - Cache < 7 dias: retorna imediatamente (FRESH)
  - Cache 7-30 dias: retorna stale + enfileira refresh (STALE)
  - Cache > 30 dias: chama API agora (EXPIRED)

## Regiões Permitidas

### Sunshine Coast
```typescript
{
  name: 'sunshine',
  minLat: -27.20,
  maxLat: -25.90,
  minLng: 152.55,
  maxLng: 153.35,
}
```

### Brisbane
```typescript
{
  name: 'brisbane',
  minLat: -27.80,
  maxLat: -27.05,
  minLng: 152.75,
  maxLng: 153.40,
}
```

## Fluxo de Funcionamento

### Request de Usuário
1. Usuário faz request com lat/lng
2. **Geo-fence:** Valida se está em Sunshine ou Brisbane
   - ❌ Fora: Retorna 403 (sem chamar API)
   - ✅ Dentro: Continua
3. **Cache Check:**
   - Fresh (< 7 dias): Retorna cache
   - Stale (7-30 dias): Retorna cache + enfileira refresh
   - Expired (> 30 dias): Chama API agora
4. Se chamar API: Salva no cache com `last_fetched_at`

### Background Refresh (Cron)
1. Cron executa `refresh-venues` a cada 6 horas
2. Checa budget diário (usado < 250?)
3. Pega até 50 items da fila (pending)
4. Para cada item:
   - Chama Google Places API
   - Salva no cache
   - Marca como done
   - Incrementa budget
5. Para se atingir budget diário

## Passos de Deploy

### 1. Rodar Migrations
```bash
# No Supabase SQL Editor
# 1. Refresh queue
supabase/migrations/20260228_add_refresh_queue.sql

# 2. Last fetched at
supabase/migrations/20260228_add_last_fetched_at.sql
```

### 2. Deploy Edge Functions
```bash
# Deploy refresh-venues
supabase functions deploy refresh-venues --no-verify-jwt

# Deploy google-places (atualizada)
supabase functions deploy google-places --no-verify-jwt
```

### 3. Configurar Cron Job
No Supabase Dashboard → Database → Cron Jobs:

**Nome:** Refresh Venues Background
**Schedule:** `0 */6 * * *` (a cada 6 horas)
**Command:**
```sql
SELECT net.http_post(
  url := 'https://[PROJECT_ID].supabase.co/functions/v1/refresh-venues',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
  body := '{}'::jsonb
);
```

## Monitoramento

### Ver Budget Diário
```sql
SELECT * FROM daily_refresh_budget 
ORDER BY day DESC 
LIMIT 7;
```

### Ver Fila de Refresh
```sql
SELECT 
  status,
  COUNT(*) as count,
  MIN(requested_at) as oldest,
  MAX(requested_at) as newest
FROM venue_refresh_queue
GROUP BY status;
```

### Ver Items Pendentes
```sql
SELECT * FROM venue_refresh_queue 
WHERE status = 'pending' 
ORDER BY requested_at 
LIMIT 20;
```

### Ver Falhas
```sql
SELECT * FROM venue_refresh_queue 
WHERE status = 'failed' 
ORDER BY last_attempt_at DESC 
LIMIT 20;
```

## Estimativa de Custos

### Configuração Atual
- Budget diário: 250 calls
- Custo por call: $0.032
- Custo diário máximo: $8
- **Custo mensal máximo: $240**

### Com Cache (95% hit rate)
- Calls reais: ~12.5/dia
- Custo diário: $0.40
- **Custo mensal: ~$12**

## Ajustar Budget

Para mudar o limite diário, edite a migration:
```sql
-- Alterar de 250 para 100
UPDATE daily_refresh_budget 
SET limit_quota = 100 
WHERE day = CURRENT_DATE;
```

Ou altere o default na migration:
```sql
CREATE TABLE daily_refresh_budget (
  ...
  limit_quota INTEGER NOT NULL DEFAULT 100, -- Era 250
  ...
);
```

## Fallback em Caso de Erro

Se a API do Google falhar, o sistema:
1. Retorna dados do cache (mesmo expirados)
2. Retorna partners do banco
3. Nunca retorna erro 500 para o usuário

## Testes

### 1. Teste Geo-Fence (Fora da Região)
```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/google-places \
  -H "Content-Type: application/json" \
  -d '{
    "action": "searchNearby",
    "lat": -33.8688,
    "lng": 151.2093,
    "radius": 5000
  }'

# Esperado: 403 com mensagem "Region not available yet"
```

### 2. Teste Geo-Fence (Sunshine Coast)
```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/google-places \
  -H "Content-Type: application/json" \
  -d '{
    "action": "searchNearby",
    "lat": -26.650,
    "lng": 153.066,
    "radius": 5000
  }'

# Esperado: 200 com lista de restaurantes
```

### 3. Teste Geo-Fence (Brisbane)
```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/google-places \
  -H "Content-Type: application/json" \
  -d '{
    "action": "searchNearby",
    "lat": -27.470,
    "lng": 153.025,
    "radius": 5000
  }'

# Esperado: 200 com lista de restaurantes
```

### 4. Teste Refresh Queue
```bash
# Executar refresh manual
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/refresh-venues \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]"

# Verificar resultado
SELECT * FROM venue_refresh_queue ORDER BY updated_at DESC LIMIT 10;
```

## Troubleshooting

### Problema: Muitos items na fila
**Solução:** Aumentar frequência do cron (ex: a cada 3 horas)

### Problema: Budget esgotado
**Solução:** Aumentar `limit_quota` ou aguardar próximo dia

### Problema: Muitas falhas
**Solução:** Verificar logs da Edge Function e API key do Google

### Problema: Cache sempre stale
**Solução:** Verificar se cron está rodando e budget disponível

---

**Status:** ✅ Implementação completa, pronta para deploy
**Custo estimado:** < $100/mês (meta atingida)
**Regiões:** Sunshine Coast + Brisbane apenas
