-- Venue Refresh Queue System
-- Implements stale-while-revalidate with controlled daily budget

-- Table: venue_refresh_queue
-- Tracks which cache entries need background refresh
CREATE TABLE IF NOT EXISTS venue_refresh_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('sunshine', 'brisbane')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_venue_refresh_queue_status 
ON venue_refresh_queue(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_venue_refresh_queue_requested_at 
ON venue_refresh_queue(requested_at);

CREATE INDEX IF NOT EXISTS idx_venue_refresh_queue_cache_key 
ON venue_refresh_queue(cache_key);

-- Table: daily_refresh_budget
-- Controls daily API call quota to keep costs under $100/month
-- 50 calls/day = ~1500/month = ~$48/month at $0.032/call
CREATE TABLE IF NOT EXISTS daily_refresh_budget (
  day DATE PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0,
  limit_quota INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for current day lookup
CREATE INDEX IF NOT EXISTS idx_daily_refresh_budget_day 
ON daily_refresh_budget(day DESC);

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_venue_refresh_queue_updated_at ON venue_refresh_queue;
CREATE TRIGGER update_venue_refresh_queue_updated_at
  BEFORE UPDATE ON venue_refresh_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_refresh_budget_updated_at ON daily_refresh_budget;
CREATE TRIGGER update_daily_refresh_budget_updated_at
  BEFORE UPDATE ON daily_refresh_budget
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Enqueue refresh request (truly idempotent - anti-spam)
CREATE OR REPLACE FUNCTION enqueue_venue_refresh(
  p_cache_key TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_region TEXT
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_existing_status TEXT;
BEGIN
  -- Check if already exists
  SELECT id, status INTO v_id, v_existing_status
  FROM venue_refresh_queue
  WHERE cache_key = p_cache_key;
  
  IF v_id IS NOT NULL THEN
    -- Already exists
    IF v_existing_status = 'pending' THEN
      -- Already pending - just update requested_at (bump priority)
      UPDATE venue_refresh_queue
      SET requested_at = NOW()
      WHERE id = v_id;
      
      RETURN v_id;
    ELSIF v_existing_status IN ('done', 'failed') THEN
      -- Was done/failed - reset to pending
      UPDATE venue_refresh_queue
      SET 
        status = 'pending',
        requested_at = NOW(),
        attempts = 0,
        error_message = NULL
      WHERE id = v_id;
      
      RETURN v_id;
    ELSE
      -- Processing - don't interfere, just return existing ID
      RETURN v_id;
    END IF;
  ELSE
    -- Doesn't exist - insert new
    INSERT INTO venue_refresh_queue (cache_key, lat, lng, region, status, requested_at)
    VALUES (p_cache_key, p_lat, p_lng, p_region, 'pending', NOW())
    RETURNING id INTO v_id;
    
    RETURN v_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Check daily budget
CREATE OR REPLACE FUNCTION check_daily_budget()
RETURNS TABLE(can_refresh BOOLEAN, used INTEGER, limit_quota INTEGER, remaining INTEGER) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get or create today's budget (default 50 calls/day)
  INSERT INTO daily_refresh_budget (day, used, limit_quota)
  VALUES (v_today, 0, 50)
  ON CONFLICT (day) DO NOTHING;
  
  -- Get current usage
  SELECT daily_refresh_budget.used, daily_refresh_budget.limit_quota
  INTO v_used, v_limit
  FROM daily_refresh_budget
  WHERE day = v_today;
  
  RETURN QUERY SELECT 
    (v_used < v_limit) as can_refresh,
    v_used,
    v_limit,
    (v_limit - v_used) as remaining;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment daily budget usage
CREATE OR REPLACE FUNCTION increment_daily_budget(p_count INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_new_used INTEGER;
BEGIN
  INSERT INTO daily_refresh_budget (day, used, limit_quota)
  VALUES (v_today, p_count, 50)
  ON CONFLICT (day) DO UPDATE
  SET used = daily_refresh_budget.used + p_count
  RETURNING used INTO v_new_used;
  
  RETURN v_new_used;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE venue_refresh_queue IS 'Queue for background venue cache refresh (stale-while-revalidate)';
COMMENT ON TABLE daily_refresh_budget IS 'Daily API call quota to keep costs under $100/month (50 calls/day = ~1500/month = ~$48/month)';
COMMENT ON COLUMN venue_refresh_queue.cache_key IS 'Unique cache identifier (e.g., places_-26.650_153.066_5000)';
COMMENT ON COLUMN venue_refresh_queue.region IS 'Geographic region: sunshine or brisbane';
COMMENT ON COLUMN daily_refresh_budget.limit_quota IS 'Max API calls per day (default 50 = ~$48/month at $0.032/call)';
