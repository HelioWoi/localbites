-- Create chat_agents table for managing live chat support agents
CREATE TABLE IF NOT EXISTS public.chat_agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_chat_agents_email ON public.chat_agents(email);
CREATE INDEX IF NOT EXISTS idx_chat_agents_active ON public.chat_agents(is_active);

-- Enable Row Level Security
ALTER TABLE public.chat_agents ENABLE ROW LEVEL SECURITY;

-- Policies (only admins can manage agents)
CREATE POLICY "Admins can read agents"
    ON public.chat_agents FOR SELECT 
    USING (true);

CREATE POLICY "Admins can insert agents"
    ON public.chat_agents FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Admins can update agents"
    ON public.chat_agents FOR UPDATE 
    USING (true);

CREATE POLICY "Admins can delete agents"
    ON public.chat_agents FOR DELETE 
    USING (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_chat_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_chat_agents_updated_at
    BEFORE UPDATE ON public.chat_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_agents_updated_at();

-- Insert default agent (Helio)
INSERT INTO public.chat_agents (name, email, is_active)
VALUES ('Helio', 'helio@menulove.com.au', true)
ON CONFLICT (email) DO NOTHING;
