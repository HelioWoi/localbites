/**
 * ============================================================================
 * PARTNER ANALYTICS V2 SERVICE
 * ============================================================================
 * Queries for the new analytics_events table.
 * Only used by the Partner Analytics page.
 * Cutover date: 2026-03-19 - only data from this date forward is used.
 * ============================================================================
 */

import { supabase } from '../lib/supabase';
import { ANALYTICS_V2_START_DATE } from './analyticsV2Service';

export interface PartnerSummaryV2 {
  total_views: number;
  video_plays: number;
  likes: number;
  saves: number;
  order_clicks: number;
  profile_views: number;
  qr_scans: number;
  shares: number;
  directions_clicks: number;
  phone_calls: number;
}

export interface TopItemV2 {
  item_id: string;
  item_name: string;
  category?: string;
  video_url?: string;
  views: number;
  plays: number;
  likes: number;
  saves: number;
  shares: number;
  order_clicks: number;
  directions_clicks: number;
  phone_calls: number;
  has_video: boolean;
}

export interface PeakHourV2 {
  hour: number;
  count: number;
}

export interface DeviceBreakdownV2 {
  mobile: number;
  desktop: number;
}

export interface ConversionFunnelV2 {
  views: number;
  plays: number;
  engagements: number; // likes + saves
  orders: number;
}

/**
 * Get partner summary statistics
 */
export const getPartnerSummaryV2 = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<PartnerSummaryV2> => {
  try {
    // Ensure we only query from cutover date forward
    const effectiveStartDate = new Date(Math.max(
      startDate.getTime(),
      new Date(ANALYTICS_V2_START_DATE).getTime()
    ));

    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', effectiveStartDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    const events = data || [];

    return {
      total_views: events.filter(e => e.event_type === 'view').length,
      video_plays: events.filter(e => e.event_type === 'play').length,
      likes: events.filter(e => e.event_type === 'like').length,
      saves: events.filter(e => e.event_type === 'save').length,
      order_clicks: events.filter(e => e.event_type === 'order_click').length,
      profile_views: events.filter(e => e.event_type === 'profile_view').length,
      qr_scans: events.filter(e => e.event_type === 'qr_scan').length,
      shares: events.filter(e => e.event_type === 'share').length,
      directions_clicks: events.filter(e => e.event_type === 'directions_click').length,
      phone_calls: events.filter(e => e.event_type === 'phone_call').length,
    };
  } catch (error) {
    console.error('[AnalyticsV2] Error fetching summary:', error);
    return {
      total_views: 0,
      video_plays: 0,
      likes: 0,
      saves: 0,
      order_clicks: 0,
      profile_views: 0,
      qr_scans: 0,
      shares: 0,
      directions_clicks: 0,
      phone_calls: 0,
    };
  }
};

/**
 * Get top performing items
 */
