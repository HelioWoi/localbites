import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import RestaurantMenuPage from '../screens/RestaurantMenuPage';
import { Loader2 } from 'lucide-react';

interface RestaurantMenuLoaderProps {
  slug: string;
}

const RestaurantMenuLoader: React.FC<RestaurantMenuLoaderProps> = ({ slug }) => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Desktop detection - redirect to profile on desktop
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      // On desktop, redirect to profile instead of fullscreen menu
      const currentPath = window.location.pathname;
      const searchParams = window.location.search;
      
      if (currentPath.startsWith('/r/')) {
        // QR route - redirect to /r/:slug
        window.location.href = `/r/${slug}${searchParams}`;
      } else {
        // App feed route - redirect to /:slug
        window.location.href = `/${slug}${searchParams}`;
      }
    }
  }, [slug]);

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

        // Include photo-only items as animated cards for all partners
        const enablePhotoCards = true;

        // Filter items: always include video items; include photo-only items for pilot partners
        const feedItems = (menuItems || []).filter(item => {
          const hasVideo = item.video_url && item.video_url !== '';
          const hasPhoto = item.photo_url && item.photo_url !== '';
          return hasVideo || (enablePhotoCards && hasPhoto);
        });

        if (enablePhotoCards) {
          const cleanCategory = (value: string | null | undefined) => (value || '').trim();
          const categoryLowers = new Set(
            feedItems
              .map(item => cleanCategory(item.category).toLowerCase())
              .filter(Boolean)
          );

          const categoryLabelByLower = new Map<string, string>();
          feedItems.forEach(item => {
            const clean = cleanCategory(item.category);
            const lower = clean.toLowerCase();
            if (clean && !categoryLabelByLower.has(lower)) {
              categoryLabelByLower.set(lower, clean);
            }
          });

          const resolveCanonicalLower = (lower: string) => {
            if (!lower) return lower;
            if (lower.endsWith('s')) {
              const singular = lower.slice(0, -1);
              if (categoryLowers.has(singular)) return singular;
              return lower;
            }
            const plural = `${lower}s`;
            if (categoryLowers.has(plural)) return lower;
            return lower;
          };

          feedItems.forEach(item => {
            const clean = cleanCategory(item.category);
            const lower = clean.toLowerCase();
            const canonicalLower = resolveCanonicalLower(lower);
            item.category = categoryLabelByLower.get(canonicalLower) || clean;
          });
        }

        // Sort: videos first, then photo-only items (within existing category/sort_order)
        feedItems.sort((a, b) => {
          const aHasVideo = a.video_url && a.video_url !== '' ? 0 : 1;
          const bHasVideo = b.video_url && b.video_url !== '' ? 0 : 1;
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          if (aHasVideo !== bHasVideo) return aHasVideo - bHasVideo;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });

        // Get unique categories from feed items
        const categories = [...new Set(feedItems.map(item => item.category))].filter(Boolean);

        const partnerRating = partnerData.rating || 4.5;
        const partnerTotalReviews = partnerData.total_reviews || 0;

        setRestaurant({
          id: partnerData.id,
          name: partnerData.restaurant_name || partnerData.email?.split('@')[0] || 'Restaurant',
          slug: partnerData.slug,
          cuisine: partnerData.cuisine || 'Restaurant',
          address: partnerData.address || '',
          rating: partnerRating,
          totalReviews: partnerTotalReviews,
          logoUrl: partnerData.logo_url,
          coverPhotoUrl: partnerData.cover_photo_url,
          googleMapsUrl: partnerData.google_maps_url,
          website: partnerData.website,
          ordering_url: partnerData.ordering_url,
          enable_ordering_button: partnerData.enable_ordering_button,
          openingHours: partnerData.google_opening_hours || [],
          menuItems: feedItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            videoUrl: item.video_url || '',
            photoUrl: item.photo_url || '',
            price: item.price,
            dish_order_url: item.dish_order_url,
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
