import { supabase } from '../lib/supabase';
import { Restaurant, Dish, Review } from '../types';
import { textSearchRestaurants } from './googlePlacesProxy';

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
    .from('partners')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error checking Supabase data:', error);
    return false;
  }

  console.log('[hasSupabaseData] Partners count:', count);
  return (count || 0) > 0;
}

// Calculate distance between two points in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fetch partner restaurants (from partners table with menu_items)
export async function getPartnerRestaurants(userLat?: number, userLng?: number): Promise<Restaurant[]> {
  console.log('[getPartnerRestaurants] Called with userLat:', userLat, 'userLng:', userLng);
  
  const { data: partners, error } = await supabase
    .from('partners')
    .select(`
      *,
      menu_items (*)
    `)
    .not('restaurant_name', 'is', null)
    .order('created_at', { ascending: false });
  
  // Filter out partners with expired trial (no active subscription)
  const now = new Date();
  const activePartners = partners?.filter(p => {
    // Priority 0: Lifetime access (never expires)
    if (p.lifetime_access === true) {
      return true;
    }
    // Priority 1: Has active Stripe subscription
    if (p.subscription_status === 'active' && p.subscription_end_date) {
      return new Date(p.subscription_end_date) > now;
    }
    // Priority 2: Has active trial
    if (p.trial_ends_at) {
      return new Date(p.trial_ends_at) > now;
    }
    // No subscription or trial
    return false;
  }) || [];

  if (error) {
    console.error('Error fetching partner restaurants:', error);
    return [];
  }

  console.log('[PartnerRestaurants] Raw partners from DB:', partners?.length || 0);
  console.log('[PartnerRestaurants] Active partners (trial not expired):', activePartners.length);
  if (activePartners && activePartners.length > 0) {
    activePartners.forEach(p => {
      console.log(`  - ${p.restaurant_name}: ${p.menu_items?.length || 0} items, lat: ${p.latitude}, lng: ${p.longitude}`);
    });
  }

  // Transform partner data to Restaurant format
  const filtered = (activePartners || [])
    .filter(p => {
      const hasName = !!p.restaurant_name;
      const hasItems = p.menu_items && p.menu_items.length > 0;
      console.log(`[Filter] ${p.restaurant_name || 'NO NAME'}: name=${hasName}, items=${hasItems}`);
      return hasName && hasItems;
    });

  console.log('[PartnerRestaurants] After filter:', filtered.length);

  // Fetch Google ratings for partners that don't have them yet
  for (const p of filtered) {
    if ((!p.total_reviews || p.total_reviews === 0) && p.restaurant_name) {
      try {
        const query = p.address 
          ? `${p.restaurant_name} ${p.address}` 
          : p.restaurant_name;
        const results = await textSearchRestaurants(0, 0, 50000, query);
        if (results.length > 0 && results[0].rating) {
          p.rating = results[0].rating;
          p.total_reviews = results[0].totalReviews || 0;
          console.log(`[PartnerRestaurants] Google rating for ${p.restaurant_name}: ${p.rating} (${p.total_reviews} reviews)`);
        }
      } catch (e) {
        console.error(`[PartnerRestaurants] Failed to fetch Google rating for ${p.restaurant_name}:`, e);
      }
    }
  }

  // Map and calculate distances first
  const restaurantsWithDistance = filtered.map(p => {
    // Calculate real distance if coordinates are available
    let distance = '0.5 km'; // Default
    let distanceKm = 0.5; // For sorting
    
    if (userLat && userLng && p.latitude && p.longitude) {
      distanceKm = calculateDistance(userLat, userLng, p.latitude, p.longitude);
      distance = distanceKm < 1 
        ? `${Math.round(distanceKm * 1000)}m` 
        : `${distanceKm.toFixed(1)} km`;
      console.log(`[Distance] ${p.restaurant_name}: ${distance} (${distanceKm.toFixed(2)} km)`);
    } else {
      console.log(`[Distance] ${p.restaurant_name}: using default ${distance} (missing coords: user=${!!(userLat && userLng)}, partner=${!!(p.latitude && p.longitude)})`);
    }

    // Check if partner has active premium subscription
    const now = new Date();
    const isPremium = p.lifetime_access === true ||
                      (p.subscription_status === 'active' && p.subscription_end_date && new Date(p.subscription_end_date) > now) ||
                      (p.trial_ends_at && new Date(p.trial_ends_at) > now);

    // Calculate priority score: Premium gets 1000 boost, then sorted by distance
    // Formula: (isPremium ? 1000 : 0) + (maxDistance - distance) * 10
    const maxDistance = 10; // 10km max for scoring
    const priorityScore = (isPremium ? 1000 : 0) + (maxDistance - Math.min(distanceKm, maxDistance)) * 10;

    console.log(`[Priority] ${p.restaurant_name}: isPremium=${isPremium}, distance=${distanceKm.toFixed(2)}km, score=${priorityScore.toFixed(0)}`);

    return {
      partner: p,
      distanceKm,
      isPremium,
      priorityScore,
      id: p.id,
      name: p.restaurant_name,
      cuisine: p.cuisine || 'Various',
      priceLevel: '$$',
      rating: p.rating || 4.5,
      totalReviews: p.total_reviews || 0,
      address: p.address || '',
      phone: p.phone || '',
      distance,
      mainPhotoUrl: p.photo_url || p.menu_items[0]?.video_url || '',
      googleMapsUrl: p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : '',
      website: p.website || '',
      isSubscribed: true,
      isOpen: true,
      isPartner: true,
      slug: p.slug,
      dishes: (p.menu_items || [])
        .sort((a: any, b: any) => {
          // Featured items first
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          // Then by sort_order
          return (a.sort_order || 0) - (b.sort_order || 0);
        })
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          thumbnailUrl: item.video_url,
          videoUrl: item.video_url,
          price: item.price,
          category: item.category,
          isFeatured: item.is_featured || false,
        })),
      reviews: [],
      reviewSnippets: [],
    };
  });

  // Filter partners by distance from user
  // <5km = premium position (top of feed)
  // 5-10km = included but mixed with other results (no priority boost)
  // >10km = excluded from feed
  const PREMIUM_RADIUS_KM = 5;
  const MAX_RADIUS_KM = 10;

  const distanceFiltered = restaurantsWithDistance.filter(r => {
    // If no user coords or no partner coords, include by default (can't calculate)
    if (!userLat || !userLng || !r.partner.latitude || !r.partner.longitude) {
      return true;
    }
    if (r.distanceKm > MAX_RADIUS_KM) {
      console.log(`[PartnerRadius] ${r.name} EXCLUDED - ${r.distanceKm.toFixed(1)}km > ${MAX_RADIUS_KM}km limit`);
      return false;
    }
    return true;
  });

  // Adjust priority: partners beyond PREMIUM_RADIUS_KM lose the premium boost
  distanceFiltered.forEach(r => {
    if (userLat && userLng && r.partner.latitude && r.partner.longitude && r.distanceKm > PREMIUM_RADIUS_KM) {
      // Remove premium boost — will be mixed with Google results instead of pinned to top
      r.priorityScore = (MAX_RADIUS_KM - Math.min(r.distanceKm, MAX_RADIUS_KM)) * 10;
      r.isSubscribed = false; // Treat as regular so geminiService sort doesn't pin to top
      console.log(`[PartnerRadius] ${r.name} DEMOTED - ${r.distanceKm.toFixed(1)}km > ${PREMIUM_RADIUS_KM}km, mixed with results`);
    }
  });

  // Sort by priority score (premium + distance)
  // Higher score = appears first in feed
  const sorted = distanceFiltered.sort((a, b) => b.priorityScore - a.priorityScore);
  
  console.log('[PartnerRestaurants] Sorted by priority:');
  sorted.slice(0, 5).forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.name} - Premium: ${r.isPremium}, Distance: ${r.distanceKm.toFixed(2)}km, Score: ${r.priorityScore.toFixed(0)}`);
  });

  return sorted;
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
