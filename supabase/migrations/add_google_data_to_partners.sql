-- Add Google Places data columns to partners table
-- This allows caching Google data to avoid duplicate API calls
-- Run this in Supabase SQL Editor

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS google_opening_hours TEXT[], -- Array of opening hours from Google
ADD COLUMN IF NOT EXISTS google_phone TEXT,
ADD COLUMN IF NOT EXISTS google_website TEXT,
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS google_total_reviews INTEGER,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS google_data_updated_at TIMESTAMP WITH TIME ZONE; -- Track when Google data was last updated

-- Add comments for documentation
COMMENT ON COLUMN partners.google_opening_hours IS 'Opening hours from Google Places API (cached to avoid duplicate calls)';
COMMENT ON COLUMN partners.google_phone IS 'Phone number from Google Places API';
COMMENT ON COLUMN partners.google_website IS 'Website URL from Google Places API';
COMMENT ON COLUMN partners.google_rating IS 'Rating from Google Places API (1.0-5.0)';
COMMENT ON COLUMN partners.google_total_reviews IS 'Total number of reviews from Google Places API';
COMMENT ON COLUMN partners.google_maps_url IS 'Google Maps URL from Google Places API';
COMMENT ON COLUMN partners.google_data_updated_at IS 'Timestamp of last Google Places API data update';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_partners_google_updated ON partners(google_data_updated_at);
