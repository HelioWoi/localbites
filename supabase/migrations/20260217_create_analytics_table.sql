-- Create analytics table to track page views and visitor data
CREATE TABLE IF NOT EXISTS public.analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Page information
  page_path TEXT NOT NULL,
  page_title TEXT,
  
  -- Referrer information
  referrer TEXT,
  referrer_domain TEXT,
  
  -- User information
  user_agent TEXT,
  device_type TEXT, -- mobile, tablet, desktop
  browser TEXT,
  os TEXT,
  
  -- Location (if available from IP)
  country TEXT,
  city TEXT,
  
  -- Session tracking
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Additional metadata
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  
  -- UTM parameters for marketing tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page_path ON public.analytics(page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_referrer_domain ON public.analytics(referrer_domain);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON public.analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics(user_id);

-- Enable Row Level Security
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert analytics (for tracking)
CREATE POLICY "Anyone can insert analytics"
  ON public.analytics
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Only super admins can read analytics
CREATE POLICY "Super admins can read analytics"
  ON public.analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- Create a view for analytics summary
CREATE OR REPLACE VIEW public.analytics_summary AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_views,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  page_path,
  referrer_domain,
  device_type,
  country
FROM public.analytics
GROUP BY DATE(created_at), page_path, referrer_domain, device_type, country
ORDER BY date DESC;

-- Grant access to the view
GRANT SELECT ON public.analytics_summary TO authenticated;
