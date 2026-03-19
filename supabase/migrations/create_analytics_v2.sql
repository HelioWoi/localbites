-- ============================================================================
-- ANALYTICS V2 - Fresh Start Analytics System
-- ============================================================================
-- This migration creates a new analytics system that runs in parallel
-- with the existing system. It does NOT touch or modify existing tables.
-- Only the Partner Analytics page will read from this new system.
-- ============================================================================

-- 1. Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('view', 'play', 'like', 'save', 'order_click', 'qr_scan', 'profile_view', 'share', 'directions_click', 'phone_call')),
  item_id uuid,
  restaurant_id uuid NOT NULL,
  user_id uuid,
  session_id text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('mobile', 'desktop')),
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_restaurant_id ON analytics_events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_id ON analytics_events(item_id) WHERE item_id IS NOT NULL;

-- 3. Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_restaurant_type_date 
  ON analytics_events(restaurant_id, event_type, created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- Partners can only see their own restaurant's analytics
CREATE POLICY "Partners can view own analytics"
  ON analytics_events
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

-- Allow inserts from authenticated and anonymous users (for tracking)
CREATE POLICY "Allow analytics tracking"
  ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- 6. Add comment explaining the cutover
COMMENT ON TABLE analytics_events IS 'Analytics V2 - Fresh start analytics system. Cutover date: 2026-03-19. Only data from this date forward is used in Partner Analytics page.';
