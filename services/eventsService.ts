import { supabase } from '../lib/supabase';

// Event types
export type EventType = 
  | 'page_view'
  | 'search_performed'
  | 'restaurant_profile_view'
  | 'item_view'
  | 'video_play'
  | 'video_complete'
  | 'like'
  | 'save'
  | 'share'
  | 'qr_scan'
  | 'directions_click'
  | 'order_button_click';

interface TrackEventParams {
  eventType: EventType;
  restaurantId?: string;
  itemId?: string;
  itemType?: string;
  eventValue?: string;
  sessionId?: string;
  referrer?: string;
}

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('ml_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('ml_session_id', sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Get city from browser geolocation (optional)
const getLocationCity = async (): Promise<string | null> => {
  try {
    // This would require a geolocation API or IP-based lookup
    // For now, return null - can be enhanced later
    return null;
  } catch {
    return null;
  }
};

// Detect referrer/traffic source
const getReferrer = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('source');
  
  // Check for explicit source parameter (e.g., ?source=qr)
  if (source) return source;
  
  // Check document referrer
  const docReferrer = document.referrer;
  if (!docReferrer) return 'direct';
  
  try {
    const referrerUrl = new URL(docReferrer);
    const referrerHost = referrerUrl.hostname;
    
    // Social media
    if (referrerHost.includes('facebook.com') || referrerHost.includes('fb.com')) return 'social';
    if (referrerHost.includes('instagram.com')) return 'social';
    if (referrerHost.includes('twitter.com') || referrerHost.includes('t.co')) return 'social';
    if (referrerHost.includes('linkedin.com')) return 'social';
    if (referrerHost.includes('tiktok.com')) return 'social';
    
    // Search engines
    if (referrerHost.includes('google.com')) return 'search';
    if (referrerHost.includes('bing.com')) return 'search';
    if (referrerHost.includes('yahoo.com')) return 'search';
    if (referrerHost.includes('duckduckgo.com')) return 'search';
    
    // Same domain = internal link
    if (referrerHost === window.location.hostname) return 'link';
    
    // External link
    return 'link';
  } catch {
    return 'direct';
  }
};

// Check if debug mode is enabled
const isDebugMode = (): boolean => {
  return new URLSearchParams(window.location.search).get('debugAnalytics') === '1';
};

// Debug logger
const debugLog = (message: string, data?: any) => {
  if (isDebugMode()) {
    console.log(`[Analytics Debug] ${message}`, data || '');
    
    // Store in localStorage for audit
    try {
      const logs = JSON.parse(localStorage.getItem('analytics_debug_log') || '[]');
      logs.push({ timestamp: new Date().toISOString(), message, data });
      // Keep last 50 events
      if (logs.length > 50) logs.shift();
      localStorage.setItem('analytics_debug_log', JSON.stringify(logs));
    } catch (e) {
      // Ignore localStorage errors
    }
  }
};

// Track event
export const trackEvent = async ({
  eventType,
  restaurantId,
  itemId,
  itemType,
  eventValue,
  sessionId,
  referrer,
}: TrackEventParams): Promise<void> => {
  try {
    const finalSessionId = sessionId || getSessionId();
    const device = getDeviceType();
    const locationCity = await getLocationCity();
    const finalReferrer = referrer || getReferrer();

    const eventData = {
      restaurant_id: restaurantId || null,
      user_session_id: finalSessionId,
      event_type: eventType,
      item_id: itemId || null,
      item_type: itemType || null,
      event_value: eventValue || null,
      device,
      location_city: locationCity,
      referrer: finalReferrer,
    };

    debugLog(`📊 Event fired: ${eventType}`, { restaurantId, itemId, eventValue, device, referrer: finalReferrer });

    const { error } = await supabase.from('events').insert(eventData);

    if (error) {
      debugLog(`❌ Event failed: ${eventType}`, error);
      console.error('[Events] Error tracking event:', error);
    } else {
      debugLog(`✅ Event saved: ${eventType}`);
    }
  } catch (error) {
    debugLog(`❌ Event exception: ${eventType}`, error);
    console.error('[Events] Error tracking event:', error);
  }
};

// Analytics queries for Super Admin

export interface DashboardMetrics {
  totalVisitors: number;
  totalSearches: number;
  totalProfileViews: number;
  totalVideoPlays: number;
  totalQrScans: number;
}

