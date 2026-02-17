-- =====================================================
-- EXECUTE THIS IN SUPABASE SQL EDITOR
-- Partner Analytics - Complete Migration
-- =====================================================

-- STEP 1: Extend events table for item-level analytics
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS item_type TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT;

-- Create composite indexes for item-level queries
CREATE INDEX IF NOT EXISTS idx_events_restaurant_item ON public.events(restaurant_id, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_restaurant_type_date ON public.events(restaurant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_item_type ON public.events(item_id, event_type) WHERE item_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.events.item_id IS 'References menu_items.id for item-specific events (item_view, like, save, share)';
COMMENT ON COLUMN public.events.item_type IS 'Type of item: food, drink, special, etc';
COMMENT ON COLUMN public.events.referrer IS 'Source of traffic (qr_code, social_share, direct, etc)';

-- STEP 2: Create RPC Functions for Partner Analytics

-- 1) Get Partner Summary Metrics
CREATE OR REPLACE FUNCTION get_partner_summary(
  p_restaurant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  profile_views BIGINT,
  item_views BIGINT,
  video_plays BIGINT,
  video_completes BIGINT,
  likes BIGINT,
  saves BIGINT,
  shares BIGINT,
  actions BIGINT,
  mobile_percentage NUMERIC,
  desktop_percentage NUMERIC,
  tablet_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH event_counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'restaurant_profile_view') as profile_views,
      COUNT(*) FILTER (WHERE event_type = 'item_view') as item_views,
      COUNT(*) FILTER (WHERE event_type = 'video_play') as video_plays,
      COUNT(*) FILTER (WHERE event_type = 'video_complete') as video_completes,
      COUNT(*) FILTER (WHERE event_type = 'like') as likes,
      COUNT(*) FILTER (WHERE event_type = 'save') as saves,
      COUNT(*) FILTER (WHERE event_type = 'share') as shares,
      COUNT(*) FILTER (WHERE event_type IN ('directions_click', 'qr_scan')) as actions,
      COUNT(*) FILTER (WHERE device = 'mobile') as mobile_count,
      COUNT(*) FILTER (WHERE device = 'desktop') as desktop_count,
      COUNT(*) FILTER (WHERE device = 'tablet') as tablet_count,
      COUNT(*) as total_events
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  )
  SELECT 
    ec.profile_views,
    ec.item_views,
    ec.video_plays,
    ec.video_completes,
    ec.likes,
    ec.saves,
    ec.shares,
    ec.actions,
    CASE WHEN ec.total_events > 0 THEN ROUND((ec.mobile_count::NUMERIC / ec.total_events::NUMERIC) * 100, 1) ELSE 0 END as mobile_percentage,
    CASE WHEN ec.total_events > 0 THEN ROUND((ec.desktop_count::NUMERIC / ec.total_events::NUMERIC) * 100, 1) ELSE 0 END as desktop_percentage,
    CASE WHEN ec.total_events > 0 THEN ROUND((ec.tablet_count::NUMERIC / ec.total_events::NUMERIC) * 100, 1) ELSE 0 END as tablet_percentage
  FROM event_counts ec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Get Conversion Funnel
CREATE OR REPLACE FUNCTION get_partner_funnel(
  p_restaurant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  step TEXT,
  count BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH funnel_data AS (
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'restaurant_profile_view') as profile_views,
      COUNT(*) FILTER (WHERE event_type = 'item_view') as item_views,
      COUNT(*) FILTER (WHERE event_type = 'video_play') as video_plays,
      COUNT(*) FILTER (WHERE event_type IN ('directions_click', 'qr_scan')) as actions
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  )
  SELECT * FROM (
    SELECT 
      'Profile Views' as step,
      fd.profile_views as count,
      100.0 as conversion_rate
    FROM funnel_data fd
    UNION ALL
    SELECT 
      'Item Views' as step,
      fd.item_views as count,
      CASE WHEN fd.profile_views > 0 THEN ROUND((fd.item_views::NUMERIC / fd.profile_views::NUMERIC) * 100, 1) ELSE 0 END as conversion_rate
    FROM funnel_data fd
    UNION ALL
    SELECT 
      'Video Plays' as step,
      fd.video_plays as count,
      CASE WHEN fd.item_views > 0 THEN ROUND((fd.video_plays::NUMERIC / fd.item_views::NUMERIC) * 100, 1) ELSE 0 END as conversion_rate
    FROM funnel_data fd
    UNION ALL
    SELECT 
      'Actions' as step,
      fd.actions as count,
      CASE WHEN fd.video_plays > 0 THEN ROUND((fd.actions::NUMERIC / fd.video_plays::NUMERIC) * 100, 1) ELSE 0 END as conversion_rate
    FROM funnel_data fd
  ) funnel
  ORDER BY 
    CASE funnel.step
      WHEN 'Profile Views' THEN 1
      WHEN 'Item Views' THEN 2
      WHEN 'Video Plays' THEN 3
      WHEN 'Actions' THEN 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Get Top Performing Items
