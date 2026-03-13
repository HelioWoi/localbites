-- Create Storage Policies for chat-attachments bucket
-- Run this AFTER creating the bucket manually in Supabase Dashboard

-- STEP 1: Create the bucket first (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- STEP 2: Create policies using storage.objects table
-- These policies control access to files in the bucket

-- Policy 1: Allow public SELECT (read/download)
CREATE POLICY "Public Access for chat-attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Policy 2: Allow public INSERT (upload)
CREATE POLICY "Public Upload for chat-attachments"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'chat-attachments');

-- Policy 3: Allow public UPDATE
CREATE POLICY "Public Update for chat-attachments"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'chat-attachments')
WITH CHECK (bucket_id = 'chat-attachments');

-- Policy 4: Allow public DELETE
CREATE POLICY "Public Delete for chat-attachments"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'chat-attachments');

-- Verify bucket and policies
SELECT * FROM storage.buckets WHERE id = 'chat-attachments';
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%chat-attachments%';
