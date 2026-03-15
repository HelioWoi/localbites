-- =====================================================
-- ANALYTICS FIX V2 - Execute no Supabase SQL Editor
-- =====================================================
-- Corrige erros de "ambiguous column reference"
-- Copie TODO e cole no Supabase SQL Editor

-- Drop existing functions
DROP FUNCTION IF EXISTS get_partner_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_partner_funnel(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_partner_top_items(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS get_partner_peak_hours(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_partner_insights(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

-- Function 1: Get Partner Summary Metrics (FIXED)
CREATE FUNCTION get_partner_summary(
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
      COUNT(*) FILTER (WHERE event_type = 'restaurant_profile_view') as pv,
      COUNT(*) FILTER (WHERE event_type = 'item_view') as iv,
      COUNT(*) FILTER (WHERE event_type = 'video_play') as vp,
      COUNT(*) FILTER (WHERE event_type = 'video_complete') as vc,
      COUNT(*) FILTER (WHERE event_type = 'like') as lk,
      COUNT(*) FILTER (WHERE event_type = 'save') as sv,
      COUNT(*) FILTER (WHERE event_type = 'share') as sh,
      COUNT(*) FILTER (WHERE event_type = 'order_button_click') as oc,
      COUNT(*) FILTER (WHERE event_type = 'directions_click') as dc,
      COUNT(*) FILTER (WHERE event_type = 'qr_scan') as qs,
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
    ec.pv,
    ec.iv,
    ec.vp,
    ec.vc,
    ec.lk,
    ec.sv,
    ec.sh,
    ec.oc,
    ec.dc,
    ec.qs,
    CASE WHEN ec.total_events > 0 THEN ROUND((ec.mobile_count::NUMERIC / ec.total_events::NUMERIC) * 100, 1) ELSE 0 END,
    CASE WHEN ec.total_events > 0 THEN ROUND((ec.desktop_count::NUMERIC / ec.total_events::NUMERIC) * 100, 1) ELSE 0 END,
    CASE WHEN ec.total_events > 0 THEN ROUND((ec.tablet_count::NUMERIC / ec.total_events::NUMERIC) * 100, 1) ELSE 0 END
  FROM event_counts ec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get Conversion Funnel (FIXED)
CREATE FUNCTION get_partner_funnel(
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
      COUNT(*) FILTER (WHERE event_type = 'restaurant_profile_view') as pv,
      COUNT(*) FILTER (WHERE event_type = 'item_view') as iv,
      COUNT(*) FILTER (WHERE event_type = 'video_play') as vp,
      COUNT(*) FILTER (WHERE event_type IN ('order_button_click', 'directions_click', 'qr_scan')) as ac
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  )
  SELECT f.step_name, f.step_count, f.step_rate FROM (
    SELECT 'Profile Views' as step_name, fd.pv as step_count, 100.0 as step_rate FROM funnel_data fd
    UNION ALL
    SELECT 'Item Views', fd.iv, 
      CASE WHEN fd.pv > 0 THEN ROUND((fd.iv::NUMERIC / fd.pv::NUMERIC) * 100, 1) ELSE 0 END
    FROM funnel_data fd
    UNION ALL
    SELECT 'Video Plays', fd.vp,
      CASE WHEN fd.iv > 0 THEN ROUND((fd.vp::NUMERIC / fd.iv::NUMERIC) * 100, 1) ELSE 0 END
    FROM funnel_data fd
    UNION ALL
    SELECT 'Actions', fd.ac,
      CASE WHEN fd.vp > 0 THEN ROUND((fd.ac::NUMERIC / fd.vp::NUMERIC) * 100, 1) ELSE 0 END
    FROM funnel_data fd
  ) f
  ORDER BY 
    CASE f.step_name
      WHEN 'Profile Views' THEN 1
      WHEN 'Item Views' THEN 2
      WHEN 'Video Plays' THEN 3
      WHEN 'Actions' THEN 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get Top Performing Items (FIXED)
CREATE FUNCTION get_partner_top_items(
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
      e.item_id as iid,
      mi.name as iname,
      mi.category as itype,
      COUNT(*) FILTER (WHERE e.event_type = 'item_view') as vws,
      COUNT(*) FILTER (WHERE e.event_type = 'video_play') as vps,
      COUNT(*) FILTER (WHERE e.event_type = 'video_complete') as vcs,
      COUNT(*) FILTER (WHERE e.event_type = 'like') as lks,
      COUNT(*) FILTER (WHERE e.event_type = 'save') as svs,
      COUNT(*) FILTER (WHERE e.event_type = 'share') as shs
    FROM public.events e
    LEFT JOIN public.menu_items mi ON e.item_id = mi.id
    WHERE e.restaurant_id = p_restaurant_id
      AND e.created_at >= p_start_date
      AND e.created_at <= p_end_date
      AND e.item_id IS NOT NULL
    GROUP BY e.item_id, mi.name, mi.category
  )
  SELECT 
    ist.iid,
    ist.iname,
    ist.itype,
    ist.vws,
    ist.vps,
    ist.vcs,
    ist.lks,
    ist.svs,
    ist.shs,
    CASE WHEN ist.vws > 0 THEN ROUND(((ist.lks + ist.svs + ist.shs)::NUMERIC / ist.vws::NUMERIC) * 100, 1) ELSE 0 END,
    CASE WHEN ist.vps > 0 THEN ROUND((ist.vcs::NUMERIC / ist.vps::NUMERIC) * 100, 1) ELSE 0 END
  FROM item_stats ist
  WHERE ist.vws > 0
  ORDER BY ist.vws DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Get Peak Hours (FIXED)
CREATE FUNCTION get_partner_peak_hours(
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
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Australia/Brisbane')::INT as hr,
    COUNT(*) as vws
  FROM public.events
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date
    AND event_type IN ('restaurant_profile_view', 'item_view', 'video_play')
  GROUP BY hr
  ORDER BY hr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Get Insights (FIXED)
CREATE FUNCTION get_partner_insights(
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
  SELECT ins.itype, ins.itext, ins.ivalue FROM (
    SELECT 
      'peak_hour'::TEXT as itype,
      'Peak Hour'::TEXT as itext,
      CASE 
        WHEN v_peak_hour = 0 THEN '12am'
        WHEN v_peak_hour < 12 THEN v_peak_hour || 'am'
        WHEN v_peak_hour = 12 THEN '12pm'
        ELSE (v_peak_hour - 12) || 'pm'
      END as ivalue
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
  ) ins;
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
-- SUCCESS! Analytics functions fixed
-- =====================================================
