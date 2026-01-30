import { supabase } from '../lib/supabase';
import { Restaurant, Dish, Review } from '../types';

// Fetch all restaurants with their dishes and reviews
export async function getRestaurantsFromSupabase(): Promise<Restaurant[]> {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      dishes (*),
      reviews (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }

  // Transform database format to app format
  return (restaurants || []).map(r => ({
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    priceLevel: r.price_level,
    rating: parseFloat(r.rating),
    totalReviews: r.total_reviews,
    address: r.address,
    distance: r.distance,
    mainPhotoUrl: r.main_photo_url,
    googleMapsUrl: r.google_maps_url,
    website: r.website,
    isSubscribed: r.is_subscribed,
    isOpen: true,
    dishes: (r.dishes || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      thumbnailUrl: d.thumbnail_url,
      videoUrl: d.video_url,
    })),
    reviews: (r.reviews || []).map((rev: any) => ({
      id: rev.id,
      authorName: rev.author_name,
      authorPhotoUrl: rev.author_photo_url,
      rating: rev.rating,
      text: rev.text,
      photoUrl: rev.photo_url,
      relativeTimeDescription: rev.relative_time_description,
      time: rev.review_time,
    })),
    reviewSnippets: (r.reviews || []).slice(0, 3).map((rev: any) => rev.text),
  }));
}

// Fetch single restaurant by ID
export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      dishes (*),
      reviews (*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching restaurant:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    cuisine: data.cuisine,
    priceLevel: data.price_level,
    rating: parseFloat(data.rating),
    totalReviews: data.total_reviews,
    address: data.address,
    distance: data.distance,
    mainPhotoUrl: data.main_photo_url,
    googleMapsUrl: data.google_maps_url,
    website: data.website,
    isSubscribed: data.is_subscribed,
    isOpen: true,
    dishes: (data.dishes || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      thumbnailUrl: d.thumbnail_url,
      videoUrl: d.video_url,
    })),
    reviews: (data.reviews || []).map((rev: any) => ({
      id: rev.id,
      authorName: rev.author_name,
      authorPhotoUrl: rev.author_photo_url,
      rating: rev.rating,
      text: rev.text,
      photoUrl: rev.photo_url,
      relativeTimeDescription: rev.relative_time_description,
      time: rev.review_time,
    })),
    reviewSnippets: (data.reviews || []).slice(0, 3).map((rev: any) => rev.text),
  };
}

// Check if Supabase has data
export async function hasSupabaseData(): Promise<boolean> {
  const { count, error } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error checking Supabase data:', error);
    return false;
  }

  return (count || 0) > 0;
}

// Fetch partner restaurants (from partners table with menu_items)
export async function getPartnerRestaurants(): Promise<Restaurant[]> {
  const { data: partners, error } = await supabase
    .from('partners')
    .select(`
      *,
      menu_items (*)
    `)
    .not('restaurant_name', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching partner restaurants:', error);
    return [];
  }

  // Transform partner data to Restaurant format
  return (partners || [])
    .filter(p => p.restaurant_name && p.menu_items && p.menu_items.length > 0)
    .map(p => ({
      id: p.id,
      name: p.restaurant_name,
      cuisine: p.cuisine || 'Various',
      priceLevel: '$$',
      rating: 4.5,
      totalReviews: 0,
      address: p.address || '',
      phone: p.phone || '',
      distance: '0.5 km',
      mainPhotoUrl: p.photo_url || p.menu_items[0]?.video_url || '',
      googleMapsUrl: p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : '',
      website: p.website || '',
      isSubscribed: true,
      isOpen: true,
      isPartner: true,
      slug: p.slug,
      dishes: (p.menu_items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        thumbnailUrl: item.video_url,
        videoUrl: item.video_url,
        price: item.price,
        category: item.category,
      })),
      reviews: [],
      reviewSnippets: [],
    }));
}

// Get all restaurants (both regular and partner)
export async function getAllRestaurants(): Promise<Restaurant[]> {
  const [regularRestaurants, partnerRestaurants] = await Promise.all([
    getRestaurantsFromSupabase(),
    getPartnerRestaurants(),
  ]);

  // Combine and return, with partner restaurants first (they're paying!)
  return [...partnerRestaurants, ...regularRestaurants];
}