export const getTopItemsV2 = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<TopItemV2[]> => {
  try {
    const effectiveStartDate = new Date(Math.max(
      startDate.getTime(),
      new Date(ANALYTICS_V2_START_DATE).getTime()
    ));

    // Get all events with item_id
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('event_type, item_id')
      .eq('restaurant_id', restaurantId)
      .not('item_id', 'is', null)
      .gte('created_at', effectiveStartDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Group by item_id
    const itemStats = new Map<string, {
      views: number;
      plays: number;
      likes: number;
      saves: number;
      shares: number;
      order_clicks: number;
      directions_clicks: number;
      phone_calls: number;
    }>();

    (events || []).forEach(event => {
      if (!event.item_id) return;

      if (!itemStats.has(event.item_id)) {
        itemStats.set(event.item_id, {
          views: 0,
          plays: 0,
          likes: 0,
          saves: 0,
          shares: 0,
          order_clicks: 0,
          directions_clicks: 0,
          phone_calls: 0,
        });
      }

      const stats = itemStats.get(event.item_id)!;
      
      switch (event.event_type) {
        case 'view':
          stats.views++;
          break;
        case 'play':
          stats.plays++;
          break;
        case 'like':
          stats.likes++;
          break;
        case 'save':
          stats.saves++;
          break;
        case 'share':
          stats.shares++;
          break;
        case 'order_click':
          stats.order_clicks++;
          break;
        case 'directions_click':
          stats.directions_clicks++;
          break;
        case 'phone_call':
          stats.phone_calls++;
          break;
      }
    });

    // Get item details from menu_items
    const itemIds = Array.from(itemStats.keys());
    if (itemIds.length === 0) return [];

    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, category, video_url')
      .in('id', itemIds);

    if (menuError) throw menuError;

    // Combine stats with item details
    const topItems: TopItemV2[] = (menuItems || []).map(item => {
      const stats = itemStats.get(item.id)!;
      return {
        item_id: item.id,
        item_name: item.name,
        category: item.category || undefined,
        video_url: item.video_url || undefined,
        views: stats.views,
        plays: stats.plays,
        likes: stats.likes,
        saves: stats.saves,
        shares: stats.shares,
        order_clicks: stats.order_clicks,
        directions_clicks: stats.directions_clicks,
        phone_calls: stats.phone_calls,
        has_video: !!item.video_url,
      };
    });

    // Sort by total engagement (views + plays + likes + saves)
    topItems.sort((a, b) => {
      const scoreA = a.views + a.plays + a.likes + a.saves;
      const scoreB = b.views + b.plays + b.likes + b.saves;
      return scoreB - scoreA;
    });

    return topItems.slice(0, limit);
  } catch (error) {
    console.error('[AnalyticsV2] Error fetching top items:', error);
    return [];
  }
};

/**
 * Get most watched videos (only items with video_url and plays > 0)
 */
export const getMostWatchedVideosV2 = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 8
): Promise<TopItemV2[]> => {
  try {
    const topItems = await getTopItemsV2(restaurantId, startDate, endDate, 50);
    
    // Filter to only videos with plays > 0
    const watchedVideos = topItems.filter(item => item.has_video && item.plays > 0);
    
    // Sort by plays
    watchedVideos.sort((a, b) => b.plays - a.plays);
    
    return watchedVideos.slice(0, limit);
  } catch (error) {
    console.error('[AnalyticsV2] Error fetching most watched videos:', error);
    return [];
  }
};

/**
 * Get peak hours
 */
export const getPeakHoursV2 = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<PeakHourV2[]> => {
  try {
    const effectiveStartDate = new Date(Math.max(
      startDate.getTime(),
      new Date(ANALYTICS_V2_START_DATE).getTime()
    ));

    const { data, error } = await supabase
      .from('analytics_events')
      .select('created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', effectiveStartDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Group by hour
    const hourCounts = new Map<number, number>();
    
    (data || []).forEach(event => {
      const hour = new Date(event.created_at).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // Convert to array and sort by hour
    const peakHours: PeakHourV2[] = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    return peakHours;
  } catch (error) {
    console.error('[AnalyticsV2] Error fetching peak hours:', error);
    return [];
  }
};

/**
 * Get device breakdown
 */
export const getDeviceBreakdownV2 = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<DeviceBreakdownV2> => {
  try {
    const effectiveStartDate = new Date(Math.max(
      startDate.getTime(),
      new Date(ANALYTICS_V2_START_DATE).getTime()
    ));

    const { data, error } = await supabase
      .from('analytics_events')
      .select('device_type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', effectiveStartDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    const mobile = (data || []).filter(e => e.device_type === 'mobile').length;
    const desktop = (data || []).filter(e => e.device_type === 'desktop').length;

    return { mobile, desktop };
  } catch (error) {
    console.error('[AnalyticsV2] Error fetching device breakdown:', error);
    return { mobile: 0, desktop: 0 };
  }
};

/**
 * Get conversion funnel
 */
export const getConversionFunnelV2 = async (
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<ConversionFunnelV2> => {
  try {
    const effectiveStartDate = new Date(Math.max(
      startDate.getTime(),
      new Date(ANALYTICS_V2_START_DATE).getTime()
    ));

    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', effectiveStartDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    const events = data || [];

    return {
      views: events.filter(e => e.event_type === 'view').length,
      plays: events.filter(e => e.event_type === 'play').length,
      engagements: events.filter(e => e.event_type === 'like' || e.event_type === 'save').length,
      orders: events.filter(e => e.event_type === 'order_click').length,
    };
  } catch (error) {
    console.error('[AnalyticsV2] Error fetching conversion funnel:', error);
    return {
      views: 0,
      plays: 0,
      engagements: 0,
      orders: 0,
    };
  }
};

/**
 * Helper to get date range
 */
export const getDateRange = (period: 'today' | '7days' | '30days'): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();

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
  }

  return { start, end };
};
