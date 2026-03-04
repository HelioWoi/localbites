import { supabase } from '../lib/supabase';

// =====================================================
// PARTNER ANALYTICS SERVICE
// Business Intelligence for Restaurant Owners
// =====================================================

export interface PartnerSummary {
  profile_views: number;
  item_views: number;
  video_plays: number;
  video_completes: number;
  likes: number;
  saves: number;
  shares: number;
  order_clicks: number;
  directions_clicks: number;
  qr_scans: number;
  mobile_percentage: number;
  desktop_percentage: number;
  tablet_percentage: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  conversion_rate: number;
}

export interface TopItem {
  item_id: string;
  item_name: string;
  item_type: string;
  views: number;
  video_plays: number;
  video_completes: number;
  likes: number;
  saves: number;
  shares: number;
  engagement_rate: number;
  completion_rate: number;
}

export interface PeakHour {
  hour: number;
  views: number;
}

export interface Insight {
  insight_type: string;
  insight_text: string;
  insight_value: string;
}

// Get partner summary metrics
export const getPartnerSummary = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<PartnerSummary | null> => {
  try {
    const { data, error } = await supabase.rpc('get_partner_summary', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('[PartnerAnalytics] Error fetching summary:', error);
    return null;
  }
};

// Get conversion funnel
export const getPartnerFunnel = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<FunnelStep[]> => {
  try {
    const { data, error } = await supabase.rpc('get_partner_funnel', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[PartnerAnalytics] Error fetching funnel:', error);
    return [];
  }
};

// Get top performing items
export const getPartnerTopItems = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<TopItem[]> => {
  try {
    const { data, error } = await supabase.rpc('get_partner_top_items', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[PartnerAnalytics] Error fetching top items:', error);
    return [];
  }
};

// Get peak hours
export const getPartnerPeakHours = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<PeakHour[]> => {
  try {
    const { data, error } = await supabase.rpc('get_partner_peak_hours', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[PartnerAnalytics] Error fetching peak hours:', error);
    return [];
  }
};

// Get insights
export const getPartnerInsights = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<Insight[]> => {
  try {
    const { data, error } = await supabase.rpc('get_partner_insights', {
      p_restaurant_id: restaurantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[PartnerAnalytics] Error fetching insights:', error);
    return [];
  }
};

// Helper: Get date range for period
export const getDateRange = (period: 'today' | '7days' | '30days' | 'custom', customStart?: Date, customEnd?: Date) => {
  const end = new Date();
  let start = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case '7days':
      start.setDate(start.getDate() - 7);
      break;
    case '30days':
      start.setDate(start.getDate() - 30);
      break;
    case 'custom':
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd };
      }
      break;
  }

  return { start, end };
};

// Helper: Format hour for display
export const formatHour = (hour: number): string => {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
};

// Helper: Get peak window from hours data
export const getPeakWindow = (hours: PeakHour[]): string => {
  if (hours.length === 0) return 'No data';
  
  const sorted = [...hours].sort((a, b) => b.views - a.views);
  const topHours = sorted.slice(0, 3).map(h => h.hour).sort((a, b) => a - b);
  
  if (topHours.length === 0) return 'No data';
  if (topHours.length === 1) return formatHour(topHours[0]);
  
  const start = topHours[0];
  const end = topHours[topHours.length - 1];
  
  return `${formatHour(start)} - ${formatHour(end + 1)}`;
};
