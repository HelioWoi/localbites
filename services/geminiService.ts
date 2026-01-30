
import { Restaurant, UserLocation, Review } from "../types";
import { getAllRestaurants, hasSupabaseData } from "./supabaseService";
import { searchNearbyRestaurants as searchGooglePlaces, getPlaceDetails } from "./googlePlacesProxy";

export async function getNearbyRestaurants(
  location: UserLocation, 
  filters?: { cuisine?: string; price?: string; openNow?: boolean }
): Promise<Restaurant[]> {
  console.log('[LocalBites] Fetching restaurants for:', location.name);
  
  // 1. First, get partner restaurants from Supabase (they have priority)
  let partnerRestaurants: Restaurant[] = [];
  try {
    const hasData = await hasSupabaseData();
    if (hasData) {
      console.log('[LocalBites] Loading partner restaurants from Supabase');
      partnerRestaurants = await getAllRestaurants();
      console.log('[LocalBites] Found', partnerRestaurants.length, 'partner restaurants');
    }
  } catch (error) {
    console.error('[LocalBites] Supabase error:', error);
  }

  // 2. Then, get Google Places restaurants
  let googleRestaurants: Restaurant[] = [];
  if (location.lat && location.lng) {
    try {
      const radius = location.radius || 5000; // Default 5km
      console.log('[LocalBites] Searching Google Places with radius:', radius / 1000, 'km');
      const googlePlaces = await searchGooglePlaces(location.lat, location.lng, radius);
      
      // Convert Google Places to Restaurant format
      googleRestaurants = googlePlaces.map(place => ({
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
      
      console.log('[LocalBites] Found', googleRestaurants.length, 'Google restaurants');
    } catch (error) {
      console.error('[LocalBites] Google Places error:', error);
    }
  }

  // 3. Merge results: Partners first, then Google (avoiding duplicates)
  const partnerNames = new Set(partnerRestaurants.map(r => r.name.toLowerCase()));
  const filteredGoogleRestaurants = googleRestaurants.filter(
    r => !partnerNames.has(r.name.toLowerCase())
  );

  let results = [...partnerRestaurants, ...filteredGoogleRestaurants];

  // 4. Sort by distance (closest first)
  results.sort((a, b) => {
    const distA = parseFloat(a.distance.replace(/[^\d.]/g, '')) || 0;
    const distB = parseFloat(b.distance.replace(/[^\d.]/g, '')) || 0;
    // Convert km to m if needed for comparison
    const distAMeters = a.distance.includes('km') ? distA * 1000 : distA;
    const distBMeters = b.distance.includes('km') ? distB * 1000 : distB;
    return distAMeters - distBMeters;
  });

  // 5. Apply filters
  if (filters?.cuisine && filters.cuisine !== 'All') {
    results = results.filter(r => 
      r.cuisine.toLowerCase().includes(filters.cuisine!.toLowerCase())
    );
  }

  if (filters?.price) {
    results = results.filter(r => r.priceLevel === filters.price);
  }

  if (filters?.openNow) {
    results = results.filter(r => r.isOpen);
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