export const getOnlineVisitors = async (): Promise<number> => {
  try {
    // Get events from last 2 minutes
    const twoMinutesAgo = new Date();
    twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

    const { data, error } = await supabase
      .from('events')
      .select('user_session_id')
      .gte('created_at', twoMinutesAgo.toISOString());

    if (error) throw error;

    // Count unique sessions in last 2 minutes
    const uniqueSessions = new Set(data?.map(e => e.user_session_id) || []).size;
    return uniqueSessions;
  } catch (error) {
    console.error('[Events] Error fetching online visitors:', error);
    return 0;
  }
};

export const getDashboardMetrics = async (days: number = 7): Promise<DashboardMetrics> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('events')
      .select('event_type, user_session_id')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const uniqueVisitors = new Set(data?.map(e => e.user_session_id) || []).size;
    const searches = data?.filter(e => e.event_type === 'search_performed').length || 0;
    const profileViews = data?.filter(e => e.event_type === 'restaurant_profile_view').length || 0;
    const videoPlays = data?.filter(e => e.event_type === 'video_play').length || 0;
    const qrScans = data?.filter(e => e.event_type === 'qr_scan').length || 0;

    return {
      totalVisitors: uniqueVisitors,
      totalSearches: searches,
      totalProfileViews: profileViews,
      totalVideoPlays: videoPlays,
      totalQrScans: qrScans,
    };
  } catch (error) {
    console.error('[Events] Error fetching dashboard metrics:', error);
    return {
      totalVisitors: 0,
      totalSearches: 0,
      totalProfileViews: 0,
      totalVideoPlays: 0,
      totalQrScans: 0,
    };
  }
};

export interface DailyActivity {
  date: string;
  pageViews: number;
  searches: number;
  videoPlays: number;
}

export const getDailyActivity = async (days: number = 30): Promise<DailyActivity[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('events')
      .select('created_at, event_type')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const dailyMap = new Map<string, DailyActivity>();
    
    data?.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, pageViews: 0, searches: 0, videoPlays: 0 });
      }
      
      const day = dailyMap.get(date)!;
      if (event.event_type === 'page_view') day.pageViews++;
      if (event.event_type === 'search_performed') day.searches++;
      if (event.event_type === 'video_play') day.videoPlays++;
    });

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('[Events] Error fetching daily activity:', error);
    return [];
  }
};

export interface SearchTerm {
  term: string;
  count: number;
}

export const getTopSearchTerms = async (limit: number = 10): Promise<SearchTerm[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('event_value')
      .eq('event_type', 'search_performed')
      .not('event_value', 'is', null);

    if (error) throw error;

    // Count occurrences
    const termCounts = new Map<string, number>();
    data?.forEach(event => {
      if (event.event_value) {
        const count = termCounts.get(event.event_value) || 0;
        termCounts.set(event.event_value, count + 1);
      }
    });

    return Array.from(termCounts.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('[Events] Error fetching top search terms:', error);
    return [];
  }
};

export interface RestaurantViews {
  restaurantId: string;
  restaurantName: string;
  views: number;
}

