-- Add google_place_id column to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_google_place_id ON partners(google_place_id);

-- Update Flume by the River with Google Place data
UPDATE partners
SET 
  google_place_id = 'ChIJ2xk-KKB3k2sR61ntTxoGZrg',
  google_maps_url = 'https://maps.google.com/?cid=13287314460683098603',
  rating = 4.3,
  total_reviews = 263
WHERE email = 'flumedining@gmail.com';

-- Note: Automatic Google Place ID lookup will be handled by the application
-- when partners update their restaurant information in Settings
