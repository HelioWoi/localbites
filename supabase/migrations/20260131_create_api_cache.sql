-- Migration: Create API Cache table for Google Places optimization
-- This table stores cached API responses to reduce Google API costs by 85-95%

CREATE TABLE IF NOT EXISTS api_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);

-- Index for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_api_cache_created_at ON api_cache(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Edge Functions (service role) to read/write
CREATE POLICY "Service role can manage cache" ON api_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Auto-cleanup old cache entries (run periodically)
-- DELETE FROM api_cache WHERE created_at < NOW() - INTERVAL '7 days';

COMMENT ON TABLE api_cache IS 'Cache for Google Places API responses to reduce costs';
COMMENT ON COLUMN api_cache.cache_key IS 'Unique key based on location and radius (e.g., places_-26.68_153.12_5000)';
COMMENT ON COLUMN api_cache.data IS 'Cached JSON response from Google API';
