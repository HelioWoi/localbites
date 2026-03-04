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
  console.log('[hasSupabaseData] Checking if Supabase has partner data...');
  const { count, error } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[hasSupabaseData] Error:', error);
    return false;
  }

  console.log('[hasSupabaseData] Partners count:', count, '- returning:', (count || 0) > 0);
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

  // Fetch Google data for partners and save to Supabase (cost optimization)
  for (const p of filtered) {
    // Check if Google data is stale (older than 7 days) or missing
    const needsGoogleData = !p.google_data_updated_at || 
                           (new Date().getTime() - new Date(p.google_data_updated_at).getTime()) > 7 * 24 * 60 * 60 * 1000;
    
    console.log(`[GoogleData] ${p.restaurant_name}: needsGoogleData=${needsGoogleData}, google_data_updated_at=${p.google_data_updated_at}`);
    
    if (needsGoogleData && p.restaurant_name) {
      try {
        const query = p.address 
          ? `${p.restaurant_name} ${p.address}` 
          : p.restaurant_name;
        console.log(`[GoogleData] Searching Google for: "${query}"`);
        
        // Use partner coordinates if available, otherwise use Sydney CBD
        const searchLat = p.latitude || -33.8688;
        const searchLng = p.longitude || 151.2093;
        const results = await textSearchRestaurants(searchLat, searchLng, 50000, query);
        console.log(`[GoogleData] Found ${results.length} results`);
        
        if (results.length > 0) {
          const googlePlace = results[0];
          console.log(`[GoogleData] Getting details for place ID: ${googlePlace.id}`);
          
          // Get detailed info including opening hours
          const { getPlaceDetails } = await import('./googlePlacesProxy');
          const details = await getPlaceDetails(googlePlace.id);
          console.log(`[GoogleData] Details received:`, {
            hasOpeningHours: !!details?.place?.openingHours,
            openingHoursLength: details?.place?.openingHours?.length || 0,
            hasPhone: !!details?.place?.phone,
            hasWebsite: !!details?.place?.website
          });
          
          if (details) {
            // Save Google data to Supabase (COST OPTIMIZATION: avoid duplicate API calls)
            const { error: updateError } = await supabase
              .from('partners')
              .update({
                google_opening_hours: details.place.openingHours || [],
                google_phone: details.place.phone || null,
                google_website: details.place.website || null,
                google_rating: details.place.rating || null,
                google_total_reviews: details.place.totalReviews || 0,
                google_maps_url: details.place.googleMapsUrl || null,
                google_data_updated_at: new Date().toISOString()
              })
              .eq('id', p.id);
            
            if (updateError) {
              console.error(`[PartnerRestaurants] Failed to save Google data for ${p.restaurant_name}:`, updateError);
            } else {
              console.log(`[PartnerRestaurants] ✅ Saved Google data for ${p.restaurant_name} (opening hours, phone, website, rating)`);
              
              // Update local object
              p.google_opening_hours = details.place.openingHours || [];
              p.google_phone = details.place.phone || null;
              p.google_website = details.place.website || null;
              p.google_rating = details.place.rating || null;
              p.google_total_reviews = details.place.totalReviews || 0;
              p.google_maps_url = details.place.googleMapsUrl || null;
            }
          }
          
          // Update rating for display
          if (googlePlace.rating) {
            p.rating = googlePlace.rating;
            p.total_reviews = googlePlace.totalReviews || 0;
          }
        }
      } catch (e) {
        console.error(`[PartnerRestaurants] Failed to fetch Google data for ${p.restaurant_name}:`, e);
      }
    } else if (p.google_data_updated_at) {
      console.log(`[PartnerRestaurants] Using cached Google data for ${p.restaurant_name} (updated ${new Date(p.google_data_updated_at).toLocaleDateString()})`);
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

    const restaurant: any = {
      id: p.id,
      name: p.restaurant_name,
      cuisine: p.cuisine || 'Various',
      priceLevel: '$$',
      rating: p.google_rating || p.rating || 4.5,
      totalReviews: p.google_total_reviews || p.total_reviews || 0,
      address: p.address || '',
      phone: p.google_phone || p.phone || '',
      distance,
      mainPhotoUrl: p.photo_url || p.menu_items[0]?.video_url || '',
      googleMapsUrl: p.google_maps_url || (p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : ''),
      website: p.google_website || p.website || '',
      openingHours: p.google_opening_hours || [],
      instagramUrl: p.instagram_url || '',
      facebookUrl: p.facebook_url || '',
      tiktokUrl: p.tiktok_url || '',
      ordering_url: p.ordering_url || '',
      enable_ordering_button: p.enable_ordering_button || false,
      isSubscribed: true,
      isOpen: true,
      isPartner: true,
      slug: p.slug,
      dishes: (p.menu_items || [])
        .filter((item: any) => !item.deleted_at) // Exclude deleted items
        .sort((a: any, b: any) => {
          // Featured items first
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          // Then by sort_order
          return (a.sort_order || 0) - (b.sort_order || 0);
        })
        .map((item: any) => {
          // Sanitize invalid videoUrl (e.g., string 'hasVideo' instead of actual URL)
          const sanitizedVideoUrl = item.video_url && item.video_url.startsWith('http') ? item.video_url : '';
          
          return {
            id: item.id,
            name: item.name,
            description: item.description || '',
            thumbnailUrl: item.photo_url || sanitizedVideoUrl || '',
            videoUrl: sanitizedVideoUrl,
            photoUrl: item.photo_url || '',
            price: item.price,
            category: item.category,
            isFeatured: item.is_featured || false,
            dish_order_url: item.dish_order_url || '',
          };
        }),
      reviews: (p.google_reviews || []).map((r: any, i: number) => ({
        id: `review-${i}`,
        authorName: r.authorName || 'Anonymous',
        authorPhotoUrl: r.authorPhotoUrl || '',
        rating: r.rating || 5,
        text: r.text || '',
        time: r.time || Date.now(),
        relativeTime: r.relativeTime || 'Recently',
      })),
      reviewSnippets: [],
    };
    
    // Add auxiliary properties for filtering/sorting (not part of Restaurant interface)
    (restaurant as any).distanceKm = distanceKm;
    (restaurant as any).isPremium = isPremium;
    (restaurant as any).priorityScore = priorityScore;
    (restaurant as any).partner = p;
    
    return restaurant;
  });

  // Filter partners by distance from user
  // <5km = premium position (top of feed)
  // 5-10km = included but mixed with other results (no priority boost)
  // >10km = excluded from feed
  const PREMIUM_RADIUS_KM = 5;
  const MAX_RADIUS_KM = 10;

  const distanceFiltered = restaurantsWithDistance.filter(r => {
    // If user has no GPS, include all partners (can't calculate distance)
    if (!userLat || !userLng) {
      return true;
    }
    // If partner has no coordinates, EXCLUDE — prevents showing globally
    if (!r.partner.latitude || !r.partner.longitude) {
      console.log(`[PartnerRadius] ${r.name} EXCLUDED - no coordinates set`);
      return false;
    }
    if (r.distanceKm > MAX_RADIUS_KM) {
      console.log(`[PartnerRadius] ${r.name} EXCLUDED - ${r.distanceKm.toFixed(1)}km > ${MAX_RADIUS_KM}km limit`);
      return false;
    }
    return true;
  });

  // Add isHomeEligible flag: partners within 5km radius are eligible for Home feed
  // IMPORTANT: isSubscribed = business truth (subscription status)
  //            isHomeEligible = UX rule (distance-based display on Home)
  distanceFiltered.forEach(r => {
    const distanceKm = (r as any).distanceKm;
    const isWithinHomeRadius = distanceKm <= PREMIUM_RADIUS_KM;
    
    // Add isHomeEligible property (UX rule)
    (r as any).isHomeEligible = r.isSubscribed && isWithinHomeRadius;
    
    // Adjust priority score for partners beyond premium radius (for sorting only)
    if (!isWithinHomeRadius) {
      (r as any).priorityScore = (MAX_RADIUS_KM - Math.min(distanceKm, MAX_RADIUS_KM)) * 10;
      console.log(`[PartnerRadius] ${r.name} - ${distanceKm.toFixed(1)}km > ${PREMIUM_RADIUS_KM}km, isHomeEligible=false (but isSubscribed stays true)`);
    } else {
      console.log(`[PartnerRadius] ${r.name} - ${distanceKm.toFixed(1)}km ≤ ${PREMIUM_RADIUS_KM}km, isHomeEligible=true`);
    }
  });

  // Sort by priority score (premium + distance)
  // Higher score = appears first in feed
  const sorted = distanceFiltered.sort((a, b) => b.priorityScore - a.priorityScore);
  
  console.log('[PartnerRestaurants] Sorted by priority:');
  sorted.slice(0, 5).forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.name} - Premium: ${r.isPremium}, Distance: ${r.distanceKm.toFixed(2)}km, Score: ${r.priorityScore.toFixed(0)}, isSubscribed: ${r.isSubscribed} (${typeof r.isSubscribed})`);
  });

  return sorted;
}

// Check if a restaurant name matches an active partner and return full partner data
export async function getPartnerByName(name: string): Promise<Restaurant | null> {
  try {
    const { data: partners, error } = await supabase
      .from('partners')
      .select(`*, menu_items (*)`)
      .ilike('restaurant_name', `%${name}%`)
      .limit(1);

    if (error || !partners || partners.length === 0) return null;

    const p = partners[0];

    // Check if partner is active
    const now = new Date();
    const isActive = p.lifetime_access === true ||
      (p.subscription_status === 'active' && p.subscription_end_date && new Date(p.subscription_end_date) > now) ||
      (p.trial_ends_at && new Date(p.trial_ends_at) > now);

    if (!isActive) return null;
    if (!p.menu_items || p.menu_items.length === 0) return null;

    return {
      id: p.id,
      name: p.restaurant_name,
      cuisine: p.cuisine || 'Various',
      priceLevel: '$$',
      rating: p.google_rating || p.rating || 4.5,
      totalReviews: p.google_total_reviews || p.total_reviews || 0,
      address: p.address || '',
      phone: p.google_phone || p.phone || '',
      distance: '',
      mainPhotoUrl: p.photo_url || p.menu_items[0]?.video_url || '',
      googleMapsUrl: p.google_maps_url || (p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : ''),
      website: p.google_website || p.website || '',
      instagramUrl: p.instagram_url || '',
      facebookUrl: p.facebook_url || '',
      tiktokUrl: p.tiktok_url || '',
      openingHours: p.google_opening_hours || [],
      isSubscribed: true,
      isOpen: true,
      dishes: (p.menu_items || [])
        .filter((item: any) => !item.deleted_at) // Exclude deleted items
        .sort((a: any, b: any) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
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
    };
  } catch (err) {
    console.error('[getPartnerByName] Error:', err);
    return null;
  }
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
