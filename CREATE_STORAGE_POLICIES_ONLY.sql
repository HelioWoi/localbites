-- Create Storage Policies for chat-attachments bucket
-- Run this if you already created the bucket manually

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access for chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload for chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Update for chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for chat-attachments" ON storage.objects;

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

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%chat-attachments%';
