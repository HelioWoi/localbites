import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { textSearchRestaurants } from '../services/googlePlacesProxy';
import RestaurantProfile from '../screens/RestaurantProfile';
import RestaurantMenuPage from '../screens/RestaurantMenuPage';
import DesktopRestaurantProfile from './DesktopRestaurantProfile';
import { Loader2 } from 'lucide-react';

interface DemoRestaurantLoaderProps {
  slug: string;
}

const DemoRestaurantLoader: React.FC<DemoRestaurantLoaderProps> = ({ slug }) => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const isMenuRoute = window.location.pathname.includes('/menu');

  // Desktop detection
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // Mark that user is in demo mode for CTA button in sub-routes
    sessionStorage.setItem('isDemoMode', 'true');
    
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

        // Filter items with video first
        const itemsWithVideo = (menuItems || []).filter(item => item.video_url);
        
        // Get unique categories from items that have videos only
        const categories = [...new Set(itemsWithVideo.map(item => item.category))].filter(Boolean);

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
            console.error('[DemoLoader] Google rating fetch error:', e);
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
          dishes: itemsWithVideo.map(item => ({
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
          menuItems: itemsWithVideo.map(item => ({
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
        <p className="text-white/60 text-sm">Loading demo...</p>
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
        <p className="text-white/60 mb-8">This demo may be invalid or no longer active.</p>
        <a 
          href="/"
          className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl"
        >
          Back to Home
        </a>
      </div>
    );
  }

  // If menu route on MOBILE, render RestaurantMenuPage (fullscreen)
  // On DESKTOP, keep the modal open (don't switch to fullscreen)
  if (isMenuRoute && !isDesktop) {
    return <RestaurantMenuPage restaurant={restaurant} />;
  }

  // Render desktop or mobile version - ALWAYS show back button for demo
  if (isDesktop) {
    return (
      <DesktopRestaurantProfile 
        restaurant={restaurant}
        onClose={() => window.location.href = '/'}
        isSaved={false}
        onToggleSave={() => {}}
        isQRRoute={false}
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
      isStandalone={true}
    />
  );
};

export default DemoRestaurantLoader;
