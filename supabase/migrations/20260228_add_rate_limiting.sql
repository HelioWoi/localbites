-- Create table for API rate limiting
-- Protects against excessive API calls from social media traffic spikes

CREATE TABLE IF NOT EXISTS api_rate_limits (
  identifier TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient cleanup of old records
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_created_at 
ON api_rate_limits(created_at);

-- Add comment for documentation
COMMENT ON TABLE api_rate_limits IS 'Rate limiting for Google Places API calls - prevents excessive costs from social media traffic';
COMMENT ON COLUMN api_rate_limits.identifier IS 'IP address or user ID';
COMMENT ON COLUMN api_rate_limits.count IS 'Number of requests in current window';
COMMENT ON COLUMN api_rate_limits.created_at IS 'Window start time';
