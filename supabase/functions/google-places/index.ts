import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Initialize Supabase client for caching
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cache duration in hours - OPTIMIZED FOR COST REDUCTION
const PLACES_CACHE_HOURS = 720; // 30 days - restaurants rarely change
const LOCALITIES_CACHE_HOURS = 720; // 30 days - localities rarely change

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Offset a lat/lng by meters in a given direction
function offsetLatLng(lat: number, lng: number, offsetMeters: number, direction: 'N' | 'S' | 'E' | 'W'): { lat: number; lng: number } {
  const earthRadius = 6371000;
  const dLat = offsetMeters / earthRadius * (180 / Math.PI);
  const dLng = offsetMeters / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
  switch (direction) {
    case 'N': return { lat: lat + dLat, lng };
    case 'S': return { lat: lat - dLat, lng };
    case 'E': return { lat, lng: lng + dLng };
    case 'W': return { lat, lng: lng - dLng };
  }
}

// Helper: Round coordinates to create cache keys (groups nearby locations)
function getCacheKey(lat: number, lng: number, radius: number): string {
  // Round to 3 decimal places (~110m precision) for more accurate results
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `places_${roundedLat}_${roundedLng}_${radius}`;
}

// Calculate distance between two points in meters (Haversine formula)
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getLocalityCacheKey(lat: number, lng: number): string {
  // Round to 1 decimal place (~10km precision for localities)
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLng = Math.round(lng * 10) / 10;
  return `locality_${roundedLat}_${roundedLng}`;
}

