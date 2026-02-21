import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { textSearchRestaurants } from '../services/googlePlacesProxy';
import RestaurantMenuPage from '../screens/RestaurantMenuPage';
import { Loader2 } from 'lucide-react';

interface RestaurantMenuLoaderProps {
  slug: string;
}

const RestaurantMenuLoader: React.FC<RestaurantMenuLoaderProps> = ({ slug }) => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        // Fetch restaurant by slug
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('*')
          .eq('slug', slug)
          .in('subscription_status', ['active', 'trialing', 'canceled'])
          .single();

        if (partnerError || !partnerData) {
          setError('Restaurant not found');
          setLoading(false);
          return;
        }

        // Fetch menu items for this restaurant (not deleted)
        const { data: menuItems, error: menuError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('partner_id', partnerData.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true });

        if (menuError) {
          console.error('Menu error:', menuError);
        }

        // Filter to only items with actual videos (exclude photo-only items)
        const videoItems = (menuItems || []).filter(item => item.video_url && item.video_url !== '');

        // Get unique categories from video items only
        const categories = [...new Set(videoItems.map(item => item.category))].filter(Boolean);

        // Fetch real Google rating for partner restaurant
        let googleRating = partnerData.rating || 4.5;
        let googleTotalReviews = partnerData.total_reviews || 0;
        if (googleTotalReviews === 0 && partnerData.restaurant_name) {
          try {
            const query = partnerData.address 
              ? `${partnerData.restaurant_name} ${partnerData.address}` 
              : partnerData.restaurant_name;
            const results = await textSearchRestaurants(0, 0, 50000, query);
            if (results.length > 0 && results[0].rating) {
              googleRating = results[0].rating;
              googleTotalReviews = results[0].totalReviews || 0;
            }
          } catch (e) {
            console.error('[MenuLoader] Google rating fetch error:', e);
          }
        }

        setRestaurant({
          id: partnerData.id,
          name: partnerData.restaurant_name || partnerData.email?.split('@')[0] || 'Restaurant',
          slug: partnerData.slug,
          cuisine: partnerData.cuisine || 'Restaurant',
          address: partnerData.address || '',
          rating: googleRating,
          totalReviews: googleTotalReviews,
          logoUrl: partnerData.logo_url,
          coverPhotoUrl: partnerData.cover_photo_url,
          googleMapsUrl: partnerData.google_maps_url,
          website: partnerData.website,
          openingHours: partnerData.google_opening_hours || [],
          menuItems: videoItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            videoUrl: item.video_url,
            price: item.price,
          })),
          categories,
        });
        setLoading(false);
      } catch (err) {
        console.error('Load error:', err);
        setError('Failed to load restaurant');
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [slug]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
        <p className="text-white/60 text-sm">Loading menu...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">🍽️</span>
        </div>
        <h1 className="text-white text-2xl font-bold mb-2">Restaurant Not Found</h1>
        <p className="text-white/60 mb-8">This menu link may be invalid or the restaurant is no longer active.</p>
        <a 
          href="/"
          className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl"
        >
          Discover Restaurants
        </a>
      </div>
    );
  }

  if (restaurant.menuItems.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">📹</span>
        </div>
        <h1 className="text-white text-2xl font-bold mb-2">{restaurant.name}</h1>
        <p className="text-white/60 mb-8">Menu videos coming soon!</p>
        {restaurant.website && (
          <a 
            href={restaurant.website}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl"
          >
            Visit Website
          </a>
        )}
      </div>
    );
  }

  return <RestaurantMenuPage restaurant={restaurant} />;
};

export default RestaurantMenuLoader;
