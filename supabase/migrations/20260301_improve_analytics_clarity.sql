-- =====================================================
-- ANALYTICS IMPROVEMENTS - CLARITY & TIMEZONE FIX
-- Fix timezone to Brisbane (AEST/AEDT) and improve metric clarity
-- =====================================================

-- 1) Update Peak Hours to use Brisbane timezone (Australia/Brisbane)
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
    -- Convert UTC to Brisbane timezone (AEST/AEDT automatically handled)
    EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Australia/Brisbane'))::INT as hour,
    COUNT(*) as views
  FROM public.events
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND event_type IN ('restaurant_profile_view', 'item_view', 'video_play')
  GROUP BY EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Australia/Brisbane'))
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Update Insights to use Brisbane timezone for peak hour
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
  -- Peak hour (Brisbane timezone)
  peak_hour AS (
    SELECT 
      EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Australia/Brisbane'))::INT as hour,
      COUNT(*) as views
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND event_type IN ('restaurant_profile_view', 'item_view')
    GROUP BY EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Australia/Brisbane'))
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
      '🏆 Most viewed: ' || name || ' (' || views || ' views)' as insight_text,
      name as insight_value
    FROM top_item
    WHERE views > 0
    UNION ALL
    SELECT 
      'peak_hour' as insight_type,
      '⏰ Peak time: ' || 
        CASE 
          WHEN hour = 0 THEN '12am'
          WHEN hour < 12 THEN hour || 'am'
          WHEN hour = 12 THEN '12pm'
          ELSE (hour - 12) || 'pm'
        END || 
        ' (' || views || ' views)' as insight_text,
      hour::TEXT as insight_value
    FROM peak_hour
    WHERE views > 0
    UNION ALL
    SELECT 
      'device' as insight_type,
      '📱 ' || ROUND((mobile_count::NUMERIC / NULLIF(total_count, 0)::NUMERIC) * 100, 0) || 
        '% of views from mobile devices' as insight_text,
      ROUND((mobile_count::NUMERIC / NULLIF(total_count, 0)::NUMERIC) * 100, 0)::TEXT as insight_value
    FROM device_stats
    WHERE total_count > 0
  ) insights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comments with clearer explanations
COMMENT ON FUNCTION get_partner_summary IS 'Summary metrics: Profile Views (people who opened your restaurant page), Item Views (individual dish/video views), Video Plays (video started), Actions (directions clicks + QR scans)';
COMMENT ON FUNCTION get_partner_funnel IS 'Conversion funnel: Profile Views → Item Views (clicked on dishes) → Video Plays (watched videos) → Actions (got directions or scanned QR)';
COMMENT ON FUNCTION get_partner_top_items IS 'Top performing menu items ranked by views, showing which dishes attract the most attention';
COMMENT ON FUNCTION get_partner_peak_hours IS 'Hourly view distribution in Brisbane timezone (AEST/AEDT) - shows when customers are most active';
COMMENT ON FUNCTION get_partner_insights IS 'Auto-generated insights: most viewed item, peak hour (Brisbane time), and device breakdown';
