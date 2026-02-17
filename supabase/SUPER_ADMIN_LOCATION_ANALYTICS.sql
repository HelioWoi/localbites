-- =====================================================
-- SUPER ADMIN ANALYTICS - LOCATION & HOURLY ACTIVITY
-- Execute this in Supabase SQL Editor
-- =====================================================

-- 1) Get Top Locations (Cities)
CREATE OR REPLACE FUNCTION get_top_locations(p_days INT DEFAULT 7)
RETURNS TABLE (
  location TEXT,
  views BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH location_counts AS (
    SELECT 
      COALESCE(location_city, 'Unknown') as city,
      COUNT(*) as count
    FROM public.events
    WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND event_type IN ('restaurant_profile_view', 'item_view', 'search_performed')
    GROUP BY city
  ),
  total_count AS (
    SELECT SUM(count) as total FROM location_counts
  )
  SELECT 
    lc.city as location,
    lc.count as views,
    ROUND((lc.count::NUMERIC / tc.total::NUMERIC) * 100, 1) as percentage
  FROM location_counts lc
  CROSS JOIN total_count tc
  WHERE lc.count > 0
  ORDER BY lc.count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Get Hourly Activity (Global Platform)
CREATE OR REPLACE FUNCTION get_global_hourly_activity(p_days INT DEFAULT 7)
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
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND event_type IN ('restaurant_profile_view', 'item_view', 'search_performed')
  GROUP BY hour
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_top_locations(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_hourly_activity(INT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_top_locations IS 'Returns top 10 cities by view count with percentages for super admin dashboard';
COMMENT ON FUNCTION get_global_hourly_activity IS 'Returns hourly activity distribution across entire platform for super admin dashboard';

-- =====================================================
-- DONE! Refresh your Super Admin Analytics dashboard.
-- =====================================================
