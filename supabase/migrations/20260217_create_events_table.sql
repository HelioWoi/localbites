-- Create events table for comprehensive analytics tracking
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  user_session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_value TEXT,
  device TEXT,
  location_city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_restaurant_id ON public.events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_restaurant_type ON public.events(restaurant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_session ON public.events(user_session_id);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert events"
  ON public.events
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Super admins can read all events
CREATE POLICY "Super admins can read all events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.super_admins)
  );

-- Policy: Restaurants can only read their own events
CREATE POLICY "Restaurants can read own events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

-- Create materialized view for faster aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS public.events_daily_summary AS
SELECT 
  DATE(created_at) as date,
  restaurant_id,
  event_type,
  device,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_session_id) as unique_sessions
FROM public.events
GROUP BY DATE(created_at), restaurant_id, event_type, device;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_events_daily_summary_date ON public.events_daily_summary(date DESC);
CREATE INDEX IF NOT EXISTS idx_events_daily_summary_restaurant ON public.events_daily_summary(restaurant_id);

-- Function to refresh materialized view (call this periodically)
CREATE OR REPLACE FUNCTION refresh_events_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.events_daily_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.events_daily_summary TO authenticated;
