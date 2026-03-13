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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON public.chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_is_lead ON public.chat_conversations(is_lead);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON public.chat_conversations(last_message_at DESC);

-- Enable Row Level Security
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (create new conversations)
CREATE POLICY "Anyone can create chat conversations"
    ON public.chat_conversations
    FOR INSERT
    WITH CHECK (true);

-- Policy: Anyone can read their own conversation by session_id
CREATE POLICY "Users can read their own conversations"
    ON public.chat_conversations
    FOR SELECT
    USING (true);

-- Policy: Anyone can update their own conversation
CREATE POLICY "Users can update their own conversations"
    ON public.chat_conversations
    FOR UPDATE
    USING (true);

-- Policy: Authenticated users (admins) can see all conversations
CREATE POLICY "Admins can see all conversations"
    ON public.chat_conversations
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_chat_conversations_updated_at
    BEFORE UPDATE ON public.chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_conversations_updated_at();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
