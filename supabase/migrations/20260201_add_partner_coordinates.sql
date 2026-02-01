-- Add latitude and longitude columns to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_partners_location ON partners(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment
COMMENT ON COLUMN partners.latitude IS 'Restaurant latitude coordinate for distance calculations';
COMMENT ON COLUMN partners.longitude IS 'Restaurant longitude coordinate for distance calculations';

-- Update Helio's Bar with Mooloolaba coordinates (16 Smith Street)
UPDATE partners 
SET latitude = -26.6811, longitude = 153.1214 
WHERE email = 'heliocwoi@gmail.com';
