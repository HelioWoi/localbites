-- Separate Directions and QR Scans in Analytics
-- This migration updates the partner analytics functions to track directions_click and qr_scan separately

-- Update get_partner_summary to separate directions and QR scans
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
    directions_clicks,
    qr_scans,
    CASE WHEN total_events > 0 THEN ROUND((mobile_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as mobile_percentage,
    CASE WHEN total_events > 0 THEN ROUND((desktop_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as desktop_percentage,
    CASE WHEN total_events > 0 THEN ROUND((tablet_count::NUMERIC / total_events::NUMERIC) * 100, 1) ELSE 0 END as tablet_percentage
  FROM event_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_partner_funnel to separate directions and QR scans
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
DECLARE
  total_profile_views BIGINT;
BEGIN
  -- Get total profile views for conversion calculation
  SELECT COUNT(*) INTO total_profile_views
  FROM public.events
  WHERE restaurant_id = p_restaurant_id
    AND event_type = 'restaurant_profile_view'
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- Return funnel steps with conversion rates
  RETURN QUERY
  SELECT 
    step_name::TEXT,
    step_count,
    CASE 
      WHEN total_profile_views > 0 THEN ROUND((step_count::NUMERIC / total_profile_views::NUMERIC) * 100, 1)
      ELSE 0 
    END as conversion_rate
  FROM (
    SELECT 'Profile Views' as step_name, 
      COUNT(*) FILTER (WHERE event_type = 'restaurant_profile_view') as step_count
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
    
    UNION ALL
    
    SELECT 'Item Views', 
      COUNT(*) FILTER (WHERE event_type = 'item_view')
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
    
    UNION ALL
    
    SELECT 'Video Plays', 
      COUNT(*) FILTER (WHERE event_type = 'video_play')
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
    
    UNION ALL
    
    SELECT 'Directions', 
      COUNT(*) FILTER (WHERE event_type = 'directions_click')
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
    
    UNION ALL
    
    SELECT 'QR Scans', 
      COUNT(*) FILTER (WHERE event_type = 'qr_scan')
    FROM public.events
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ) funnel_data
  ORDER BY 
    CASE step_name
      WHEN 'Profile Views' THEN 1
      WHEN 'Item Views' THEN 2
      WHEN 'Video Plays' THEN 3
      WHEN 'Directions' THEN 4
      WHEN 'QR Scans' THEN 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
