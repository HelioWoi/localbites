-- Enable public access to media bucket for video playback
-- This allows videos to be played in the feed without authentication

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to media bucket" ON storage.objects;

-- Create policy for public read access to media bucket
CREATE POLICY "Public read access to media bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Ensure bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'media';
