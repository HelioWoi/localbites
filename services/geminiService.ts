
import { Restaurant, UserLocation, Review } from "../types";
import { getPartnerRestaurants, hasSupabaseData } from "./supabaseService";
import { searchNearbyRestaurants as searchGooglePlaces, getPlaceDetails, textSearchRestaurants } from "./googlePlacesProxy";
import { enrichRestaurantWithFilters, applyFilters } from "../utils/filterHelpers";
// Browser cache disabled — server-side api_cache handles caching
// import { getCachedRestaurants, setCachedRestaurants } from "../utils/cacheHelpers";

// Helper: parse distance string ("30 m", "1.5 km") to meters
function _parseDistanceToMeters(distance: string): number {
  if (!distance) return 999999;
  const num = parseFloat(distance.replace(/[^\d.]/g, '')) || 0;
  if (distance.toLowerCase().includes('km')) return num * 1000;
  return num; // already in meters
}

// HYBRID COST OPTIMIZATION: Partners first, limited Google API usage
const GOOGLE_API_LIMIT = 50; // Fetch up to 50 Google restaurants (increased for testing)
const RATE_LIMIT_KEY = 'google_api_searches';
const DAILY_SEARCH_LIMIT = 5; // Max 5 searches per day per user

// Check if user has exceeded daily search limit
function canUseGoogleAPI(): boolean {
  // TODO: Re-enable rate limiting after testing
  return true; // DISABLED FOR TESTING - Always allow API access
  
  /* COMMENTED OUT FOR TESTING
  const today = new Date().toDateString();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  
  if (!stored) {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ date: today, count: 0 }));
    return true;
  }
  
  const data = JSON.parse(stored);
  
  // Reset counter if it's a new day
  if (data.date !== today) {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ date: today, count: 0 }));
    return true;
  }
  
  return data.count < DAILY_SEARCH_LIMIT;
  */
}

function incrementSearchCount(): void {
  // TODO: Re-enable rate limiting after testing
  return; // DISABLED FOR TESTING - Don't increment counter
  
  /* COMMENTED OUT FOR TESTING
  const today = new Date().toDateString();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  const data = stored ? JSON.parse(stored) : { date: today, count: 0 };
  data.count += 1;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  */
}

// Get remaining searches for today
export function getRemainingSearches(): number {
  const today = new Date().toDateString();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  
  if (!stored) return DAILY_SEARCH_LIMIT;
  
  const data = JSON.parse(stored);
  
  // If it's a new day, return full limit
  if (data.date !== today) return DAILY_SEARCH_LIMIT;
  
  return Math.max(0, DAILY_SEARCH_LIMIT - data.count);
}

