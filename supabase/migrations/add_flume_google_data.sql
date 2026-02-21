-- Add Google Place ID and Maps URL to Flume by the River
-- This will enable reviews and directions functionality
-- Data from Google Places API search on 2026-02-21

UPDATE partners
SET 
  google_place_id = 'ChIJ2xk-KKB3k2sR61ntTxoGZrg',
  google_maps_url = 'https://maps.google.com/?cid=13287314460683098603&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA',
  rating = 4.3,
  total_reviews = 263
WHERE email = 'flumedining@gmail.com';

-- Verify the update
SELECT 
  id, 
  email, 
  restaurant_name, 
  google_place_id,
  google_maps_url,
  rating,
  total_reviews
FROM partners
WHERE email = 'flumedining@gmail.com';
