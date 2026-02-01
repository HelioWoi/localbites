
import { Restaurant, UserLocation, Review } from "../types";
import { getPartnerRestaurants, hasSupabaseData } from "./supabaseService";
import { searchNearbyRestaurants as searchGooglePlaces, getPlaceDetails } from "./googlePlacesProxy";

// HYBRID COST OPTIMIZATION: Partners first, limited Google API usage
const GOOGLE_API_LIMIT = 10; // Only fetch 10 Google restaurants to reduce costs
const RATE_LIMIT_KEY = 'google_api_searches';
const DAILY_SEARCH_LIMIT = 5; // Max 5 searches per day per user

// Check if user has exceeded daily search limit
function canUseGoogleAPI(): boolean {
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
}

function incrementSearchCount(): void {
  const today = new Date().toDateString();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  const data = stored ? JSON.parse(stored) : { date: today, count: 0 };
  data.count += 1;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
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
  filters?: { cuisine?: string; price?: string; openNow?: boolean }
): Promise<Restaurant[]> {
  console.log('[LocalBites] Fetching restaurants for:', location.name);
  console.log('[LocalBites] Location coordinates:', { lat: location.lat, lng: location.lng, radius: location.radius });
  
  // 1. ALWAYS get partner restaurants first (NO API COST)
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

  // 2. CONDITIONALLY get Google Places restaurants (WITH COST CONTROLS)
  let googleRestaurants: Restaurant[] = [];
  
  // Only use Google API if:
  // a) User hasn't exceeded daily limit
  // b) We have valid coordinates
  const canUseAPI = canUseGoogleAPI();
  
  if (!canUseAPI) {
    console.log('[LocalBites] ⚠️ Daily Google API search limit reached. Showing partners only.');
  } else if (location.lat && location.lng) {
    try {
      const radius = location.radius || 5000; // Default 5km
      console.log('[LocalBites] Searching Google Places (LIMITED TO', GOOGLE_API_LIMIT, 'results)');
      
      // Increment search count BEFORE making the API call
      incrementSearchCount();
      
      const googlePlaces = await searchGooglePlaces(location.lat, location.lng, radius);
      
      // LIMIT to 10 restaurants to reduce API costs
      const limitedPlaces = googlePlaces.slice(0, GOOGLE_API_LIMIT);
      
      // Convert Google Places to Restaurant format
      googleRestaurants = limitedPlaces.map(place => ({
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
        mainPhotoUrl: place.photoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
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

  // 3. Merge results: Partners first, then Google (avoiding duplicates)
  console.log('[LocalBites] Merging results - Partners:', partnerRestaurants.length, 'Google:', googleRestaurants.length);
  const partnerNames = new Set(partnerRestaurants.map(r => r.name.toLowerCase()));
  const filteredGoogleRestaurants = googleRestaurants.filter(
    r => !partnerNames.has(r.name.toLowerCase())
  );

  let results = [...partnerRestaurants, ...filteredGoogleRestaurants];
  console.log('[LocalBites] After merge:', results.length, 'restaurants');
  console.log('[LocalBites] First restaurant:', results[0]?.name, 'isSubscribed:', results[0]?.isSubscribed);

  // 4. Sort: Partners FIRST (priority), then by distance within each group
  results.sort((a, b) => {
    // Priority 1: Partners (isSubscribed) always come first
    if (a.isSubscribed && !b.isSubscribed) return -1;
    if (!a.isSubscribed && b.isSubscribed) return 1;
    
    // Priority 2: Within same group (both partners or both non-partners), sort by distance
    const distA = parseFloat(a.distance.replace(/[^\d.]/g, '')) || 0;
    const distB = parseFloat(b.distance.replace(/[^\d.]/g, '')) || 0;
    // Convert km to m if needed for comparison
    const distAMeters = a.distance.includes('km') ? distA * 1000 : distA;
    const distBMeters = b.distance.includes('km') ? distB * 1000 : distB;
    return distAMeters - distBMeters;
  });
  console.log('[LocalBites] After sort:', results.length, 'restaurants');
  console.log('[LocalBites] First restaurant after sort:', results[0]?.name, 'isSubscribed:', results[0]?.isSubscribed);

  // 5. Apply filters
  const beforeFilters = results.length;
  if (filters?.cuisine && filters.cuisine !== 'All') {
    results = results.filter(r => 
      r.cuisine.toLowerCase().includes(filters.cuisine!.toLowerCase())
    );
    console.log('[LocalBites] After cuisine filter:', results.length, '(was', beforeFilters, ')');
  }

  if (filters?.price) {
    const beforePrice = results.length;
    results = results.filter(r => r.priceLevel === filters.price);
    console.log('[LocalBites] After price filter:', results.length, '(was', beforePrice, ')');
  }

  if (filters?.openNow) {
    const beforeOpen = results.length;
    results = results.filter(r => r.isOpen);
    console.log('[LocalBites] After openNow filter:', results.length, '(was', beforeOpen, ')');
  }

  // 6. No fallback to demo data - only show real results
  if (results.length === 0) {
    console.log('[LocalBites] No results found');
  }

  console.log('[LocalBites] Returning', results.length, 'total restaurants');
  return results;
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