CREATE OR REPLACE FUNCTION get_partner_top_items(
  p_restaurant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  item_type TEXT,
  views BIGINT,
  video_plays BIGINT,
  video_completes BIGINT,
  likes BIGINT,
  saves BIGINT,
  shares BIGINT,
  engagement_rate NUMERIC,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id as item_id,
    mi.name as item_name,
    COALESCE(mi.category, 'Other') as item_type,
    COUNT(*) FILTER (WHERE e.event_type = 'item_view') as views,
    COUNT(*) FILTER (WHERE e.event_type = 'video_play') as video_plays,
    COUNT(*) FILTER (WHERE e.event_type = 'video_complete') as video_completes,
    COUNT(*) FILTER (WHERE e.event_type = 'like') as likes,
    COUNT(*) FILTER (WHERE e.event_type = 'save') as saves,
    COUNT(*) FILTER (WHERE e.event_type = 'share') as shares,
    CASE 
      WHEN COUNT(*) FILTER (WHERE e.event_type = 'item_view') > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE e.event_type IN ('like', 'save', 'share'))::NUMERIC / 
         COUNT(*) FILTER (WHERE e.event_type = 'item_view')::NUMERIC) * 100, 
        1
      )
      ELSE 0 
    END as engagement_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE e.event_type = 'video_play') > 0 
      THEN ROUND(
        (COUNT(*) FILTER (WHERE e.event_type = 'video_complete')::NUMERIC / 
         COUNT(*) FILTER (WHERE e.event_type = 'video_play')::NUMERIC) * 100, 
        1
      )
      ELSE 0 
    END as completion_rate
  FROM public.menu_items mi
  LEFT JOIN public.events e ON e.item_id = mi.id
    AND e.created_at >= p_start_date
    AND e.created_at <= p_end_date
  WHERE mi.partner_id = p_restaurant_id
  GROUP BY mi.id, mi.name, mi.category
  HAVING COUNT(*) FILTER (WHERE e.event_type = 'item_view') > 0
  ORDER BY views DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Get Peak Hours
CREATE OR REPLACE FUNCTION get_partner_peak_hours(
  p_restaurant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  hour INT,
  views BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM created_at)::INT as hour,
    COUNT(*) as views
  FROM public.events
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND event_type IN ('restaurant_profile_view', 'item_view', 'video_play')
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Get Insights
CREATE OR REPLACE FUNCTION get_partner_insights(
  p_restaurant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  insight_type TEXT,
  insight_text TEXT,
  insight_value TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH top_item AS (
    SELECT 
      mi.name,
      COUNT(*) as views
    FROM public.events e
    JOIN public.menu_items mi ON e.item_id = mi.id
    WHERE e.restaurant_id = p_restaurant_id
      AND e.event_type = 'item_view'
      AND e.created_at >= p_start_date
      AND e.created_at <= p_end_date
    GROUP BY mi.name
    ORDER BY views DESC
    LIMIT 1
  ),
  peak_hour AS (
    SELECT 
      EXTRACT(HOUR FROM created_at)::INT as hour,
      COUNT(*) as views
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND event_type IN ('restaurant_profile_view', 'item_view')
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY views DESC
    LIMIT 1
  ),
  device_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE device = 'mobile') as mobile_count,
      COUNT(*) as total_count
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  )
  SELECT * FROM (
    SELECT 
      'top_item' as insight_type,
      'Your most viewed item this week was: ' || name || ' (' || views || ' views)' as insight_text,
      name as insight_value
    FROM top_item
    WHERE views > 0
    UNION ALL
    SELECT 
      'peak_hour' as insight_type,
      'Peak time: ' || 
        CASE 
          WHEN hour < 12 THEN hour || 'am'
          WHEN hour = 12 THEN '12pm'
          ELSE (hour - 12) || 'pm'
        END || 
        ' with ' || views || ' views' as insight_text,
      hour::TEXT as insight_value
    FROM peak_hour
    WHERE views > 0
    UNION ALL
    SELECT 
      'device' as insight_type,
      'Most engagement came from mobile (' || 
        ROUND((mobile_count::NUMERIC / NULLIF(total_count, 0)::NUMERIC) * 100, 0) || 
        '%)' as insight_text,
      ROUND((mobile_count::NUMERIC / NULLIF(total_count, 0)::NUMERIC) * 100, 0)::TEXT as insight_value
    FROM device_stats
    WHERE total_count > 0
  ) insights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_partner_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_top_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_peak_hours TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_insights TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_partner_summary IS 'Get summary metrics for partner dashboard (profile views, item views, video plays, actions, device breakdown)';
COMMENT ON FUNCTION get_partner_funnel IS 'Get conversion funnel data (Profile Views → Item Views → Video Plays → Actions)';
COMMENT ON FUNCTION get_partner_top_items IS 'Get top performing menu items with engagement and completion rates';
COMMENT ON FUNCTION get_partner_peak_hours IS 'Get hourly view distribution to identify peak hours';
COMMENT ON FUNCTION get_partner_insights IS 'Get auto-generated text insights for partner dashboard';

-- =====================================================
-- DONE! Now test by calling:
-- SELECT * FROM get_partner_summary('your-restaurant-id', NOW() - INTERVAL '7 days', NOW());
-- =====================================================
