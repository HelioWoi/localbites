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
