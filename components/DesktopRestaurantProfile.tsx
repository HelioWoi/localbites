import React, { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Bookmark, Share2, Phone, MapPin, Star, Clock, Video, ChevronRight, Instagram, Facebook, Globe, ShoppingBag, Eye, Image as ImageIcon, Play } from 'lucide-react';
import { Restaurant } from '../types';
import FullMenuModal from './FullMenuModal';
import { trackEvent } from '../services/eventsService';
import { trackAnalyticsEvent } from '../services/analyticsV2Service';
import { getMenuItemViewCounts } from '../services/partnerAnalyticsService';
import { getCDNUrl } from '../utils/cdnHelper';
import { orderCategoriesAlcoholLast } from '../utils/categoryOrder';

interface DesktopRestaurantProfileProps {
  restaurant: Restaurant;
  isSaved: boolean;
  isLiked?: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  onToggleLike?: () => void;
  onOpenFullMenu?: () => void;
  onSelectVideo?: (videoId: string) => void;
  isQRRoute?: boolean;
}

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Desserts'];

const DesktopRestaurantProfile: React.FC<DesktopRestaurantProfileProps> = ({
  restaurant,
  isSaved,
  isLiked = false,
  onClose,
  onToggleSave,
  onToggleLike,
  onOpenFullMenu,
  onSelectVideo,
  isQRRoute = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mediaView, setMediaView] = useState<'video' | 'photo'>('video');
  const [showFullMenu, setShowFullMenu] = useState(false);

  // Analytics V2: Track profile view on mount
  useEffect(() => {
    if (restaurant.id) {
      trackAnalyticsEvent({ eventType: 'profile_view', restaurantId: restaurant.id }).catch(() => {});
    }
  }, [restaurant.id]);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [savedVideos, setSavedVideos] = useState<Set<string>>(() => {
    // Load saved dishes from localStorage (synced with FullMenuModal)
    const saved = localStorage.getItem(`saved_dishes_${restaurant.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [viewCounts, setViewCounts] = useState<Map<string, number>>(new Map());

  // Load view counts on mount
  useEffect(() => {
    const loadViewCounts = async () => {
      try {
        const itemIds = restaurant.dishes.map(dish => dish.id);
        const counts = await getMenuItemViewCounts(itemIds);
        
        // If no real data, add mock data for visual testing
        if (counts.size === 0) {
          const mockCounts = new Map<string, number>();
          restaurant.dishes.forEach((dish) => {
            mockCounts.set(dish.id, Math.floor(Math.random() * 450) + 50);
          });
          setViewCounts(mockCounts);
        } else {
          setViewCounts(counts);
        }
      } catch (error) {
        console.error('Failed to load view counts:', error);
        const mockCounts = new Map<string, number>();
        restaurant.dishes.forEach((dish) => {
          mockCounts.set(dish.id, Math.floor(Math.random() * 450) + 50);
        });
        setViewCounts(mockCounts);
      }
    };
    loadViewCounts();
  }, [restaurant.id, restaurant.dishes]);

  // Handle Order Now
  const handleOrderNow = (dish: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const orderUrl = dish.dish_order_url || restaurant.ordering_url;
    if (!orderUrl) return;

    trackEvent({
      restaurantId: restaurant.id,
      eventType: 'order_button_click',
      eventValue: dish.id,
    });
    // Analytics V2: Track order click
    trackAnalyticsEvent({ eventType: 'order_click', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});

    window.location.href = orderUrl;
  };

  // Sync with localStorage changes (when FullMenuModal saves/removes dishes)
  React.useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(`saved_dishes_${restaurant.id}`);
      if (saved) {
        setSavedVideos(new Set(JSON.parse(saved)));
      } else {
        setSavedVideos(new Set());
      }
    };

    // Listen for custom event from FullMenuModal
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('savedDishesChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('savedDishesChanged', handleStorageChange);
    };
  }, [restaurant.id]);

  const hasVideos = (restaurant.dishes?.filter(d => d.videoUrl && d.videoUrl.length > 0) || []).length > 0;
  const hasPhotos = (restaurant.dishes?.filter(d => (d.photoUrl && d.photoUrl.length > 0) || (d.thumbnailUrl && d.thumbnailUrl.length > 0)) || []).length > 0;

  // Media datasets
  const videoDishes = restaurant.dishes?.filter(d => d.videoUrl && d.videoUrl.length > 0) || [];
  const photoDishes = restaurant.dishes?.filter(d => (d.photoUrl && d.photoUrl.length > 0) || (d.thumbnailUrl && d.thumbnailUrl.length > 0)) || [];
  const mediaDishes = mediaView === 'video' ? videoDishes : photoDishes;

  // Get unique categories from currently selected media type
  const mediaCategories = ['All', ...orderCategoriesAlcoholLast([...new Set(mediaDishes.map(d => d.category).filter(Boolean))] as string[])];

  const mediaCategoryOrder = new Map(
    orderCategoriesAlcoholLast([...new Set(mediaDishes.map(d => d.category).filter(Boolean))] as string[])
      .map((category, index) => [category, index])
  );

  const orderedMediaDishes = [...mediaDishes].sort((a, b) => {
    const aOrder = mediaCategoryOrder.get(a.category || '') ?? Number.MAX_SAFE_INTEGER;
    const bOrder = mediaCategoryOrder.get(b.category || '') ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });

  // Filter dishes by category
  const categoryFiltered = selectedCategory === 'All' 
    ? orderedMediaDishes
    : mediaDishes.filter(d => d.category === selectedCategory);

  const filteredDishes = categoryFiltered;

  // Top 3 featured dishes (prioritize featured, then fill remaining slots)
  const featuredSource = orderedMediaDishes.filter(d => d.isFeatured);
  const nonFeaturedSource = orderedMediaDishes.filter(d => !d.isFeatured);
  const featuredDishes = [...featuredSource, ...nonFeaturedSource].slice(0, 3);
  const heroDish = featuredDishes[0] || filteredDishes[0] || mediaDishes[0] || null;
  const restaurantLogoUrl = (restaurant as any).logoUrl as string | undefined;
  const allowDishNavigation = mediaView !== 'video';

  const handleDishCardClick = (dish: any) => {
    if (mediaView === 'photo') {
      setSelectedDishId(dish.id);
      setShowFullMenu(true);
      trackAnalyticsEvent({ eventType: 'view', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});
      return;
    }

    if (onSelectVideo) {
      onSelectVideo(dish.id);
      return;
    }

    const restaurantSlug = (restaurant as any).slug as string | undefined;
    if (restaurantSlug) {
      const pathname = window.location.pathname;
      const isDemoPath = pathname.startsWith('/demo/');
      const isQRPath = pathname.startsWith('/r/');
      const prefix = isDemoPath ? '/demo/' : isQRPath ? '/r/' : '/';

      const params = new URLSearchParams();
      params.set('dish', dish.id);
      if (dish.category) params.set('category', dish.category);
      params.set('from', 'desktop-profile');

      window.location.href = `${prefix}${restaurantSlug}/menu?${params.toString()}`;
      return;
    }

    // Fallback to previous modal flow if slug is unavailable
    setSelectedDishId(dish.id);
    setShowFullMenu(true);
    trackAnalyticsEvent({ eventType: 'view', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});
    if (mediaView === 'video' && dish.videoUrl) {
      trackAnalyticsEvent({ eventType: 'play', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});
    }
  };

  useEffect(() => {
    // Keep the selected mode valid when a restaurant only has one media type
    if (mediaView === 'video' && !hasVideos && hasPhotos) {
      setMediaView('photo');
      setSelectedCategory('All');
    }
    if (mediaView === 'photo' && !hasPhotos && hasVideos) {
      setMediaView('video');
      setSelectedCategory('All');
    }
  }, [mediaView, hasVideos, hasPhotos]);

  // Get saved videos count
  const savedCount = savedVideos.size;

  const handleShare = () => {
    // Analytics V2: Track share
    trackAnalyticsEvent({ eventType: 'share', restaurantId: restaurant.id }).catch(() => {});
    
    // Create shareable URL with restaurant ID
    const shareUrl = `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(restaurant.id)}`;
    
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Check out ${restaurant.name} on MenuLove!`,
        url: shareUrl,
      }).catch(() => {});
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={isQRRoute ? undefined : onClose}
    >
      <div 
        className="relative rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[0_24px_90px_rgba(0,0,0,0.22)] bg-white border border-zinc-100 ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_92%_2%,rgba(251,146,60,0.16),transparent_62%),radial-gradient(40%_30%_at_12%_88%,rgba(255,190,110,0.08),transparent_68%)]" />
        {/* Top area (dish-focused, desktop) */}
        <div className="relative px-6 pt-6 pb-2">
          <div className="grid grid-cols-[120px_1fr_120px] items-center mb-4">
            {!isQRRoute && onClose ? (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={20} className="text-zinc-700" />
              </button>
            ) : <div className="w-8 h-8" />}
            <h1 className="text-xl font-black text-center truncate px-3 bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent">
              {restaurant.name}
            </h1>
            <button
              onClick={handleShare}
              className="justify-self-end px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold flex items-center gap-2 shadow-md shadow-orange-200/70 hover:brightness-105 transition-all"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>

          {heroDish && (
            <div className="grid grid-cols-2 gap-6 items-stretch mb-4 rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_12px_40px_rgba(251,146,60,0.10)]">
              <div
                onClick={allowDishNavigation ? () => handleDishCardClick(heroDish) : undefined}
                className={`relative rounded-2xl overflow-hidden bg-zinc-100 aspect-square group border border-white/60 shadow-lg ${allowDishNavigation ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {mediaView === 'video' && heroDish.videoUrl ? (
                  <video
                    src={getCDNUrl(heroDish.videoUrl)}
                    className="w-full h-full object-cover bg-zinc-900"
                    playsInline
                    loop
                    preload="metadata"
                    poster={heroDish.thumbnailUrl || heroDish.photoUrl || restaurant.mainPhotoUrl}
                    onLoadedData={(e) => {
                      e.currentTarget.currentTime = 0.1;
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.currentTime = 0;
                      e.currentTarget.play().catch(() => {});
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0.1;
                    }}
                  />
                ) : (heroDish.photoUrl || heroDish.thumbnailUrl || restaurant.mainPhotoUrl) ? (
                  <img
                    src={heroDish.photoUrl || heroDish.thumbnailUrl || restaurant.mainPhotoUrl}
                    alt={heroDish.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-200" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/55 text-white text-xs font-bold">Bestseller</div>
                {mediaView === 'video' && heroDish.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play size={24} className="text-zinc-900 fill-zinc-900 ml-0.5" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center rounded-2xl px-5 py-4 bg-gradient-to-br from-white via-orange-50/40 to-white border border-orange-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {restaurantLogoUrl ? (
                  <img src={restaurantLogoUrl} alt={restaurant.name} className="h-12 w-auto object-contain mb-4" />
                ) : (
                  <h2 className="text-2xl font-bold text-zinc-900 mb-4">{restaurant.name}</h2>
                )}
                <h3 className="text-4xl font-black leading-tight bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-transparent">{heroDish.name}</h3>
                {heroDish.price && <p className="text-3xl font-black text-orange-500 mt-2">${heroDish.price}</p>}
                {heroDish.description && (
                  <p className="text-zinc-600 mt-4 text-lg leading-relaxed max-w-[36ch]">{heroDish.description}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-px mx-6 bg-gradient-to-r from-transparent via-orange-100 to-transparent" />

        {/* Media Menu Section (desktop only) */}
        {(hasVideos || hasPhotos) && (
          <div className="mx-6 mb-6 rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/25 px-5 py-5 shadow-[0_10px_30px_rgba(251,146,60,0.08)]">
            <div className="flex items-center gap-2 mb-4">
              {mediaView === 'video' ? (
                <Video size={18} className="text-orange-500" />
              ) : (
                <ImageIcon size={18} className="text-orange-500" />
              )}
              <h3 className="text-lg font-bold text-zinc-900">{mediaView === 'video' ? 'Video Menus' : 'Photo Menus'}</h3>
            </div>

            {/* View by toggle */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-zinc-500">View by</span>
              <div className="inline-flex bg-white rounded-xl p-1 border border-orange-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
                <button
                  onClick={() => {
                    setMediaView('video');
                    setSelectedCategory('All');
                  }}
                  disabled={!hasVideos}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    mediaView === 'video' ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm shadow-orange-200/70' : 'text-zinc-600 hover:bg-zinc-200'
                  } ${!hasVideos ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Video
                </button>
                <button
                  onClick={() => {
                    setMediaView('photo');
                    setSelectedCategory('All');
                  }}
                  disabled={!hasPhotos}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    mediaView === 'photo' ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm shadow-orange-200/70' : 'text-zinc-600 hover:bg-zinc-200'
                  } ${!hasPhotos ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Photo
                </button>
              </div>
            </div>

            {/* Featured top 3 */}
            {featuredDishes.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {featuredDishes.map((dish) => {
                  const mediaSrc = mediaView === 'video'
                    ? (dish.videoUrl ? getCDNUrl(dish.videoUrl) : undefined)
                    : (dish.photoUrl || dish.thumbnailUrl);

                  return (
                    <div
                      key={`featured-${dish.id}`}
                      onClick={allowDishNavigation ? () => handleDishCardClick(dish) : undefined}
                      className={`relative aspect-[16/10] rounded-2xl overflow-hidden group ${allowDishNavigation ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {mediaView === 'video' && dish.videoUrl ? (
                        <video
                          src={getCDNUrl(dish.videoUrl)}
                          className="w-full h-full object-cover bg-zinc-900"
                          playsInline
                          loop
                          preload="metadata"
                          onLoadedData={(e) => {
                            e.currentTarget.currentTime = 0.1;
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.currentTime = 0;
                            e.currentTarget.play().catch(() => {});
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0.1;
                          }}
                        />
                      ) : mediaSrc ? (
                        <img
                          src={mediaSrc}
                          alt={dish.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-200" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                      {dish.isFeatured && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/55 text-white text-[10px] font-bold">Bestseller</div>
                      )}
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-sm font-bold line-clamp-1">{dish.name}</p>
                        {dish.price && <p className="text-orange-300 text-sm font-semibold mt-0.5">${dish.price}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Category Filters + Full Menu + Your Picks */}
            <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {mediaCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm shadow-orange-200/70'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={() => setShowFullMenu(true)}
                className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-gradient-to-r from-orange-500 to-amber-400 text-white transition-all flex items-center gap-1 shadow-sm shadow-orange-200/70 hover:brightness-105"
              >
                Full Menu
                <ChevronRight size={14} />
              </button>

              {/* Your Picks Button - Opens Full Menu with saved filter */}
              {savedCount > 0 && (
                <button
                  onClick={() => {
                    setShowFullMenu(true);
                    // Signal to FullMenuModal to show saved only
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('openYourPicks'));
                    }, 100);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-zinc-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all whitespace-nowrap flex-shrink-0"
                >
                  <Bookmark size={16} className="text-orange-500 fill-orange-500" />
                  <span className="font-bold text-sm text-zinc-900">
                    Your Picks
                  </span>
                  <span className="text-sm text-orange-500">({savedCount})</span>
                </button>
              )}
            </div>

            {/* Video Grid - Scrollable */}
            <div className="max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-4 gap-4">
                {filteredDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden group"
                >
                  {/* Video */}
                  <div 
                    onClick={allowDishNavigation ? () => handleDishCardClick(dish) : undefined}
                    className={`w-full h-full ${allowDishNavigation ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {mediaView === 'video' && dish.videoUrl ? (
                      <video
                        src={getCDNUrl(dish.videoUrl)}
                        className="w-full h-full object-cover bg-zinc-900"
                        playsInline
                        loop
                        preload="metadata"
                        onLoadedData={(e) => {
                          e.currentTarget.currentTime = 0.1;
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.currentTime = 0;
                          e.currentTarget.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0.1;
                        }}
                      />
                    ) : (dish.photoUrl || dish.thumbnailUrl) ? (
                      <img
                        src={dish.photoUrl || dish.thumbnailUrl}
                        alt={dish.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
                        {mediaView === 'video' ? <Video size={24} className="text-zinc-400" /> : <ImageIcon size={24} className="text-zinc-400" />}
                      </div>
                    )}
                  </div>

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  
                  {/* View counter - top left */}
                  {viewCounts.get(dish.id) !== undefined && viewCounts.get(dish.id)! > 0 && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full z-10">
                      <Eye size={11} className="text-white/80" />
                      <span className="text-white/80 text-[10px] font-medium">{viewCounts.get(dish.id)}</span>
                    </div>
                  )}
                  
                  {/* Dish info */}
                  <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                    <p className="text-white text-sm font-bold line-clamp-2">
                      {dish.name.length > 40 ? `${dish.name.substring(0, 40)}...` : dish.name}
                    </p>
                    {dish.price && (
                      <p className="text-white text-xs mt-1 font-semibold">${dish.price}</p>
                    )}
                  </div>

                  {/* Action buttons - Mobile style */}
                  <div className="absolute right-3 bottom-20 flex flex-col gap-3">
                    {/* Like button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLikedVideos(prev => {
                          const next = new Set(prev);
                          if (next.has(dish.id)) {
                            next.delete(dish.id);
                          } else {
                            next.add(dish.id);
                            // Analytics V2: Track like
                            trackAnalyticsEvent({ eventType: 'like', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});
                          }
                          return next;
                        });
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-800/30 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/30 transition-colors">
                        <Heart 
                          size={16} 
                          className={likedVideos.has(dish.id) ? 'text-red-500 fill-red-500' : 'text-white'}
                        />
                      </div>
                    </button>

                    {/* Save button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSavedVideos(prev => {
                          const next = new Set(prev);
                          if (next.has(dish.id)) {
                            next.delete(dish.id);
                          } else {
                            next.add(dish.id);
                            // Analytics V2: Track save
                            trackAnalyticsEvent({ eventType: 'save', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});
                          }
                          // Sync with localStorage (shared with FullMenuModal)
                          localStorage.setItem(`saved_dishes_${restaurant.id}`, JSON.stringify([...next]));
                          
                          // Dispatch custom event to sync with FullMenuModal
                          window.dispatchEvent(new Event('savedDishesChanged'));
                          
                          return next;
                        });
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-800/30 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/30 transition-colors">
                        <Bookmark 
                          size={16} 
                          className={savedVideos.has(dish.id) ? 'text-orange-500 fill-orange-500' : 'text-white'}
                        />
                      </div>
                    </button>

                    {/* Order Now button */}
                    {restaurant.enable_ordering_button && (dish.dish_order_url || restaurant.ordering_url) && (
                      <button
                        onClick={(e) => handleOrderNow(dish, e)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors">
                          <ShoppingBag size={16} className="text-white" />
                        </div>
                      </button>
                    )}

                    {/* Share button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-800/30 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/30 transition-colors">
                        <Share2 size={16} className="text-white" />
                      </div>
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        {/* No footer disclaimer for partners */}
      </div>

      {/* Full Menu Modal */}
      {showFullMenu && (
        <FullMenuModal
          restaurant={restaurant}
          isSaved={isSaved}
          selectedDishId={selectedDishId}
          onClose={() => {
            setShowFullMenu(false);
            setSelectedDishId(null);
          }}
          onToggleSave={onToggleSave}
          onSelectItem={(itemId) => {
            setShowFullMenu(false);
            setSelectedDishId(null);
            onSelectVideo?.(itemId);
          }}
          isQRRoute={isQRRoute}
        />
      )}
    </div>
  );
};

export default DesktopRestaurantProfile;
