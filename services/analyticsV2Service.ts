/**
 * ============================================================================
 * ANALYTICS V2 SERVICE
 * ============================================================================
 * Fresh start analytics system with proper session tracking and deduplication.
 * Cutover date: 2026-03-19
 * 
 * IMPORTANT: This is additive only - does not replace existing analytics.
 * Only the Partner Analytics page reads from this new system.
 * ============================================================================
 */

import { supabase } from '../lib/supabase';

// Cutover date - only data from this date forward is used
export const ANALYTICS_V2_START_DATE = '2026-03-19T00:00:00Z';

// Event types
export type AnalyticsEventType = 'view' | 'play' | 'like' | 'save' | 'order_click' | 'qr_scan' | 'profile_view' | 'share' | 'directions_click' | 'phone_call';

// Device type detection
export const getDeviceType = (): 'mobile' | 'desktop' => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  return isMobile ? 'mobile' : 'desktop';
};

// Session ID management - persistent across visits
const SESSION_STORAGE_KEY = 'menulove_analytics_session_v2';

export const getSessionId = (): string => {
  try {
    // Try to get existing session
    let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    
    if (!sessionId) {
      // Generate new session ID
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    
    return sessionId;
  } catch (error) {
    // Fallback if localStorage is not available
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
};

// Deduplication tracking - in-memory cache
const recentEvents = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10000; // 10 seconds

const shouldTrackEvent = (dedupeKey: string): boolean => {
  const now = Date.now();
  const lastTracked = recentEvents.get(dedupeKey);
  
  if (lastTracked && (now - lastTracked) < DEDUPE_WINDOW_MS) {
    return false; // Skip duplicate
  }
  
  recentEvents.set(dedupeKey, now);
  
  // Cleanup old entries (keep map size manageable)
  if (recentEvents.size > 1000) {
    const cutoff = now - DEDUPE_WINDOW_MS;
    for (const [key, timestamp] of recentEvents.entries()) {
      if (timestamp < cutoff) {
        recentEvents.delete(key);
      }
    }
  }
  
  return true;
};

// Main tracking function
interface TrackEventParams {
  eventType: AnalyticsEventType;
  restaurantId: string;
  itemId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export const trackAnalyticsEvent = async ({
  eventType,
  restaurantId,
  itemId,
  userId,
  metadata = {}
}: TrackEventParams): Promise<void> => {
  try {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();
    
    // Deduplication logic
    let dedupeKey = '';
    
    switch (eventType) {
      case 'like':
      case 'save':
        // Dedupe by session + item (or restaurant if no item)
        dedupeKey = `${eventType}_${sessionId}_${itemId || restaurantId}`;
        if (!shouldTrackEvent(dedupeKey)) return;
        break;
        
      case 'view':
        // Max 1 event per session + item within 10 seconds
        if (!itemId) return; // Must have itemId for view
        dedupeKey = `${eventType}_${sessionId}_${itemId}`;
        if (!shouldTrackEvent(dedupeKey)) return;
        break;
        
      case 'play':
        // Track each play but with 10s dedupe window
        if (!itemId) return; // Must have itemId for play
        dedupeKey = `${eventType}_${sessionId}_${itemId}`;
        if (!shouldTrackEvent(dedupeKey)) return;
        break;
        
      case 'qr_scan':
        // Only once per session + restaurant
        dedupeKey = `${eventType}_${sessionId}_${restaurantId}`;
        if (!shouldTrackEvent(dedupeKey)) return;
        break;
        
      case 'profile_view':
        // Once per session + restaurant
        dedupeKey = `${eventType}_${sessionId}_${restaurantId}`;
        if (!shouldTrackEvent(dedupeKey)) return;
        break;
        
      case 'order_click':
      case 'phone_call':
        // Track each click (no deduplication)
        break;
        
      case 'share':
      case 'directions_click':
        // Once per session + restaurant (+ item if present)
        dedupeKey = `${eventType}_${sessionId}_${restaurantId}_${itemId || ''}`;
        if (!shouldTrackEvent(dedupeKey)) return;
        break;
    }
    
    // Insert event into analytics_events table
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: eventType,
        restaurant_id: restaurantId,
        item_id: itemId || null,
        user_id: userId || null,
        session_id: sessionId,
        device_type: deviceType,
        metadata
      });
    
    if (error) {
      console.error('[AnalyticsV2] Error tracking event:', error);
      // Fail silently - don't break UI
    }
  } catch (error) {
    console.error('[AnalyticsV2] Error tracking event:', error);
    // Fail silently - don't break UI
  }
};

// Helper to check if QR scan should be tracked
export const detectQRScan = (): boolean => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasQRParam = urlParams.has('qr') || urlParams.has('source');
    const referrer = document.referrer;
    const isQRSource = referrer.includes('qr') || window.location.pathname.startsWith('/r/');
    
    return hasQRParam || isQRSource;
  } catch (error) {
    return false;
  }
};
