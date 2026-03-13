-- Create Storage Policies for chat-attachments bucket
-- This allows public uploads and reads without authentication

-- IMPORTANT: First create the bucket manually in Supabase Dashboard:
-- Storage → New bucket → Name: "chat-attachments" → Public: YES

-- Then run this SQL to create the policies:

-- Policy 1: Allow anyone to upload files (INSERT)
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES (
  'Allow public uploads to chat-attachments',
  'chat-attachments',
  'true',
  'true'
)
ON CONFLICT (bucket_id, name) DO UPDATE
SET definition = 'true', check_definition = 'true';

-- Policy 2: Allow anyone to read/download files (SELECT)
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Allow public reads from chat-attachments',
  'chat-attachments',
  'true'
)
ON CONFLICT (bucket_id, name) DO UPDATE
SET definition = 'true';

-- Policy 3: Allow anyone to update files (UPDATE)
INSERT INTO storage.policies (name, bucket_id, definition, check_definition)
VALUES (
  'Allow public updates to chat-attachments',
  'chat-attachments',
  'true',
  'true'
)
ON CONFLICT (bucket_id, name) DO UPDATE
SET definition = 'true', check_definition = 'true';

-- Policy 4: Allow anyone to delete files (DELETE)
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Allow public deletes from chat-attachments',
  'chat-attachments',
  'true'
)
ON CONFLICT (bucket_id, name) DO UPDATE
SET definition = 'true';

-- Verify policies were created
SELECT * FROM storage.policies WHERE bucket_id = 'chat-attachments';
