// Google Places API Service
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  totalReviews?: number;
  priceLevel?: string;
  isOpen?: boolean;
  photoUrl?: string;
  googleMapsUrl: string;
  location: {
    lat: number;
    lng: number;
  };
  types?: string[];
}

interface PlaceReview {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  time: number;
}

interface PlaceDetails extends PlaceResult {
  reviews: PlaceReview[];
  photos: string[];
  openingHours?: string[];
}

// Search for nearby restaurants
export async function searchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number = 1500, // meters
  keyword?: string
): Promise<PlaceResult[]> {
  if (!GOOGLE_API_KEY) {
    console.error('Google Places API key not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: radius.toString(),
      type: 'restaurant',
      key: GOOGLE_API_KEY,
    });

    if (keyword) {
      params.append('keyword', keyword);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
    );

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return [];
    }

    return (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address || '',
      rating: place.rating,
      totalReviews: place.user_ratings_total,
      priceLevel: priceLevelToString(place.price_level),
      isOpen: place.opening_hours?.open_now,
      photoUrl: place.photos?.[0]
        ? getPhotoUrl(place.photos[0].photo_reference)
        : undefined,
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      types: place.types,
    }));
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return [];
  }
}

// Get detailed place information including reviews
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_API_KEY) {
    console.error('Google Places API key not configured');
    return null;
  }

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,opening_hours,photos,reviews,geometry,types',
      key: GOOGLE_API_KEY,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    );

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return null;
    }

    const place = data.result;

    return {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address || '',
      phone: place.formatted_phone_number,
      website: place.website,
      rating: place.rating,
      totalReviews: place.user_ratings_total,
      priceLevel: priceLevelToString(place.price_level),
      isOpen: place.opening_hours?.open_now,
      photoUrl: place.photos?.[0]
        ? getPhotoUrl(place.photos[0].photo_reference)
        : undefined,
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      types: place.types,
      reviews: (place.reviews || []).map((review: any) => ({
        authorName: review.author_name,
        authorPhotoUrl: review.profile_photo_url,
        rating: review.rating,
        text: review.text,
        relativeTimeDescription: review.relative_time_description,
        time: review.time,
      })),
      photos: (place.photos || []).slice(0, 10).map((photo: any) =>
        getPhotoUrl(photo.photo_reference, 800)
      ),
      openingHours: place.opening_hours?.weekday_text,
    };
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

// Text search for restaurants (more flexible than nearby search)
export async function searchRestaurantsByText(
  query: string,
  lat?: number,
  lng?: number
): Promise<PlaceResult[]> {
  if (!GOOGLE_API_KEY) {
    console.error('Google Places API key not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query: `${query} restaurant`,
      type: 'restaurant',
      key: GOOGLE_API_KEY,
    });

    if (lat && lng) {
      params.append('location', `${lat},${lng}`);
      params.append('radius', '5000');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
    );

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return [];
    }

    return (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address || '',
      rating: place.rating,
      totalReviews: place.user_ratings_total,
      priceLevel: priceLevelToString(place.price_level),
      isOpen: place.opening_hours?.open_now,
      photoUrl: place.photos?.[0]
        ? getPhotoUrl(place.photos[0].photo_reference)
        : undefined,
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      types: place.types,
    }));
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return [];
  }
}

// Get photo URL from photo reference
function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

// Convert price level number to string
function priceLevelToString(priceLevel?: number): string {
  switch (priceLevel) {
    case 0: return 'Free';
    case 1: return '$';
    case 2: return '$$';
    case 3: return '$$$';
    case 4: return '$$$$';
    default: return '$$';
  }
}

// Calculate distance between two coordinates (in km)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

// Extract cuisine type from Google place types
export function extractCuisine(types?: string[]): string {
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
    'spanish_restaurant': 'Spanish',
    'american_restaurant': 'American',
    'brazilian_restaurant': 'Brazilian',
    'seafood_restaurant': 'Seafood',
    'steak_house': 'Steakhouse',
    'pizza_restaurant': 'Pizza',
    'sushi_restaurant': 'Sushi',
    'burger_restaurant': 'Burgers',
    'cafe': 'Café',
    'bakery': 'Bakery',
    'bar': 'Bar & Grill',
    'meal_takeaway': 'Takeaway',
    'meal_delivery': 'Delivery',
  };

  for (const type of types) {
    if (cuisineMap[type]) {
      return cuisineMap[type];
    }
  }

  return 'Restaurant';
}
