
export interface Review {
  id: string;
  authorName: string;
  authorPhotoUrl?: string;
  rating: number; // 1-5 stars
  text: string;
  relativeTimeDescription: string; // e.g. "2 weeks ago"
  time: number; // Unix timestamp for sorting
  photoUrl?: string; // Customer photo of the food (for Reels-style view)
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceLevel: string; // $, $$, $$$
  distance: string;
  distanceMeters?: number;
  isOpen: boolean;
  rating?: number;
  totalReviews?: number;
  address: string;
  phone?: string;
  website?: string;
  googleMapsUrl: string;
  dishes: Dish[];
  isSubscribed: boolean; // true = has video content, false = Google photos only
  mainPhotoUrl: string;
  reviews?: Review[]; // Full review objects from Google Places API
  reviewSnippets?: string[]; // Legacy: simple text snippets
  sources?: { title: string; uri: string }[]; // Grounding sources
  openingHours?: string[]; // e.g. ["Monday: 9:00 AM – 5:00 PM", ...]
  // Advanced filters
  dietaryOptions?: string[]; // e.g. ["vegan", "gluten-free", "vegetarian"]
  ambiance?: string[]; // e.g. ["romantic", "family-friendly", "casual"]
  hasParking?: boolean;
  hasOutdoorSeating?: boolean;
}

export interface Dish {
  id: string;
  name: string;
  videoUrl?: string;
  thumbnailUrl: string;
  description?: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  name?: string;
  radius?: number; // Search radius in meters (default 5000)
}

export type CategoryFilter = 'restaurants' | 'cafes' | 'bars' | 'desserts' | 'pizza' | 'all';

export type AppState = 'SPLASH' | 'FILTER_SELECTION' | 'LOCATION_SELECTOR' | 'FEED' | 'PROFILE' | 'ADMIN' | 'PARTNER' | 'LOADING';
