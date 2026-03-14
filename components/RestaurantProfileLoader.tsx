import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { textSearchRestaurants } from '../services/googlePlacesProxy';
import RestaurantProfile from '../screens/RestaurantProfile';
import DesktopRestaurantProfile from './DesktopRestaurantProfile';
import { Loader2 } from 'lucide-react';

interface RestaurantProfileLoaderProps {
  slug: string;
  isAppFeed?: boolean;
}

const RestaurantProfileLoader: React.FC<RestaurantProfileLoaderProps> = ({ slug, isAppFeed = false }) => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const isQRRoute = window.location.pathname.startsWith('/r/');

  // Desktop detection
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

        console.log('[RestaurantProfileLoader] Partner data:', partnerData);
        console.log('[RestaurantProfileLoader] Photo URL:', partnerData.photo_url);
        console.log('[RestaurantProfileLoader] Banner images:', partnerData.banner_images);

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

        // Get unique categories
        const categories = [...new Set((menuItems || []).map(item => item.category))].filter(Boolean);

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
            console.error('[ProfileLoader] Google rating fetch error:', e);
          }
        }

        const restaurantData = {
          id: partnerData.id,
          name: partnerData.restaurant_name || partnerData.email?.split('@')[0] || 'Restaurant',
          slug: partnerData.slug,
          cuisine: partnerData.cuisine || 'Restaurant',
          address: partnerData.address || '',
          rating: googleRating,
          totalReviews: googleTotalReviews,
          logoUrl: partnerData.logo_url,
          coverPhotoUrl: partnerData.photo_url || null,
          mainPhotoUrl: partnerData.photo_url || null,
          googleMapsUrl: partnerData.google_maps_url,
          website: partnerData.website,
          phone: partnerData.phone,
          ordering_url: partnerData.ordering_url,
          enable_ordering_button: partnerData.enable_ordering_button,
          distance: '0 km',
          priceLevel: '$$',
          isOpen: true,
          isSubscribed: true,
          banner_images: partnerData.banner_images || [],
          dishes: (menuItems || []).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            videoUrl: item.video_url,
            photoUrl: item.photo_url,
            thumbnailUrl: item.video_url || item.photo_url,
            price: item.price,
            isFeatured: item.is_featured || false,
            dish_order_url: item.dish_order_url,
          })),
          menuItems: (menuItems || []).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            videoUrl: item.video_url,
            photoUrl: item.photo_url,
            price: item.price,
            dish_order_url: item.dish_order_url,
          })),
          categories,
          reviews: [],
          reviewSnippets: [],
          openingHours: partnerData.google_opening_hours || [],
        };

        // Update Open Graph meta tags for sharing
        const restaurantName = restaurantData.name;
        // Use banner photo first (photo_url), then logo, then fallback
        const restaurantImage = partnerData.photo_url || partnerData.logo_url || 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img-site.jpg';
        // Restaurant-focused description
        const restaurantDescription = `${restaurantData.cuisine}${restaurantData.address ? ` in ${restaurantData.address}` : ''} • Explore our video menu with delicious dishes`;
        const restaurantTitle = `${restaurantName} - ${restaurantData.cuisine}`;
        
        // Update or create meta tags
        const updateMetaTag = (property: string, content: string) => {
          let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', content);
        };

        const updateMetaName = (name: string, content: string) => {
          let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', name);
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', content);
        };

        // Update Open Graph tags
        updateMetaTag('og:title', restaurantTitle);
        updateMetaTag('og:description', restaurantDescription);
        updateMetaTag('og:image', restaurantImage);
        updateMetaTag('og:url', window.location.href);
        updateMetaTag('og:type', 'restaurant');
        
        // Update Twitter Card tags
        updateMetaName('twitter:card', 'summary_large_image');
        updateMetaName('twitter:title', restaurantTitle);
        updateMetaName('twitter:description', restaurantDescription);
        updateMetaName('twitter:image', restaurantImage);
        
        // Update page title
        document.title = restaurantTitle;

        setRestaurant(restaurantData);
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
        <p className="text-white/60 text-sm">Loading restaurant...</p>
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
        <p className="text-white/60 mb-8">This restaurant may be invalid or no longer active.</p>
        <a 
          href="/"
          className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl"
        >
          Discover Restaurants
        </a>
      </div>
    );
  }

  // Render desktop or mobile version based on screen size
  if (isDesktop) {
    return (
      <DesktopRestaurantProfile 
        restaurant={restaurant}
        onClose={() => window.location.href = '/'}
        isSaved={false}
        onToggleSave={() => {}}
        isQRRoute={isQRRoute}
      />
    );
  }

  return (
    <RestaurantProfile 
      restaurant={restaurant} 
      onBack={() => window.location.href = '/'} 
      isSaved={false}
      onToggleSave={() => {}}
      openReviews={false}
      onNavigateToPartner={() => {}}
      isStandalone={isQRRoute}
    />
  );
};

export default RestaurantProfileLoader;
