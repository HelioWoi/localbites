-- Create blocked_places table to exclude removed restaurants from search
CREATE TABLE IF NOT EXISTS blocked_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_place_id TEXT NOT NULL UNIQUE,
  business_name TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE blocked_places ENABLE ROW LEVEL SECURITY;

-- Edge Functions (service role) can read blocked places
CREATE POLICY "Service role can manage blocked places" ON blocked_places
  FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookup during search
CREATE INDEX idx_blocked_places_google_id ON blocked_places(google_place_id);