// Calculate if restaurant is open based on opening hours
// Google API returns incorrect isOpen values, so we calculate manually
function calculateIsOpen(openingHours: string[]): boolean {
  if (!openingHours || openingHours.length === 0) {
    return false; // SAFE: If no hours info, assume CLOSED
  }

  try {
    // Get current time in Australia/Brisbane timezone (where most users are)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Australia/Brisbane',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const currentDay = parts.find(p => p.type === 'weekday')?.value || '';
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Find today's hours
    const todayHours = openingHours.find(h => h.startsWith(currentDay));
    
    if (!todayHours) {
      return false; // SAFE: If can't find today's hours, assume CLOSED
    }

    // Check if closed
    if (todayHours.toLowerCase().includes('closed')) {
      return false;
    }

    // Parse hours - handle multiple formats
    // Format 1: "Monday: 7:00 AM – 2:00 PM"
    // Format 2: "Monday: 7:00 AM - 2:00 PM"
    // Format 3: "Monday: 7:00 – 14:00"
    const timeMatch = todayHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    
    if (!timeMatch) {
      return false; // SAFE: If can't parse, assume CLOSED
    }

    const [_, openHourStr, openMinStr, openPeriod, closeHourStr, closeMinStr, closePeriod] = timeMatch;
    
    // Convert to 24-hour format
    let openTime = parseInt(openHourStr) * 60 + parseInt(openMinStr);
    if (openPeriod) {
      if (openPeriod.toUpperCase() === 'PM' && parseInt(openHourStr) !== 12) {
        openTime += 12 * 60;
      }
      if (openPeriod.toUpperCase() === 'AM' && parseInt(openHourStr) === 12) {
        openTime = parseInt(openMinStr);
      }
    }
    
    let closeTime = parseInt(closeHourStr) * 60 + parseInt(closeMinStr);
    if (closePeriod) {
      if (closePeriod.toUpperCase() === 'PM' && parseInt(closeHourStr) !== 12) {
        closeTime += 12 * 60;
      }
      if (closePeriod.toUpperCase() === 'AM' && parseInt(closeHourStr) === 12) {
        closeTime = parseInt(closeMinStr);
      }
    }

    // Check if current time is within opening hours
    const isOpen = currentTimeInMinutes >= openTime && currentTimeInMinutes < closeTime;
    
    return isOpen;
  } catch (error) {
    console.error('Error calculating isOpen:', error);
    return false; // SAFE: On error, assume CLOSED
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, lat, lng, radius, placeId, points, category, query } = await req.json();

    if (!GOOGLE_API_KEY) {
      throw new Error("Google Places API key not configured");
    }

    let result;

    switch (action) {
      case "searchNearby":
        result = await searchNearbyRestaurants(lat, lng, radius || 2000, category || 'all');
        break;
      case "textSearch":
        // Text Search API - search by query like "pizza", "sushi", etc.
        result = await textSearchRestaurants(lat, lng, radius || 5000, query);
        break;
      case "getDetails":
        result = await getPlaceDetails(placeId);
        break;
      case "getNearbyLocalities":
        result = await getNearbyLocalities(lat, lng, points);
        break;
      case "getPhoto":
        // Proxy photo requests to avoid exposing API key
        const { photoName } = await req.json();
        return await getPhotoProxy(photoName);
      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function searchNearbyRestaurants(lat: number, lng: number, radius: number, category: string = 'all') {
  // Determine search radii based on requested radius
  // Default: 2km, 5km, 8km. Expanded: adds 10km, 15km
  const isExpanded = radius > 8000;
  const searchRadii = isExpanded ? [2000, 5000, 8000, 10000, 15000] : [2000, 5000, 8000];
  const maxRadius = searchRadii[searchRadii.length - 1];
  
  const cacheKey = `${getCacheKey(lat, lng, maxRadius)}_${category}_v2`;
  
  // SMART CACHE: Check cache first with fallback logic
  // - Fresh cache (< 7 days) with enough results → return immediately
  // - Stale cache (7-30 days) with enough results → return but mark for refresh next time
  // - Cache with too few results (< 10) → skip cache, call Google
  // - Expired cache (> 30 days) or no cache → call Google
  const STALE_THRESHOLD_HOURS = 168; // 7 days - after this, cache is "stale" but still usable
  const MIN_CACHE_RESULTS = 10; // Minimum results to consider cache sufficient
  
  try {
    const { data: cached } = await supabase
      .from('api_cache')
      .select('data, created_at')
      .eq('cache_key', cacheKey)
      .single();
    
    if (cached) {
      const cacheAgeHours = (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60);
      const cacheResults = Array.isArray(cached.data) ? cached.data.length : 0;
      
      if (cacheAgeHours < PLACES_CACHE_HOURS && cacheResults >= MIN_CACHE_RESULTS) {
        // Cache is valid and has enough results → return it
        const freshness = cacheAgeHours < STALE_THRESHOLD_HOURS ? 'FRESH' : 'STALE (will refresh next miss)';
        console.log(`[Cache HIT] ${freshness} - ${cacheResults} places, age: ${Math.round(cacheAgeHours)}h, key: ${cacheKey}`);
        return cached.data;
      } else if (cacheResults < MIN_CACHE_RESULTS) {
        console.log(`[Cache SKIP] Only ${cacheResults} results (need ${MIN_CACHE_RESULTS}+) - calling Google for more`);
        // Fall through to Google API
      } else {
        console.log(`[Cache EXPIRED] Age: ${Math.round(cacheAgeHours)}h > ${PLACES_CACHE_HOURS}h - refreshing`);
        // Fall through to Google API
      }
    }
  } catch (e) {
    // Cache miss or table doesn't exist - continue to API call
    console.log(`[Cache MISS] Fetching fresh data for ${cacheKey}`);
  }

  // OPTIMIZATION #1: Search based on selected category
  const allPlaces: any[] = [];
  const seenIds = new Set<string>();

  // Determine which type groups to search based on category
  let typeGroups: string[][];
  switch (category) {
    case 'restaurants':
      typeGroups = [["restaurant"]];
      break;
    case 'cafes':
      typeGroups = [["cafe", "bakery"]];
      break;
    case 'bars':
      typeGroups = [["bar", "night_club"]];
      break;
    case 'all':
    default:
      typeGroups = [["restaurant"], ["cafe", "bakery"], ["bar"]];
      break;
  }

  const excludedTypes = [
    'supermarket', 'grocery_store', 'convenience_store', 'gym', 
    'fitness_center', 'gas_station', 'hotel', 'lodging', 
    'shopping_mall', 'department_store', 'pharmacy', 'hospital',
    'school', 'university', 'bank', 'atm', 'car_wash', 'car_repair'
  ];

  // Build search points: center + offset points for expanded search
  // Each point searches with its own radius to cover more area
  const searchPoints: { lat: number; lng: number; radius: number; label: string }[] = [];
  
  // Standard radii from center
  for (const r of searchRadii) {
    searchPoints.push({ lat, lng, radius: r, label: `center@${r}m` });
  }
  
  // For expanded search: add 4 offset points (N/S/E/W at 7km) with 5km radius each
  // This creates a grid that covers ~15km total area with minimal overlap
  if (isExpanded) {
    const offsetDist = 7000; // 7km offset
    const gridRadius = 5000; // 5km search radius at each point
    const directions: ('N' | 'S' | 'E' | 'W')[] = ['N', 'S', 'E', 'W'];
    for (const dir of directions) {
      const pt = offsetLatLng(lat, lng, offsetDist, dir);
      searchPoints.push({ lat: pt.lat, lng: pt.lng, radius: gridRadius, label: `${dir}@${offsetDist}m` });
    }
    console.log(`[Nearby] Expanded grid search: ${searchPoints.length} search points (center + 4 offset)`);
  }
  
  console.log(`[Nearby] Searching ${searchPoints.length} points, ${typeGroups.length} type groups (expanded: ${isExpanded})`);

  for (const includedTypes of typeGroups) {
    for (const point of searchPoints) {
      try {
        const response = await fetch(
          "https://places.googleapis.com/v1/places:searchNearby",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": GOOGLE_API_KEY!,
              "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos,places.location,places.types,places.googleMapsUri",
            },
            body: JSON.stringify({
              includedTypes: includedTypes,
              maxResultCount: 20,
              locationRestriction: {
                circle: {
                  center: { latitude: point.lat, longitude: point.lng },
                  radius: point.radius,
                },
              },
              rankPreference: "DISTANCE",
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          let newCount = 0;
          for (const place of (data.places || [])) {
            const placeTypes = place.types || [];
            const isExcluded = placeTypes.some((t: string) => excludedTypes.includes(t));
            
            if (!seenIds.has(place.id) && !isExcluded) {
              seenIds.add(place.id);
              allPlaces.push(place);
              newCount++;
            }
          }
          console.log(`[Nearby] ${point.label}, types ${includedTypes.join(',')}: ${data.places?.length || 0} results, ${newCount} new`);
        }
      } catch (error) {
        console.error("Search error for types", includedTypes, "point", point.label, ":", error);
      }
    }
  }
  
  console.log(`[Nearby] Found ${allPlaces.length} total unique places for category "${category}"`);

  // Transform places to response format with distance from user
  const result = (allPlaces || []).map((place: any) => {
    const openingHours = place.currentOpeningHours?.weekdayDescriptions || [];
    const placeLat = place.location?.latitude;
    const placeLng = place.location?.longitude;
    const distMeters = (placeLat && placeLng) ? calculateDistanceMeters(lat, lng, placeLat, placeLng) : 999999;
    return {
      id: place.id,
      name: place.displayName?.text || "Unknown",
      address: place.formattedAddress || "",
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
      rating: place.rating,
      totalReviews: place.userRatingCount,
      priceLevel: priceLevelToString(place.priceLevel),
      isOpen: place.currentOpeningHours?.openNow ?? true, // Use Google API value, default to OPEN if unknown (less restrictive)
      openingHours: openingHours,
      photoUrl: place.photos?.[0]?.name
        ? `${SUPABASE_URL}/functions/v1/google-places-photo?name=${encodeURIComponent(place.photos[0].name)}`
        : undefined,
      googleMapsUrl: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
      cuisine: extractCuisine(place.types),
      location: {
        lat: placeLat,
        lng: placeLng,
      },
      distanceMeters: Math.round(distMeters),
      reviews: [], // Reviews now fetched on demand via getPlaceDetails to save costs
    };
  });

  // Sort by distance from user (closest first)
  result.sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);
  console.log(`[Nearby] Sorted ${result.length} places by distance. Closest: ${result[0]?.name} (${result[0]?.distanceMeters}m), Farthest: ${result[result.length-1]?.name} (${result[result.length-1]?.distanceMeters}m)`);

  // Filter out blocked places (owner requested removal)
  try {
    const { data: blockedData } = await supabase.from('blocked_places').select('google_place_id');
    if (blockedData && blockedData.length > 0) {
      const blockedIds = new Set(blockedData.map((b: any) => b.google_place_id));
      const beforeCount = result.length;
      const filtered = result.filter((r: any) => !blockedIds.has(r.id));
      if (filtered.length < beforeCount) {
        console.log(`[Nearby] Filtered out ${beforeCount - filtered.length} blocked places`);
      }
      result.length = 0;
      result.push(...filtered);
    }
  } catch (e) {
    console.error("[Nearby] Error checking blocked places:", e);
  }

  // OPTIMIZATION #2: Save to cache for future requests
  if (result.length > 0) {
    try {
      await supabase
        .from('api_cache')
        .upsert({
          cache_key: cacheKey,
          data: result,
          created_at: new Date().toISOString(),
        }, { onConflict: 'cache_key' });
      console.log(`[Cache SAVE] Cached ${result.length} places for ${cacheKey}`);
    } catch (e) {
      console.error("[Cache SAVE] Failed to cache:", e);
    }
  }

  return result;
}

// Text Search API - search by query like "pizza", "sushi", "italian restaurant", etc.
async function textSearchRestaurants(lat: number, lng: number, radius: number, query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const cacheKey = `text_search_${query.toLowerCase().replace(/\s+/g, '_')}_${Math.round(lat * 1000) / 1000}_${Math.round(lng * 1000) / 1000}_v2`;
  
  // Smart cache: check cache with fallback logic
  const STALE_HOURS = 168; // 7 days
  const MIN_RESULTS = 5; // Minimum for text search (more specific queries)
  
  try {
    const { data: cached } = await supabase
      .from('api_cache')
      .select('data, created_at')
      .eq('cache_key', cacheKey)
      .single();
    
    if (cached) {
      const ageHours = (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60);
      const count = Array.isArray(cached.data) ? cached.data.length : 0;
      
      if (ageHours < PLACES_CACHE_HOURS && count >= MIN_RESULTS) {
        const freshness = ageHours < STALE_HOURS ? 'FRESH' : 'STALE';
        console.log(`[Text Search Cache HIT] ${freshness} - ${count} results, age: ${Math.round(ageHours)}h for "${query}"`);
        return cached.data;
      } else if (count < MIN_RESULTS) {
        console.log(`[Text Search Cache SKIP] Only ${count} results for "${query}" - calling Google`);
      }
    }
  } catch (e) {
    console.log(`[Text Search Cache MISS] Fetching fresh data for "${query}"`);
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY!,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos,places.location,places.types,places.googleMapsUri",
        },
        body: JSON.stringify({
          textQuery: `${query} restaurant`,
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radius,
            },
          },
          maxResultCount: 20,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Text Search] Error: ${errorText}`);
      return [];
    }

    const data = await response.json();
    const places = data.places || [];
    
    console.log(`[Text Search] Found ${places.length} results for "${query}"`);

    const result = places.map((place: any) => {
      const openingHours = place.currentOpeningHours?.weekdayDescriptions || [];
      const placeLat = place.location?.latitude;
      const placeLng = place.location?.longitude;
      const distMeters = (placeLat && placeLng) ? calculateDistanceMeters(lat, lng, placeLat, placeLng) : 999999;
      return {
        id: place.id,
        name: place.displayName?.text || "Unknown",
        address: place.formattedAddress || "",
        rating: place.rating,
        totalReviews: place.userRatingCount,
        priceLevel: priceLevelToString(place.priceLevel),
        isOpen: place.currentOpeningHours?.openNow ?? true,
        openingHours: openingHours,
        photoUrl: place.photos?.[0]?.name
          ? `${SUPABASE_URL}/functions/v1/google-places-photo?name=${encodeURIComponent(place.photos[0].name)}`
          : undefined,
        googleMapsUrl: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
        cuisine: extractCuisine(place.types),
        location: {
          lat: placeLat,
          lng: placeLng,
        },
        distanceMeters: Math.round(distMeters),
        reviews: [],
      };
    });

    // Sort by distance from user (closest first)
    result.sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);

    // Filter out places beyond the requested radius
    const beforeFilter = result.length;
    const filtered = result.filter((r: any) => r.distanceMeters <= radius);
    if (filtered.length < beforeFilter) {
      console.log(`[Text Search] Filtered ${beforeFilter - filtered.length} places beyond ${radius}m radius`);
    }
    result.length = 0;
    result.push(...filtered);

    // Save to cache
    if (result.length > 0) {
      try {
        await supabase
          .from('api_cache')
          .upsert({
            cache_key: cacheKey,
            data: result,
            created_at: new Date().toISOString(),
          }, { onConflict: 'cache_key' });
        console.log(`[Text Search Cache SAVE] Cached ${result.length} results for "${query}"`);
      } catch (e) {
        console.error("[Text Search Cache SAVE] Failed:", e);
      }
    }

    return result;
  } catch (error) {
    console.error("[Text Search] Error:", error);
    return [];
  }
}

async function getPlaceDetails(placeId: string) {
  // Handle both formats: "places/ChIJ..." and "ChIJ..."
  const cleanPlaceId = placeId.startsWith('places/') ? placeId : `places/${placeId}`;
  
  console.log(`[getPlaceDetails] Fetching details for: ${cleanPlaceId}`);
  
  const response = await fetch(
    `https://places.googleapis.com/v1/${cleanPlaceId}`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_API_KEY!,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,priceLevel,currentOpeningHours,photos,location,types,websiteUri,nationalPhoneNumber,googleMapsUri,reviews",
      },
    }
  );

  console.log(`[getPlaceDetails] Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[getPlaceDetails] Error: ${errorText}`);
    throw new Error(`Failed to fetch place details: ${response.status}`);
  }

  const place = await response.json();
  console.log(`[getPlaceDetails] Found ${place.reviews?.length || 0} reviews`);

  return {
    place: {
      id: place.id,
      name: place.displayName?.text || "Unknown",
      address: place.formattedAddress || "",
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
      rating: place.rating,
      totalReviews: place.userRatingCount,
      priceLevel: priceLevelToString(place.priceLevel),
      isOpen: place.currentOpeningHours?.openNow,
      photoUrl: place.photos?.[0]?.name
        ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`
        : undefined,
      googleMapsUrl: place.googleMapsUri,
      cuisine: extractCuisine(place.types),
      location: {
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      },
    },
    reviews: (place.reviews || []).map((review: any, idx: number) => ({
      id: `review-${idx}`,
      authorName: review.authorAttribution?.displayName || "Anonymous",
      authorPhotoUrl: review.authorAttribution?.photoUri,
      rating: review.rating,
      text: review.text?.text || "",
      relativeTimeDescription: review.relativePublishTimeDescription || "",
      time: new Date(review.publishTime).getTime() / 1000,
    })),
    photos: (place.photos || []).slice(0, 10).map((photo: any) =>
      `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`
    ),
  };
}

function priceLevelToString(priceLevel?: string): string {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE": return "Free";
    case "PRICE_LEVEL_INEXPENSIVE": return "$";
    case "PRICE_LEVEL_MODERATE": return "$$";
    case "PRICE_LEVEL_EXPENSIVE": return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE": return "$$$$";
    default: return "$$";
  }
}

function extractCuisine(types?: string[]): string {
  if (!types) return "Restaurant";

  const cuisineMap: Record<string, string> = {
    chinese_restaurant: "Chinese",
    japanese_restaurant: "Japanese",
    italian_restaurant: "Italian",
    mexican_restaurant: "Mexican",
    indian_restaurant: "Indian",
    thai_restaurant: "Thai",
    vietnamese_restaurant: "Vietnamese",
    korean_restaurant: "Korean",
    french_restaurant: "French",
    greek_restaurant: "Greek",
    brazilian_restaurant: "Brazilian",
    seafood_restaurant: "Seafood",
    steak_house: "Steakhouse",
    pizza_restaurant: "Pizza",
    sushi_restaurant: "Sushi",
    cafe: "Café",
    bakery: "Bakery",
    bar: "Bar & Grill",
  };

  for (const type of types) {
    if (cuisineMap[type]) return cuisineMap[type];
  }
  return "Restaurant";
}

// OPTIMIZATION #3: Get nearby localities with permanent caching
async function getNearbyLocalities(lat: number, lng: number, points: { lat: number; lng: number; direction: string }[]) {
  const cacheKey = getLocalityCacheKey(lat, lng);
  
  // Check cache first - localities rarely change
  try {
    const { data: cached } = await supabase
      .from('api_cache')
      .select('data, created_at')
      .eq('cache_key', cacheKey)
      .single();
    
    if (cached) {
      const cacheAge = (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60);
      if (cacheAge < LOCALITIES_CACHE_HOURS) {
        console.log(`[Cache HIT] Returning cached localities for ${cacheKey}`);
        return cached.data;
      }
    }
  } catch (e) {
    console.log(`[Cache MISS] Fetching fresh localities for ${cacheKey}`);
  }

  const localities: { name: string; lat: number; lng: number }[] = [];
  const seenNames = new Set<string>();

  // First, get the user's current locality
  try {
    const currentLocality = await reverseGeocode(lat, lng);
    if (currentLocality && !seenNames.has(currentLocality.name)) {
      seenNames.add(currentLocality.name);
      localities.push(currentLocality);
    }
  } catch (e) {
    console.error("Error getting current locality:", e);
  }

  // Then get localities for nearby points (limit to 2 more to reduce API calls)
  for (const point of points) {
    if (localities.length >= 3) break;
    try {
      const locality = await reverseGeocode(point.lat, point.lng);
      if (locality && !seenNames.has(locality.name)) {
        seenNames.add(locality.name);
        localities.push(locality);
      }
    } catch (e) {
      console.error("Error getting locality for point:", e);
    }
  }

  const result = { localities };

  // Save to cache for 7 days
  if (localities.length > 0) {
    try {
      await supabase
        .from('api_cache')
        .upsert({
          cache_key: cacheKey,
          data: result,
          created_at: new Date().toISOString(),
        }, { onConflict: 'cache_key' });
      console.log(`[Cache SAVE] Cached ${localities.length} localities for ${cacheKey}`);
    } catch (e) {
      console.error("[Cache SAVE] Failed to cache localities:", e);
    }
  }

  return result;
}

// Proxy photo requests to avoid exposing API key in browser
async function getPhotoProxy(photoName: string) {
  try {
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch photo: ${response.status}`);
    }

    // Return the image directly
    const imageData = await response.arrayBuffer();
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error proxying photo:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Reverse geocode a point to get locality name
async function reverseGeocode(lat: number, lng: number): Promise<{ name: string; lat: number; lng: number } | null> {
  // Try with result_type filter first
  let response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&result_type=locality|sublocality|neighborhood`
  );

  let data = await response.json();
  
  // If no results, try without filter
  if (!data.results || data.results.length === 0) {
    response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
    );
    data = await response.json();
  }

  if (data.results && data.results.length > 0) {
    // Try to find locality/sublocality in any result
    for (const result of data.results) {
      for (const component of result.address_components) {
        if (component.types.includes('locality') || 
            component.types.includes('sublocality') || 
            component.types.includes('sublocality_level_1') ||
            component.types.includes('neighborhood')) {
          return {
            name: component.long_name,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          };
        }
      }
    }
    
    // Fallback: use the first address component that looks like a place name
    const firstResult = data.results[0];
    if (firstResult.address_components && firstResult.address_components.length > 0) {
      // Skip street numbers and routes, get the first meaningful name
      for (const component of firstResult.address_components) {
        if (!component.types.includes('street_number') && 
            !component.types.includes('route') &&
            !component.types.includes('postal_code') &&
            !component.types.includes('country')) {
          return {
            name: component.long_name,
            lat: firstResult.geometry.location.lat,
            lng: firstResult.geometry.location.lng
          };
        }
      }
    }
  }
  return null;
}
