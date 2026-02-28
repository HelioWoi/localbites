# 🔧 Como Implementar Rate Limiting

## Passo 1: Rodar Migration

No Supabase SQL Editor, rode:

```sql
-- Criar tabela de rate limiting
CREATE TABLE IF NOT EXISTS api_rate_limits (
  identifier TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_created_at 
ON api_rate_limits(created_at);
```

## Passo 2: Atualizar Edge Function

Adicione no início da Edge Function `google-places/index.ts`:

```typescript
import { isRateLimited, getClientIP, RATE_LIMITS } from "../_shared/rateLimiter.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // RATE LIMITING - Protege contra abuso
    const clientIP = getClientIP(req);
    const rateLimitCheck = await isRateLimited(
      supabase,
      `ip:${clientIP}`,
      RATE_LIMITS.perIP
    );

    if (rateLimitCheck.limited) {
      console.warn(`[RateLimit] Blocked request from ${clientIP}`);
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
          resetAt: rateLimitCheck.resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(RATE_LIMITS.perIP.maxRequests),
            "X-RateLimit-Remaining": String(rateLimitCheck.remaining),
            "X-RateLimit-Reset": rateLimitCheck.resetAt.toISOString(),
          },
        }
      );
    }

    // Resto do código da Edge Function...
    const { lat, lng, radius, category } = await req.json();
    
    // ... continua normalmente
  } catch (error) {
    // ...
  }
});
```

## Passo 3: Deploy

```bash
supabase functions deploy google-places --no-verify-jwt
```

## Passo 4: Monitorar

### Ver requests por hora:
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(DISTINCT identifier) as unique_ips,
  SUM(count) as total_requests
FROM api_rate_limits
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Ver top IPs:
```sql
SELECT 
  identifier,
  count as requests,
  created_at,
  updated_at
FROM api_rate_limits
ORDER BY count DESC
LIMIT 20;
```

## Passo 5: Ajustar Limites (se necessário)

Edite `_shared/rateLimiter.ts`:

```typescript
export const RATE_LIMITS = {
  perIP: {
    maxRequests: 30, // Reduzir de 50 para 30 se tiver muito abuso
    windowMinutes: 60,
  },
  // ...
};
```

## Passo 6: Cleanup Automático

Crie um Cron Job no Supabase para limpar registros antigos:

```sql
-- Deletar registros com mais de 24h
DELETE FROM api_rate_limits
WHERE created_at < NOW() - INTERVAL '24 hours';
```

Configure no Supabase Dashboard → Database → Cron Jobs:
- Schedule: `0 */6 * * *` (a cada 6 horas)
- SQL: código acima

## Teste Local

```bash
# Fazer 51 requests rápidas (deve bloquear após 50)
for i in {1..51}; do
  curl -X POST http://localhost:54321/functions/v1/google-places \
    -H "Content-Type: application/json" \
    -d '{"lat":-33.8688,"lng":151.2093,"radius":5000}'
  echo "Request $i"
done
```

Deve retornar `429 Too Many Requests` após 50 requests.

## Emergência: Desativar Rate Limiting

Se precisar desativar temporariamente:

```typescript
// No início da Edge Function
const RATE_LIMITING_ENABLED = false; // Desativa

if (RATE_LIMITING_ENABLED) {
  const rateLimitCheck = await isRateLimited(...);
  // ...
}
```

---

**Importante:** Rate limiting protege seu orçamento, mas não afeta usuários normais (50 requests/hora é muito para uso normal).