export async function getNearbyRestaurants(
  location: UserLocation, 
  filters?: { cuisine?: string; price?: string; openNow?: boolean },
  category: string = 'all'
): Promise<Restaurant[]> {
  console.log('[LocalBites] Fetching restaurants for:', location.name);
  console.log('[LocalBites] Location coordinates:', { lat: location.lat, lng: location.lng, radius: location.radius });
  
  // 1. ALWAYS get partner restaurants first (NO API COST - always fresh!)
  let partnerRestaurants: Restaurant[] = [];
  try {
    const hasData = await hasSupabaseData();
    if (hasData) {
      console.log('[LocalBites] Loading partner restaurants from Supabase (NO API COST)');
      partnerRestaurants = await getPartnerRestaurants(location.lat, location.lng);
      console.log('[LocalBites] Found', partnerRestaurants.length, 'partner restaurants');
    }
  } catch (error) {
    console.error('[LocalBites] Supabase error:', error);
  }

  // 2. FETCH Google restaurants (server-side cache in Supabase handles cost reduction)
  // Browser cache disabled — server api_cache (30-day TTL) prevents redundant Google API calls
  let googleRestaurants: Restaurant[] = [];
  {
    console.log('[LocalBites] Fetching Google data (server cache handles cost)...');
    
    // CONDITIONALLY get Google Places restaurants (WITH COST CONTROLS)
    const canUseAPI = canUseGoogleAPI();
    
    if (!canUseAPI) {
      console.log('[LocalBites] ⚠️ Daily Google API search limit reached. Showing partners only.');
    } else if (location.lat && location.lng) {
      try {
        const radius = location.radius || 5000; // Default 5km
        console.log('[LocalBites] Searching Google Places (LIMITED TO', GOOGLE_API_LIMIT, 'results)');
        
        // Increment search count BEFORE making the API call
        incrementSearchCount();
        
        const googlePlaces = await searchGooglePlaces(location.lat, location.lng, radius, category);
        
        // LIMIT results to reduce API costs
        const limitedPlaces = googlePlaces.slice(0, GOOGLE_API_LIMIT);
        
        // Convert Google Places to Restaurant format
        googleRestaurants = limitedPlaces.map(place => ({
          id: place.id,
          name: place.name,
          cuisine: place.cuisine,
          priceLevel: place.priceLevel,
          distance: place.distance,
          distanceMeters: (place as any).distanceMeters,
          isOpen: place.isOpen ?? true,
          rating: place.rating,
          totalReviews: place.totalReviews,
          address: place.address,
          phone: place.phone,
          website: place.website,
          googleMapsUrl: place.googleMapsUrl,
          mainPhotoUrl: place.photoUrl, // Real photos from Google Places only, no fallback
          isSubscribed: false, // Google restaurants don't have video content
          dishes: [],
          reviews: place.reviews || [],
          openingHours: place.openingHours || [],
        }));
        
        console.log('[LocalBites] Found', googleRestaurants.length, 'Google restaurants (limited)');
      } catch (error) {
        console.error('[LocalBites] Google Places error:', error);
      }
    }
  }

  // 3. Merge results: Partners first, then Google (avoiding duplicates)
  console.log('[LocalBites] Merging results - Partners:', partnerRestaurants.length, 'Google:', googleRestaurants.length);
  const partnerNames = new Set(partnerRestaurants.map(r => r.name.toLowerCase()));
  const filteredGoogleRestaurants = googleRestaurants.filter(
    r => !partnerNames.has(r.name.toLowerCase())
  );

  let results = [...partnerRestaurants, ...filteredGoogleRestaurants];
  console.log('[LocalBites] After merge:', results.length, 'restaurants');
  console.log('[LocalBites] First restaurant:', results[0]?.name, 'isSubscribed:', results[0]?.isSubscribed);

  // 4. Enrich restaurants with inferred filter data
  results = results.map(r => enrichRestaurantWithFilters(r));
  console.log('[LocalBites] Enriched restaurants with filter data');

  // 5. Sort: Partners FIRST (priority), then by distance within each group
  results.sort((a, b) => {
    // Priority 1: Partners (isSubscribed) always come first
    if (a.isSubscribed && !b.isSubscribed) return -1;
    if (!a.isSubscribed && b.isSubscribed) return 1;
    
    // Priority 2: Within same group, sort by distanceMeters (numeric, reliable)
    const distA = a.distanceMeters ?? _parseDistanceToMeters(a.distance);
    const distB = b.distanceMeters ?? _parseDistanceToMeters(b.distance);
    return distA - distB;
  });
  console.log('[LocalBites] After sort:', results.length, 'restaurants');
  console.log('[LocalBites] First restaurant after sort:', results[0]?.name, 'isSubscribed:', results[0]?.isSubscribed);

  // 6. Browser cache disabled — server-side api_cache handles caching
  console.log('[LocalBites] ✅ Results ready (server cache active, browser cache disabled)');

  // 7. Apply filters (cuisine, price, dietary, ambiance, amenities)
  // NOTE: openNow filter is applied ONLY at display time (App.tsx) because:
  // 1. isOpen is time-sensitive and changes throughout the day
  // 2. Cache should store ALL restaurants regardless of open status
  // 3. User can toggle OPEN filter without re-fetching from API
  const beforeFilters = results.length;
  if (filters) {
    const fullFilters = {
      cuisine: filters.cuisine || 'All',
      price: filters.price || '',
      openNow: false, // ALWAYS false here - openNow applied at display time only
      dietary: (filters as any).dietary || 'All',
      ambiance: (filters as any).ambiance || 'All',
      hasParking: (filters as any).hasParking || false,
      hasOutdoorSeating: (filters as any).hasOutdoorSeating || false,
    };
    results = applyFilters(results, fullFilters);
    console.log('[LocalBites] After filters:', results.length, '(was', beforeFilters, ')');
  }

  // 8. No fallback to demo data - only show real results
  if (results.length === 0) {
    console.log('[LocalBites] No results found');
  }

  console.log('[LocalBites] Returning', results.length, 'total restaurants');
  return results;
}

