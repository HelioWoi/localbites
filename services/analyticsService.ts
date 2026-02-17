import { supabase } from '../lib/supabase';

interface AnalyticsData {
  page_path: string;
  page_title?: string;
  referrer?: string;
  referrer_domain?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  session_id?: string;
  screen_width?: number;
  screen_height?: number;
  language?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
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

// Detect browser
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
};

// Detect OS
const getOS = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
};

// Extract UTM parameters from URL
const getUTMParams = (): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
} => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };
};

// Extract domain from URL
const getDomain = (url: string): string | undefined => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return undefined;
  }
};

// Track page view
export const trackPageView = async (pagePath?: string, pageTitle?: string): Promise<void> => {
  try {
    const path = pagePath || window.location.pathname;
    const title = pageTitle || document.title;
    const referrer = document.referrer;
    const referrerDomain = referrer ? getDomain(referrer) : undefined;
    
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    const analyticsData: AnalyticsData = {
      page_path: path,
      page_title: title,
      referrer: referrer || undefined,
      referrer_domain: referrerDomain,
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      session_id: getSessionId(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      language: navigator.language,
      ...getUTMParams(),
    };

    // Insert analytics data
    const { error } = await supabase
      .from('analytics')
      .insert({
        ...analyticsData,
        user_id: user?.id || null,
      });

    if (error) {
      console.error('[Analytics] Error tracking page view:', error);
    }
  } catch (error) {
    console.error('[Analytics] Error tracking page view:', error);
  }
};

// Track custom event
export const trackEvent = async (eventName: string, eventData?: Record<string, any>): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('analytics')
      .insert({
        page_path: `event:${eventName}`,
        page_title: eventName,
        session_id: getSessionId(),
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
        user_id: user?.id || null,
        // Store event data as JSON in referrer field (we can add a dedicated field later if needed)
        referrer: eventData ? JSON.stringify(eventData) : undefined,
      });
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

// Get analytics data (for admin dashboard)
export const getAnalytics = async (days: number = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Analytics] Error fetching analytics:', error);
    return [];
  }
};

// Get analytics summary
export const getAnalyticsSummary = async (days: number = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_summary')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[Analytics] Error fetching analytics summary:', error);
    return [];
  }
};

// Get top pages
export const getTopPages = async (days: number = 30, limit: number = 10) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics')
      .select('page_path, page_title')
      .gte('created_at', startDate.toISOString())
      .not('page_path', 'like', 'event:%');

    if (error) throw error;

    // Count page views
    const pageCounts = data.reduce((acc: Record<string, { count: number; title: string }>, item) => {
      if (!acc[item.page_path]) {
        acc[item.page_path] = { count: 0, title: item.page_title || item.page_path };
      }
      acc[item.page_path].count++;
      return acc;
    }, {});

    // Sort and limit
    return Object.entries(pageCounts)
      .map(([path, { count, title }]) => ({ path, title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('[Analytics] Error fetching top pages:', error);
    return [];
  }
};

// Get top referrers
export const getTopReferrers = async (days: number = 30, limit: number = 10) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics')
      .select('referrer_domain')
      .gte('created_at', startDate.toISOString())
      .not('referrer_domain', 'is', null);

    if (error) throw error;

    // Count referrers
    const referrerCounts = data.reduce((acc: Record<string, number>, item) => {
      if (item.referrer_domain) {
        acc[item.referrer_domain] = (acc[item.referrer_domain] || 0) + 1;
      }
      return acc;
    }, {});

    // Sort and limit
    return Object.entries(referrerCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('[Analytics] Error fetching top referrers:', error);
    return [];
  }
};

// Get device breakdown
export const getDeviceBreakdown = async (days: number = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics')
      .select('device_type')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Count devices
    const deviceCounts = data.reduce((acc: Record<string, number>, item) => {
      acc[item.device_type || 'unknown'] = (acc[item.device_type || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(deviceCounts).map(([device, count]) => ({ device, count }));
  } catch (error) {
    console.error('[Analytics] Error fetching device breakdown:', error);
    return [];
  }
};
