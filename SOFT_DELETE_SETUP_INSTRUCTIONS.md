# Soft Delete Setup - Instruções de Instalação

## ✅ O que foi implementado no código:

1. **Todas as queries atualizadas** para filtrar `deleted_at IS NULL`
2. **Delete functions modificadas** para soft delete (marcar com timestamp)
3. **Edge Function criada** para limpeza automática após 7 dias
4. **Edge Function deployed** com sucesso

---

## 📋 Passos para completar a instalação:

### **Passo 1: Adicionar coluna `deleted_at` ao banco de dados**

Vá em **Supabase Dashboard** → **SQL Editor** e execute:

```sql
-- Add soft delete column to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_deleted_at 
ON menu_items(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Create index for active items queries
CREATE INDEX IF NOT EXISTS idx_menu_items_active 
ON menu_items(partner_id, deleted_at) 
WHERE deleted_at IS NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'menu_items' 
AND column_name = 'deleted_at';
```

---

### **Passo 2: Configurar Cron Job para limpeza automática**

**IMPORTANTE:** O Supabase Free Tier **não suporta pg_cron**. Você tem 2 opções:

#### **Opção A: Upgrade para Pro Plan** (Recomendado)
Se você tem o Pro Plan, execute este SQL:

```sql
-- Habilitar a extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar o cron job para executar todos os dias às 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-deleted-menu-items',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/cleanup-deleted-items',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);
```

#### **Opção B: Usar serviço externo de cron** (Free Tier)
Use um serviço como **cron-job.org** ou **EasyCron**:

1. Vá em https://cron-job.org
2. Crie uma conta gratuita
3. Configure um job para chamar:
   - **URL:** `https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/cleanup-deleted-items`
   - **Method:** POST
   - **Headers:** 
     ```
     Authorization: Bearer [SEU_SUPABASE_ANON_KEY]
     Content-Type: application/json
     ```
   - **Schedule:** Diariamente às 3:00 AM

---

## 🧪 Como testar:

### **Teste 1: Soft Delete**
1. Vá no Partner Dashboard
2. Delete um item do menu
3. Verifique no banco que o item tem `deleted_at` preenchido (não foi deletado permanentemente)

```sql
-- Ver itens soft-deleted
SELECT id, name, deleted_at 
FROM menu_items 
WHERE deleted_at IS NOT NULL;
```

### **Teste 2: Limpeza automática**
Execute manualmente a Edge Function:

```bash
curl -X POST https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/cleanup-deleted-items \
  -H "Authorization: Bearer [SEU_SUPABASE_ANON_KEY]"
```

---

## 📊 Como funciona:

### **Quando partner deleta um item:**
```sql
-- Antes (hard delete):
DELETE FROM menu_items WHERE id = 'xxx'

-- Agora (soft delete):
UPDATE menu_items 
SET deleted_at = NOW() 
WHERE id = 'xxx'
```

### **Queries automáticas filtram itens deletados:**
```sql
SELECT * FROM menu_items 
WHERE partner_id = 'xxx' 
AND deleted_at IS NULL  -- ✅ Só pega itens ativos
```

### **Limpeza automática após 7 dias:**
```sql
DELETE FROM menu_items 
WHERE deleted_at < NOW() - INTERVAL '7 days'
```

---

## ✅ Benefícios:

- ✅ Partner pode recuperar itens deletados acidentalmente (até 7 dias)
- ✅ Histórico preservado temporariamente
- ✅ Zero impacto na performance
- ✅ Limpeza automática evita acúmulo de dados

---

## 🔧 Próximos passos (opcional):

Se quiser adicionar uma seção "Itens Arquivados" no dashboard para recuperação manual, me avise!