// Search restaurants by text query (pizza, sushi, italian, etc.)
export async function searchRestaurantsByQuery(
  location: UserLocation,
  query: string
): Promise<Restaurant[]> {
  console.log('[LocalBites] Text search for:', query);
  
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const MAX_SEARCH_RADIUS = 10000; // 10km max for text search
    const radius = Math.min(location.radius || 5000, MAX_SEARCH_RADIUS);
    const googlePlaces = await textSearchRestaurants(location.lat, location.lng, radius, query);
    
    // Convert Google Places to Restaurant format
    const restaurants: Restaurant[] = googlePlaces.map(place => ({
      id: place.id,
      name: place.name,
      cuisine: place.cuisine,
      priceLevel: place.priceLevel,
      distance: place.distance,
      isOpen: place.isOpen ?? true,
      rating: place.rating,
      totalReviews: place.totalReviews,
      address: place.address,
      phone: place.phone,
      website: place.website,
      googleMapsUrl: place.googleMapsUrl,
      mainPhotoUrl: place.photoUrl,
      isSubscribed: false,
      dishes: [],
      reviews: place.reviews || [],
      openingHours: place.openingHours || [],
    }));

    // Enrich with filter data
    const enriched = restaurants.map(r => enrichRestaurantWithFilters(r));
    
    console.log('[LocalBites] Text search returned', enriched.length, 'restaurants for:', query);
    return enriched;
  } catch (error) {
    console.error('[LocalBites] Text search error:', error);
    return [];
  }
}

// Fetch detailed info for a specific restaurant (with reviews)
export async function getRestaurantDetails(placeId: string): Promise<Restaurant | null> {
  try {
    const details = await getPlaceDetails(placeId);
    if (!details) return null;

    return {
      id: details.place.id,
      name: details.place.name,
      cuisine: details.place.cuisine,
      priceLevel: details.place.priceLevel,
      distance: details.place.distance,
      isOpen: details.place.isOpen ?? true,
      rating: details.place.rating,
      totalReviews: details.place.totalReviews,
      address: details.place.address,
      phone: details.place.phone,
      website: details.place.website,
      googleMapsUrl: details.place.googleMapsUrl,
      mainPhotoUrl: details.place.photoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      isSubscribed: false,
      dishes: details.photos.map((url, i) => ({
        id: `photo-${i}`,
        name: `Photo ${i + 1}`,
        thumbnailUrl: url,
      })),
      reviews: details.reviews.map((r, i) => ({
        id: `review-${i}`,
        authorName: r.authorName,
        authorPhotoUrl: r.authorPhotoUrl,
        rating: r.rating,
        text: r.text,
        relativeTimeDescription: r.relativeTimeDescription,
        time: r.time,
        photoUrl: undefined,
      })),
    };
  } catch (error) {
    console.error('[LocalBites] Error getting restaurant details:', error);
    return null;
  }
}
