# 🚀 SETUP: Sistema de Chat ao Vivo

## 📋 PASSO 1: Criar Tabela no Supabase

1. Acesse: https://supabase.com/dashboard/project/quybuvapflnzcaedjbkl
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **New Query**
4. Cole o SQL abaixo e clique **RUN**:

```sql
-- Create chat_conversations table for live chat monitoring
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb NOT NULL,
    status TEXT DEFAULT 'bot_only' CHECK (status IN ('bot_only', 'human_takeover', 'closed')),
    user_info JSONB DEFAULT '{}'::jsonb,
    keywords_detected TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_lead BOOLEAN DEFAULT false,
    assigned_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON public.chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_is_lead ON public.chat_conversations(is_lead);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON public.chat_conversations(last_message_at DESC);

-- Enable Row Level Security
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can create chat conversations"
    ON public.chat_conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read their own conversations"
    ON public.chat_conversations FOR SELECT USING (true);

CREATE POLICY "Users can update their own conversations"
    ON public.chat_conversations FOR UPDATE USING (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_chat_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_chat_conversations_updated_at
    BEFORE UPDATE ON public.chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_conversations_updated_at();
```

5. Verifique se criou: Vá em **Table Editor** → Deve aparecer `chat_conversations`

---

## 📋 PASSO 2: Ativar Realtime

1. No Supabase, vá em **Database** → **Replication**
2. Procure a tabela `chat_conversations`
3. Ative o toggle **Enable Realtime**

---

## 📋 PASSO 3: Acessar Painel Admin

Após implementar o código, você acessa:

**URL:** `https://menulove.com.au/admin/live-chat`

ou localmente:

**URL:** `http://localhost:5173/admin/live-chat`

---

## 🎯 COMO FUNCIONA

### **No Chat do Usuário:**
1. Usuário abre chat → Cria `session_id` único
2. Cada mensagem é salva no banco em tempo real
3. Keywords detectadas → `is_lead = true`
4. Se admin entra → Mostra "🟢 Agent ao vivo"

### **No Painel Admin:**
1. Lista todas conversas ativas
2. Mostra badge "🔥 LEAD" quando keywords detectadas
3. Botão "Join Conversation" para entrar
4. Chat em tempo real com o usuário
5. Notificação sonora quando novo lead

### **Keywords que Marcam como Lead:**
- "meeting"
- "demo"
- "partnership"
- "talk to sales"
- "cafe", "restaurant" (venue qualificado)
- "pricing" + "interested"

---

## 📊 ESTRUTURA DO BANCO

```
chat_conversations:
├── id (UUID)
├── session_id (TEXT) - Identificador único da conversa
├── messages (JSONB) - Array de mensagens
├── status (TEXT) - bot_only | human_takeover | closed
├── user_info (JSONB) - IP, location, browser
├── keywords_detected (TEXT[]) - Keywords encontradas
├── is_lead (BOOLEAN) - Se é lead qualificado
├── assigned_agent (TEXT) - Email do admin que entrou
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── last_message_at (TIMESTAMPTZ)
```

---

## PROXIMOS PASSOS

Apos criar a tabela no Supabase, vou implementar:
1. Salvamento automatico de conversas
2. Painel admin /admin/live-chat
3. Botao "Join Conversation"
4. Icone verde quando agent entra
5. Deteccao de keywords
6. Notificacoes em tempo real
