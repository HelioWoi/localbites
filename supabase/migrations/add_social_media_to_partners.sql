-- Add social media columns to partners table
-- Run this in Supabase SQL Editor

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN partners.instagram_url IS 'Instagram profile URL (e.g., https://instagram.com/restaurant)';
COMMENT ON COLUMN partners.facebook_url IS 'Facebook page URL (e.g., https://facebook.com/restaurant)';
COMMENT ON COLUMN partners.tiktok_url IS 'TikTok profile URL (e.g., https://tiktok.com/@restaurant)';