export const getMostViewedRestaurants = async (limit: number = 10): Promise<RestaurantViews[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('restaurant_id, partners(restaurant_name)')
      .eq('event_type', 'restaurant_profile_view')
      .not('restaurant_id', 'is', null);

    if (error) throw error;

    // Count by restaurant
    const viewCounts = new Map<string, { name: string; count: number }>();
    
    data?.forEach((event: any) => {
      if (event.restaurant_id && event.partners) {
        const existing = viewCounts.get(event.restaurant_id);
        viewCounts.set(event.restaurant_id, {
          name: event.partners.restaurant_name,
          count: (existing?.count || 0) + 1,
        });
      }
    });

    return Array.from(viewCounts.entries())
      .map(([restaurantId, { name, count }]) => ({
        restaurantId,
        restaurantName: name,
        views: count,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  } catch (error) {
    console.error('[Events] Error fetching most viewed restaurants:', error);
    return [];
  }
};

export interface DeviceBreakdown {
  device: string;
  count: number;
  percentage: number;
}

export const getDeviceBreakdown = async (): Promise<DeviceBreakdown[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('device');

    if (error) throw error;

    const deviceCounts = new Map<string, number>();
    let total = 0;

    data?.forEach(event => {
      if (event.device) {
        const count = deviceCounts.get(event.device) || 0;
        deviceCounts.set(event.device, count + 1);
        total++;
      }
    });

    return Array.from(deviceCounts.entries())
      .map(([device, count]) => ({
        device,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[Events] Error fetching device breakdown:', error);
    return [];
  }
};

export interface TopRestaurant {
  restaurantId: string;
  restaurantName: string;
  profileViews: number;
  videoPlays: number;
  qrScans: number;
  directionsClicks: number;
}

export const getTopPerformingRestaurants = async (limit: number = 10): Promise<TopRestaurant[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('restaurant_id, event_type, partners(restaurant_name)')
      .not('restaurant_id', 'is', null);

    if (error) throw error;

    const restaurantStats = new Map<string, TopRestaurant>();

    data?.forEach((event: any) => {
      if (event.restaurant_id && event.partners) {
        if (!restaurantStats.has(event.restaurant_id)) {
          restaurantStats.set(event.restaurant_id, {
            restaurantId: event.restaurant_id,
            restaurantName: event.partners.restaurant_name,
            profileViews: 0,
            videoPlays: 0,
            qrScans: 0,
            directionsClicks: 0,
          });
        }

        const stats = restaurantStats.get(event.restaurant_id)!;
        if (event.event_type === 'restaurant_profile_view') stats.profileViews++;
        if (event.event_type === 'video_play') stats.videoPlays++;
        if (event.event_type === 'qr_scan') stats.qrScans++;
        if (event.event_type === 'directions_click') stats.directionsClicks++;
      }
    });

    return Array.from(restaurantStats.values())
      .sort((a, b) => b.profileViews - a.profileViews)
      .slice(0, limit);
  } catch (error) {
    console.error('[Events] Error fetching top performing restaurants:', error);
    return [];
  }
};

// Restaurant-specific analytics (RLS will filter to their own data)

export interface RestaurantMetrics {
  profileViews: number;
  videoPlays: number;
  qrScans: number;
  directionsClicks: number;
}

export const getRestaurantMetrics = async (restaurantId: string, days: number = 7): Promise<RestaurantMetrics> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('events')
      .select('event_type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    return {
      profileViews: data?.filter(e => e.event_type === 'restaurant_profile_view').length || 0,
      videoPlays: data?.filter(e => e.event_type === 'video_play').length || 0,
      qrScans: data?.filter(e => e.event_type === 'qr_scan').length || 0,
      directionsClicks: data?.filter(e => e.event_type === 'directions_click').length || 0,
    };
  } catch (error) {
    console.error('[Events] Error fetching restaurant metrics:', error);
    return {
      profileViews: 0,
      videoPlays: 0,
      qrScans: 0,
      directionsClicks: 0,
    };
  }
};

// Get raw event count for debugging
export const getRawEventCount = async (days: number = 7): Promise<number> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('[Events] Error fetching raw event count:', error);
    return 0;
  }
};

export const getRestaurantDailyPerformance = async (restaurantId: string, days: number = 30): Promise<DailyActivity[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('events')
      .select('created_at, event_type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const dailyMap = new Map<string, DailyActivity>();
    
    data?.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, pageViews: 0, searches: 0, videoPlays: 0 });
      }
      
      const day = dailyMap.get(date)!;
      if (event.event_type === 'restaurant_profile_view') day.pageViews++;
      if (event.event_type === 'video_play') day.videoPlays++;
    });

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('[Events] Error fetching restaurant daily performance:', error);
    return [];
  }
};

// Super Admin - Location Analytics
export interface LocationData {
  location: string;
  views: number;
  percentage: number;
}

export const getTopLocations = async (days: number = 7): Promise<LocationData[]> => {
  try {
    const { data, error } = await supabase.rpc('get_top_locations', { p_days: days });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Events] Error fetching top locations:', error);
    return [];
  }
};

// Super Admin - Global Hourly Activity
export interface HourlyActivity {
  hour: number;
  views: number;
}

export const getGlobalHourlyActivity = async (days: number = 7): Promise<HourlyActivity[]> => {
  try {
    const { data, error } = await supabase.rpc('get_global_hourly_activity', { p_days: days });
    
    if (error) throw error;
    
    // Ensure all 24 hours are represented
    const hourlyMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, 0);
    }
    
    data?.forEach((item: HourlyActivity) => {
      hourlyMap.set(item.hour, item.views);
    });
    
    return Array.from(hourlyMap.entries())
      .map(([hour, views]) => ({ hour, views }))
      .sort((a, b) => a.hour - b.hour);
  } catch (error) {
    console.error('[Events] Error fetching global hourly activity:', error);
    return [];
  }
};
