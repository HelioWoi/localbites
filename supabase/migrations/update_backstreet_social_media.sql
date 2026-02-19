-- Add social media URLs to Backstreet Cafe for testing
-- Run this in Supabase SQL Editor

UPDATE partners 
SET 
  instagram_url = 'https://www.instagram.com/backstreetcafesc/',
  facebook_url = 'https://www.facebook.com/backstreetcafesc',
  tiktok_url = 'https://www.tiktok.com/@backstreetcafe'
WHERE restaurant_name ILIKE '%backstreet%';

-- Verify the update
SELECT restaurant_name, instagram_url, facebook_url, tiktok_url 
FROM partners 
WHERE restaurant_name ILIKE '%backstreet%';
