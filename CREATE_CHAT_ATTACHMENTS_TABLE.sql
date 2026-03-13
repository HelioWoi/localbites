-- Create chat_attachments table for storing file uploads in chat conversations
CREATE TABLE IF NOT EXISTS public.chat_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('user', 'agent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_attachments_session ON public.chat_attachments(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON public.chat_attachments(message_id);

-- Enable Row Level Security
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- Policies (allow all operations for chat attachments - no auth required)
DROP POLICY IF EXISTS "Anyone can read attachments" ON public.chat_attachments;
DROP POLICY IF EXISTS "Anyone can insert attachments" ON public.chat_attachments;

CREATE POLICY "Enable read access for all users"
    ON public.chat_attachments FOR SELECT 
    TO public
    USING (true);

CREATE POLICY "Enable insert access for all users"
    ON public.chat_attachments FOR INSERT 
    TO public
    WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
    ON public.chat_attachments FOR UPDATE 
    TO public
    USING (true);

CREATE POLICY "Enable delete access for all users"
    ON public.chat_attachments FOR DELETE 
    TO public
    USING (true);

-- Create storage bucket for chat attachments (run this in Supabase Dashboard > Storage)
-- Bucket name: chat-attachments
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, application/pdf
