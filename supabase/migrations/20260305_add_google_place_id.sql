-- Add google_place_id column to partners table for persistent Google Place ID storage
-- This enables reliable lookups without re-searching every time

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS google_place_id TEXT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_google_place_id ON partners(google_place_id);

-- Add comment for documentation
COMMENT ON COLUMN partners.google_place_id IS 'Google Place ID for reliable API lookups. Populated automatically on first successful search.';
