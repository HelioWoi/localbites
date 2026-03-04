-- Add Order Clicks to Partner Analytics
-- This migration updates get_partner_summary to include order_button_click tracking

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

-- Update function comment
COMMENT ON FUNCTION get_partner_summary IS 'Summary metrics: Profile Views, Item Views, Video Plays, Actions (order clicks, directions, QR scans), and device breakdown';
