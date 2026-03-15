-- =====================================================
-- ANALYTICS IMPROVEMENTS - Execute no Supabase SQL Editor
-- =====================================================
-- Copie TODO este arquivo e cole no Supabase SQL Editor
-- Depois clique em RUN

-- STEP 1: Add missing columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS item_type TEXT;

-- STEP 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_item_id ON public.events(item_id);
CREATE INDEX IF NOT EXISTS idx_events_referrer ON public.events(referrer);
CREATE INDEX IF NOT EXISTS idx_events_item_type ON public.events(item_type);

-- STEP 3: Add comments
COMMENT ON COLUMN public.events.item_id IS 'Reference to menu item (dish/video) being viewed';
COMMENT ON COLUMN public.events.referrer IS 'Traffic source: qr, link, search, social, direct';
COMMENT ON COLUMN public.events.item_type IS 'Category/type of the item being viewed';

-- =====================================================
-- STEP 4: Create Analytics Functions
-- =====================================================

-- Function 1: Get Partner Summary Metrics
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
  order_clicks BIGINT,
  directions_clicks BIGINT,
  qr_scans BIGINT,
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
      COUNT(*) FILTER (WHERE event_type = 'order_button_click') as order_clicks,
      COUNT(*) FILTER (WHERE event_type = 'directions_click') as directions_clicks,
      COUNT(*) FILTER (WHERE event_type = 'qr_scan') as qr_scans,
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
    profile_views,
    item_views,
    video_plays,
    video_completes,
    likes,
    saves,
    shares,
    order_clicks,
    directions_clicks,
    qr_scans,
    CASE WHEN total_events > 0 THEN ROUND((mobile_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as mobile_percentage,
    CASE WHEN total_events > 0 THEN ROUND((desktop_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as desktop_percentage,
    CASE WHEN total_events > 0 THEN ROUND((tablet_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as tablet_percentage
  FROM event_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get Conversion Funnel
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
      COUNT(*) FILTER (WHERE event_type IN ('order_button_click', 'directions_click', 'qr_scan')) as actions
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  )
  SELECT * FROM (
    SELECT 'Profile Views' as step, profile_views as count, 100.0 as conversion_rate FROM funnel_data
    UNION ALL
    SELECT 'Item Views', item_views, 
      CASE WHEN profile_views > 0 THEN ROUND((item_views::NUMERIC / profile_views::NUMERIC) * 100, 1) ELSE 0 END
    FROM funnel_data
    UNION ALL
    SELECT 'Video Plays', video_plays,
      CASE WHEN item_views > 0 THEN ROUND((video_plays::NUMERIC / item_views::NUMERIC) * 100, 1) ELSE 0 END
    FROM funnel_data
    UNION ALL
    SELECT 'Actions', actions,
      CASE WHEN video_plays > 0 THEN ROUND((actions::NUMERIC / video_plays::NUMERIC) * 100, 1) ELSE 0 END
    FROM funnel_data
  ) funnel
  ORDER BY 
    CASE step
      WHEN 'Profile Views' THEN 1
      WHEN 'Item Views' THEN 2
      WHEN 'Video Plays' THEN 3
      WHEN 'Actions' THEN 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get Top Performing Items
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
  WITH item_stats AS (
    SELECT 
      e.item_id,
      mi.name as item_name,
      mi.category as item_type,
      COUNT(*) FILTER (WHERE e.event_type = 'item_view') as views,
      COUNT(*) FILTER (WHERE e.event_type = 'video_play') as video_plays,
      COUNT(*) FILTER (WHERE e.event_type = 'video_complete') as video_completes,
      COUNT(*) FILTER (WHERE e.event_type = 'like') as likes,
      COUNT(*) FILTER (WHERE e.event_type = 'save') as saves,
      COUNT(*) FILTER (WHERE e.event_type = 'share') as shares
    FROM public.events e
    LEFT JOIN public.menu_items mi ON e.item_id = mi.id
    WHERE e.restaurant_id = p_restaurant_id
      AND e.created_at >= p_start_date
      AND e.created_at <= p_end_date
      AND e.item_id IS NOT NULL
    GROUP BY e.item_id, mi.name, mi.category
  )
  SELECT 
    item_id,
    item_name,
    item_type,
    views,
    video_plays,
    video_completes,
    likes,
    saves,
    shares,
    CASE WHEN views > 0 THEN ROUND(((likes + saves + shares)::NUMERIC / views::NUMERIC) * 100, 1) ELSE 0 END as engagement_rate,
    CASE WHEN video_plays > 0 THEN ROUND((video_completes::NUMERIC / video_plays::NUMERIC) * 100, 1) ELSE 0 END as completion_rate
  FROM item_stats
  WHERE views > 0
  ORDER BY views DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Get Peak Hours
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
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Australia/Brisbane')::INT as hour,
    COUNT(*) as views
  FROM public.events
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND event_type IN ('restaurant_profile_view', 'item_view', 'video_play')
  GROUP BY hour
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Get Insights
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
DECLARE
  v_profile_views BIGINT;
  v_item_views BIGINT;
  v_video_plays BIGINT;
  v_peak_hour INT;
  v_peak_views BIGINT;
  v_mobile_pct NUMERIC;
  v_top_item_name TEXT;
  v_top_item_views BIGINT;
BEGIN
  -- Get summary metrics
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'restaurant_profile_view'),
    COUNT(*) FILTER (WHERE event_type = 'item_view'),
    COUNT(*) FILTER (WHERE event_type = 'video_play'),
    ROUND((COUNT(*) FILTER (WHERE device = 'mobile')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 1)
  INTO v_profile_views, v_item_views, v_video_plays, v_mobile_pct
  FROM public.events
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- Get peak hour
  SELECT 
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Australia/Brisbane')::INT,
    COUNT(*)
  INTO v_peak_hour, v_peak_views
  FROM public.events
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND event_type IN ('restaurant_profile_view', 'item_view', 'video_play')
  GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Australia/Brisbane')
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Get top item
  SELECT mi.name, COUNT(*)
  INTO v_top_item_name, v_top_item_views
  FROM public.events e
  LEFT JOIN public.menu_items mi ON e.item_id = mi.id
  WHERE e.restaurant_id = p_restaurant_id
    AND e.created_at >= p_start_date
    AND e.created_at <= p_end_date
    AND e.item_id IS NOT NULL
    AND e.event_type = 'item_view'
  GROUP BY mi.name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Return insights
  RETURN QUERY
  SELECT * FROM (
    SELECT 
      'peak_hour'::TEXT,
      'Peak Hour'::TEXT,
      CASE 
        WHEN v_peak_hour = 0 THEN '12am'
        WHEN v_peak_hour < 12 THEN v_peak_hour || 'am'
        WHEN v_peak_hour = 12 THEN '12pm'
        ELSE (v_peak_hour - 12) || 'pm'
      END
    WHERE v_peak_hour IS NOT NULL
    UNION ALL
    SELECT 
      'mobile_traffic'::TEXT,
      'Mobile Traffic'::TEXT,
      COALESCE(v_mobile_pct::TEXT || '%', '0%')
    UNION ALL
    SELECT 
      'top_item'::TEXT,
      'Most Viewed Item'::TEXT,
      COALESCE(v_top_item_name || ' (' || v_top_item_views || ' views)', 'No data')
  ) insights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_partner_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_top_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_peak_hours TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_insights TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_partner_summary IS 'Summary metrics: Profile Views, Item Views, Video Plays, Actions, device breakdown';
COMMENT ON FUNCTION get_partner_funnel IS 'Conversion funnel: Profile Views → Item Views → Video Plays → Actions';
COMMENT ON FUNCTION get_partner_top_items IS 'Top performing menu items with engagement and completion rates';
COMMENT ON FUNCTION get_partner_peak_hours IS 'Hourly view distribution in Brisbane timezone';
COMMENT ON FUNCTION get_partner_insights IS 'Auto-generated insights about peak hours, mobile traffic, and top items';

-- =====================================================
-- DONE! Analytics is now fully configured
-- =====================================================
-- Next: Test with this query (replace YOUR_RESTAURANT_ID):
-- SELECT * FROM get_partner_summary('YOUR_RESTAURANT_ID', NOW() - INTERVAL '7 days', NOW());
