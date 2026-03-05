-- Fix menu-videos bucket permissions for production
-- This ensures images and videos can be accessed publicly

-- Create menu-videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-videos', 'menu-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access to menu-videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to menu-videos" ON storage.objects;
DROP POLICY IF EXISTS "Partners can upload to menu-videos" ON storage.objects;
DROP POLICY IF EXISTS "Partners can delete from menu-videos" ON storage.objects;

-- Allow public read access to menu-videos bucket
CREATE POLICY "Public read access to menu-videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-videos');

-- Allow authenticated users to upload to menu-videos bucket
CREATE POLICY "Authenticated users can upload to menu-videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-videos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update menu-videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-videos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete menu-videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-videos');
