// Google Places API Proxy Service
// Uses Supabase Edge Function to make API calls (API key stays on server)

import { supabase } from '../lib/supabase';

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  totalReviews?: number;
  priceLevel: string;
  isOpen?: boolean;
  openingHours?: string[];
  photoUrl?: string;
  googleMapsUrl: string;
  cuisine: string;
  distance: string;
  location: {
    lat: number;
    lng: number;
  };
  reviews?: {
    id: string;
    authorName: string;
    authorPhotoUrl?: string;
    rating: number;
    text: string;
    relativeTimeDescription: string;
    time: number;
    photoUrl?: string;
  }[];
}

interface PlaceReview {
  id: string;
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  time: number;
  photoUrl?: string;
}

// Search nearby restaurants using Supabase Edge Function
export async function searchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number = 10000, // Default 10km
  category: string = 'all'
): Promise<PlaceResult[]> {
  try {
    console.log('[GooglePlaces] Calling Edge Function with category:', category);
    
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: { action: 'searchNearby', lat, lng, radius, category },
    });

    if (error) {
      console.error('[GooglePlaces] Edge Function error:', error);
      return [];
    }

    if (data.error) {
      console.error('[GooglePlaces] API error:', data.error);
      return [];
    }

    // Use server-calculated distance when available, fallback to client calculation
    const results = (data || []).map((place: any) => ({
      ...place,
      distance: place.distanceMeters 
        ? formatDistance(place.distanceMeters / 1000)
        : formatDistance(calculateDistance(lat, lng, place.location?.lat, place.location?.lng)),
    }));

    // Debug: verify expanding radius is working
    const hasDistance = results.filter((r: any) => r.distanceMeters).length;
    console.log('[GooglePlaces] Found', results.length, 'restaurants.', hasDistance, 'have server-calculated distance');
    if (results.length > 0) {
      console.log('[GooglePlaces] Closest:', results[0]?.name, results[0]?.distanceMeters ? `${results[0].distanceMeters}m` : 'no dist');
      console.log('[GooglePlaces] Farthest:', results[results.length-1]?.name, results[results.length-1]?.distanceMeters ? `${results[results.length-1].distanceMeters}m` : 'no dist');
    }
    return results;
  } catch (error) {
    console.error('[GooglePlaces] Error:', error);
    return [];
  }
}

// Text Search - search by query like "pizza", "sushi", etc.
export async function textSearchRestaurants(
  lat: number,
  lng: number,
  radius: number = 10000,
  query: string
): Promise<PlaceResult[]> {
  try {
    console.log('[GooglePlaces] Text search for:', query, 'at', lat, lng, 'radius:', radius);
    
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: { action: 'textSearch', lat, lng, radius, query },
    });

    if (error) {
      console.error('[GooglePlaces] Text search error:', error);
      return [];
    }

    if (data?.error) {
      console.error('[GooglePlaces] Text search API error:', data.error);
      return [];
    }

    // Use server-calculated distance when available, fallback to client calculation
    const results = (Array.isArray(data) ? data : []).map((place: any) => ({
      ...place,
      distance: place.distanceMeters 
        ? formatDistance(place.distanceMeters / 1000)
        : formatDistance(calculateDistance(lat, lng, place.location?.lat, place.location?.lng)),
    }));

    console.log('[GooglePlaces] Text search found', results.length, 'restaurants for:', query);
    return results;
  } catch (error) {
    console.error('[GooglePlaces] Text search error:', error);
    return [];
  }
}

// Get place details with reviews using Supabase Edge Function
export async function getPlaceDetails(placeId: string): Promise<{
  place: PlaceResult;
  reviews: PlaceReview[];
  photos: string[];
  openingHours?: string[];
} | null> {
  try {
    console.log('[GooglePlaces] Getting details for:', placeId);
    
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: { action: 'getDetails', placeId },
    });

    console.log('[GooglePlaces] Details response:', { data, error });

    if (error || data?.error) {
      console.error('[GooglePlaces] Error getting details:', error || data?.error);
      return null;
    }

    console.log('[GooglePlaces] Reviews found:', data?.reviews?.length || 0);
    return data;
  } catch (error) {
    console.error('[GooglePlaces] Error:', error);
    return null;
  }
}

// Helper functions
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!lat2 || !lng2) return 0;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function extractCuisine(types?: string[]): string {
  if (!types) return 'Restaurant';
  
  const cuisineMap: Record<string, string> = {
    'chinese_restaurant': 'Chinese',
    'japanese_restaurant': 'Japanese',
    'italian_restaurant': 'Italian',
    'mexican_restaurant': 'Mexican',
    'indian_restaurant': 'Indian',
    'thai_restaurant': 'Thai',
    'vietnamese_restaurant': 'Vietnamese',
    'korean_restaurant': 'Korean',
    'french_restaurant': 'French',
    'greek_restaurant': 'Greek',
    'brazilian_restaurant': 'Brazilian',
    'seafood_restaurant': 'Seafood',
    'steak_house': 'Steakhouse',
    'pizza_restaurant': 'Pizza',
    'sushi_restaurant': 'Sushi',
    'cafe': 'Café',
    'bakery': 'Bakery',
    'bar': 'Bar & Grill',
  };

  for (const type of types) {
    if (cuisineMap[type]) return cuisineMap[type];
  }
  return 'Restaurant';
}

export { calculateDistance, formatDistance, extractCuisine };
