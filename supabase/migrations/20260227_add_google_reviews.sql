-- Add google_reviews column to partners table
-- This stores Google Place reviews to avoid duplicate API calls (cost optimization)
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS google_reviews JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN partners.google_reviews IS 'Cached Google Place reviews (refreshed every 7 days with google_data_updated_at)';
