-- Add last_fetched_at column to api_cache table
-- Used for stale-while-revalidate cache strategy

ALTER TABLE api_cache 
ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ;

-- Update existing records to use created_at as last_fetched_at
UPDATE api_cache 
SET last_fetched_at = created_at 
WHERE last_fetched_at IS NULL;

-- Add index for efficient cache age queries
CREATE INDEX IF NOT EXISTS idx_api_cache_last_fetched_at 
ON api_cache(last_fetched_at);

COMMENT ON COLUMN api_cache.last_fetched_at IS 'Timestamp of last API fetch (used for stale-while-revalidate)';
