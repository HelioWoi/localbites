import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://quybuvapflnzcaedjbkl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbRestaurant {
  id: string;
  name: string;
  cuisine: string;
  price_level: string;
  rating: number;
  total_reviews: number;
  address: string;
  distance: string;
  main_photo_url: string;
  google_maps_url: string;
  website?: string;
  is_subscribed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbDish {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  video_url?: string;
  created_at: string;
}

export interface DbReview {
  id: string;
  restaurant_id: string;
  author_name: string;
  author_photo_url?: string;
  rating: number;
  text: string;
  photo_url?: string;
  relative_time_description: string;
  review_time: number;
  created_at: string;
}
