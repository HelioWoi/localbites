
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
  isOpen: boolean;
  rating?: number;
  totalReviews?: number;
  address: string;
  website?: string;
  googleMapsUrl: string;
  dishes: Dish[];
  isSubscribed: boolean; // true = has video content, false = Google photos only
  mainPhotoUrl: string;
  reviews?: Review[]; // Full review objects from Google Places API
  reviewSnippets?: string[]; // Legacy: simple text snippets
  sources?: { title: string; uri: string }[]; // Grounding sources
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
}

export type AppState = 'SPLASH' | 'LOCATION_SELECTOR' | 'FEED' | 'PROFILE' | 'ADMIN' | 'FAVORITES';
