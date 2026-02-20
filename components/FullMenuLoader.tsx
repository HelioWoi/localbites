import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import FullMenuPage from '../screens/FullMenuPage';
import { Loader2 } from 'lucide-react';

interface FullMenuLoaderProps {
  slug: string;
}

const FullMenuLoader: React.FC<FullMenuLoaderProps> = ({ slug }) => {
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

        // Fetch ALL menu items (active ones)
        const { data: menuItems, error: menuError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('partner_id', partnerData.id)
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true });

        if (menuError) {
          console.error('Menu error:', menuError);
        }

        // Get unique categories
        const categories = [...new Set((menuItems || []).map(item => item.category))].filter(Boolean);

        setRestaurant({
          id: partnerData.id,
          name: partnerData.restaurant_name || 'Restaurant',
          slug: partnerData.slug,
          cuisine: partnerData.cuisine || 'Restaurant',
          openingHours: partnerData.google_opening_hours || [],
          categories,
          menuItems: (menuItems || []).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            category: item.category,
            price: item.price || 0,
            videoUrl: item.video_url,
            photoUrl: item.photo_url || null,
          })),
        });
        setLoading(false);
      } catch (err) {
        console.error('Load error:', err);
        setError('Failed to load menu');
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [slug]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
        <p className="text-zinc-400 text-sm">Loading menu...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">🍽️</span>
        </div>
        <h1 className="text-zinc-900 text-2xl font-bold mb-2">Menu Not Found</h1>
        <p className="text-zinc-500 mb-8">This restaurant may be invalid or no longer active.</p>
        <a 
          href="/"
          className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl"
        >
          Discover Restaurants
        </a>
      </div>
    );
  }

  return <FullMenuPage restaurant={restaurant} />;
};

export default FullMenuLoader;
