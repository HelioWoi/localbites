-- Add google_place_id column to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS google_place_id TEXT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_google_place_id ON partners(google_place_id);

-- TEMPORARY: Add Place ID manually for Decisions Cafe
-- This will be replaced by automatic resolver once it's working
-- You can find the exact restaurant_name by running: SELECT id, restaurant_name FROM partners WHERE restaurant_name ILIKE '%decision%';
UPDATE partners 
SET google_place_id = 'ChIJXxW7WqpakWsRLCvEq8T8kPo'
WHERE restaurant_name ILIKE '%decision%'
  AND google_place_id IS NULL;
