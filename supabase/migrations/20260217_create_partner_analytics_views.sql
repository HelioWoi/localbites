-- =====================================================
-- PARTNER ANALYTICS AGGREGATION VIEWS & FUNCTIONS
-- Business Intelligence for Restaurant Owners
-- =====================================================

-- 1) RPC: Get Partner Summary Metrics
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
    profile_views,
    item_views,
    video_plays,
    video_completes,
    likes,
    saves,
    shares,
    actions,
    CASE WHEN total_events > 0 THEN ROUND((mobile_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as mobile_percentage,
    CASE WHEN total_events > 0 THEN ROUND((desktop_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as desktop_percentage,
    CASE WHEN total_events > 0 THEN ROUND((tablet_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as tablet_percentage
  FROM event_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) RPC: Get Conversion Funnel
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
      profile_views as count,
      100.0 as conversion_rate
    FROM funnel_data
    UNION ALL
    SELECT 
      'Item Views' as step,
      item_views as count,
      CASE WHEN profile_views > 0 THEN ROUND((item_views::NUMERIC / profile_views::NUMERIC) * 100, 1) ELSE 0 END as conversion_rate
    FROM funnel_data
    UNION ALL
    SELECT 
      'Video Plays' as step,
      video_plays as count,
      CASE WHEN item_views > 0 THEN ROUND((video_plays::NUMERIC / item_views::NUMERIC) * 100, 1) ELSE 0 END as conversion_rate
    FROM funnel_data
    UNION ALL
    SELECT 
      'Actions' as step,
      actions as count,
      CASE WHEN video_plays > 0 THEN ROUND((actions::NUMERIC / video_plays::NUMERIC) * 100, 1) ELSE 0 END as conversion_rate
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

-- 3) RPC: Get Top Performing Items
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

-- 4) RPC: Get Peak Hours
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

-- 5) RPC: Get Insights (Auto-generated text insights)
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
  -- Most viewed item
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
  -- Peak hour
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
  -- Device breakdown
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
