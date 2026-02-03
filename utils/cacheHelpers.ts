import { Restaurant, UserLocation } from '../types';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const LOCATION_THRESHOLD = 0.5; // 500 meters - if user moves less than this, use cache

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  location?: {
    lat: number;
    lng: number;
  };
}

// Calculate distance between two coordinates in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if cache is still valid (not expired)
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

// Check if location has changed significantly
function hasLocationChanged(
  oldLat: number,
  oldLng: number,
  newLat: number,
  newLng: number
): boolean {
  const distance = calculateDistance(oldLat, oldLng, newLat, newLng);
  return distance > LOCATION_THRESHOLD;
}

// Get cached restaurants
export function getCachedRestaurants(location: UserLocation, category: string = 'all'): Restaurant[] | null {
  try {
    // Include rounded location in cache key to prevent serving wrong location's data
    const roundedLat = Math.round(location.lat * 100) / 100;
    const roundedLng = Math.round(location.lng * 100) / 100;
    const cacheKey = `restaurants_cache_${category}_${roundedLat}_${roundedLng}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      console.log('[Cache] No cached restaurants found');
      return null;
    }

    const entry: CacheEntry<Restaurant[]> = JSON.parse(cached);

    // Check if cache is expired
    if (!isCacheValid(entry.timestamp)) {
      console.log('[Cache] Cache expired');
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Check if location has changed significantly
    if (entry.location) {
      if (hasLocationChanged(
        entry.location.lat,
        entry.location.lng,
        location.lat,
        location.lng
      )) {
        console.log('[Cache] Location changed significantly, invalidating cache');
        localStorage.removeItem(cacheKey);
        return null;
      }
    }

    console.log('[Cache] ✅ Using cached restaurants:', entry.data.length, 'restaurants');
    console.log('[Cache] Cache age:', Math.round((Date.now() - entry.timestamp) / 1000 / 60), 'minutes');
    return entry.data;
  } catch (error) {
    console.error('[Cache] Error reading cache:', error);
    return null;
  }
}

// Save restaurants to cache
export function setCachedRestaurants(restaurants: Restaurant[], location: UserLocation, category: string = 'all'): void {
  try {
    // Include rounded location in cache key (must match getCachedRestaurants)
    const roundedLat = Math.round(location.lat * 100) / 100;
    const roundedLng = Math.round(location.lng * 100) / 100;
    const cacheKey = `restaurants_cache_${category}_${roundedLat}_${roundedLng}`;
    const entry: CacheEntry<Restaurant[]> = {
      data: restaurants,
      timestamp: Date.now(),
      location: {
        lat: location.lat,
        lng: location.lng,
      },
    };

    localStorage.setItem(cacheKey, JSON.stringify(entry));
    console.log('[Cache] ✅ Cached', restaurants.length, 'restaurants for category:', category);
  } catch (error) {
    console.error('[Cache] Error saving cache:', error);
  }
}

// Clear cache (useful for debugging or forced refresh)
export function clearRestaurantsCache(): void {
  localStorage.removeItem('restaurants_cache');
  console.log('[Cache] Cache cleared');
}

// Get cache stats (for debugging)
export function getCacheStats(): { age: number; count: number; location: { lat: number; lng: number } } | null {
  try {
    const cached = localStorage.getItem('restaurants_cache');
    if (!cached) return null;

    const entry: CacheEntry<Restaurant[]> = JSON.parse(cached);
    return {
      age: Math.round((Date.now() - entry.timestamp) / 1000 / 60), // minutes
      count: entry.data.length,
      location: entry.location || { lat: 0, lng: 0 },
    };
  } catch {
    return null;
  }
}
