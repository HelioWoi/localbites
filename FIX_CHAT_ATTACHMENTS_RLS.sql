-- Fix RLS policies for chat_attachments to allow uploads without authentication errors
-- Run this in Supabase SQL Editor to fix the "new row violates row-level security policy" error

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read attachments" ON public.chat_attachments;
DROP POLICY IF EXISTS "Anyone can insert attachments" ON public.chat_attachments;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chat_attachments;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.chat_attachments;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.chat_attachments;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.chat_attachments;

-- Create new permissive policies
CREATE POLICY "Allow all operations on chat_attachments"
    ON public.chat_attachments
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Also configure Storage Bucket policies in Supabase Dashboard
-- Go to: Storage → chat-attachments → Policies
-- Add policy: "Allow public uploads"
--   Operation: INSERT
--   Policy definition: true
-- Add policy: "Allow public reads"
--   Operation: SELECT
--   Policy definition: true
