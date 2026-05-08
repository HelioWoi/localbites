import React, { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Bookmark, Share2, Clock, Video, ShoppingBag, Eye, Image as ImageIcon, Play, X, List } from 'lucide-react';
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
  const [showFullMenu, setShowFullMenu] = useState(false);

  // Analytics V2: Track profile view on mount
  useEffect(() => {
    if (restaurant.id) {
      trackAnalyticsEvent({ eventType: 'profile_view', restaurantId: restaurant.id }).catch(() => {});
    }
  }, [restaurant.id]);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [previewDish, setPreviewDish] = useState<any | null>(null);
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

  // Unified media dataset (video + photo items together)
  const mediaDishes = restaurant.dishes?.filter(
    d => (d.videoUrl && d.videoUrl.length > 0) || (d.photoUrl && d.photoUrl.length > 0) || (d.thumbnailUrl && d.thumbnailUrl.length > 0)
  ) || [];

  // Get unique categories from unified media feed
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
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayOpeningHoursRaw = restaurant.openingHours?.find((hourString) => hourString.startsWith(todayDayName));
  const todayOpeningHours = todayOpeningHoursRaw
    ? todayOpeningHoursRaw.replace(/^[A-Za-z]+:\s*/, '')
    : 'Hours unavailable';
  const socialLinks = [
    { label: 'Instagram', url: restaurant.instagramUrl },
    { label: 'Facebook', url: restaurant.facebookUrl },
    { label: 'TikTok', url: restaurant.tiktokUrl },
    { label: 'Website', url: restaurant.website },
  ].filter((link): link is { label: string; url: string } => !!link.url && link.url.trim().length > 0);

  const handleDishCardClick = (dish: any) => {
    setPreviewDish(dish);
    trackAnalyticsEvent({ eventType: 'view', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});
  };

  const handleToggleDishLike = (dishId: string) => {
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (next.has(dishId)) {
        next.delete(dishId);
      } else {
        next.add(dishId);
        trackAnalyticsEvent({ eventType: 'like', restaurantId: restaurant.id, itemId: dishId }).catch(() => {});
      }
      return next;
    });
  };

  const handleToggleDishSave = (dishId: string) => {
    setSavedVideos(prev => {
      const next = new Set(prev);
      if (next.has(dishId)) {
        next.delete(dishId);
      } else {
        next.add(dishId);
        trackAnalyticsEvent({ eventType: 'save', restaurantId: restaurant.id, itemId: dishId }).catch(() => {});
      }
      localStorage.setItem(`saved_dishes_${restaurant.id}`, JSON.stringify([...next]));
      window.dispatchEvent(new Event('savedDishesChanged'));
      return next;
    });
  };

  const handleOpenFullMenu = () => {
    onOpenFullMenu?.();
    setShowFullMenu(true);
  };

  const handleBookTable = () => {
    if (!restaurant.phone) return;
    window.location.href = `tel:${restaurant.phone}`;
  };

  const handleShareDish = (dish: any) => {
    trackAnalyticsEvent({ eventType: 'share', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});
    const restaurantSlug = (restaurant as any).slug as string | undefined;
    const shareUrl = restaurantSlug
      ? `${window.location.origin}/r/${restaurantSlug}/menu?dish=${dish.id}`
      : `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(restaurant.id)}`;

    if (navigator.share) {
      navigator.share({
        title: dish.name,
        text: `Check out ${dish.name} at ${restaurant.name}`,
        url: shareUrl,
      }).catch(() => {});
    }
  };

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
      className="fixed inset-0 z-50 bg-zinc-100/95 flex items-center justify-center p-6"
      onClick={isQRRoute ? undefined : onClose}
    >
      <div 
        className="relative w-full max-w-[1320px] max-h-[94vh] overflow-y-auto rounded-[28px] bg-white border border-zinc-200 shadow-[0_30px_80px_rgba(15,23,42,0.14)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-zinc-100 px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6 min-w-0">
              {!isQRRoute && onClose && (
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full border border-zinc-200 hover:bg-zinc-50 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft size={18} className="text-zinc-700" />
                </button>
              )}
              {restaurantLogoUrl ? (
                <img src={restaurantLogoUrl} alt={restaurant.name} className="h-9 w-auto object-contain" />
              ) : (
                <div className="text-zinc-900 font-bold text-xl tracking-tight">{restaurant.name}</div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700">
                <Clock size={14} className="text-zinc-500" />
                Today: {todayOpeningHours}
              </div>
              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-full border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Share
              </button>
              <button
                onClick={handleBookTable}
                disabled={!restaurant.phone}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold shadow-sm hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Book a Table
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 pt-6 space-y-6">
          {heroDish && (
            <div className="relative overflow-hidden rounded-[26px] border border-zinc-200 bg-zinc-900 min-h-[320px]">
              <div
                onClick={() => handleDishCardClick(heroDish)}
                className="absolute inset-0 cursor-pointer"
              >
                {heroDish.videoUrl ? (
                  <video
                    src={getCDNUrl(heroDish.videoUrl)}
                    className="w-full h-full object-cover"
                    playsInline
                    loop
                    muted
                    autoPlay
                    preload="metadata"
                    onPlay={() => {
                      trackAnalyticsEvent({ eventType: 'play', restaurantId: restaurant.id, itemId: heroDish.id }).catch(() => {});
                    }}
                  />
                ) : (heroDish.photoUrl || heroDish.thumbnailUrl || restaurant.mainPhotoUrl) ? (
                  <img
                    src={heroDish.photoUrl || heroDish.thumbnailUrl || restaurant.mainPhotoUrl}
                    alt={heroDish.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800" />
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />
              <div className="relative z-10 px-8 py-8 h-full flex items-center">
                <div className="max-w-[560px]">
                  <span className="inline-flex px-3 py-1 rounded-full border border-orange-300/40 bg-black/35 text-orange-200 text-xs font-bold tracking-wide uppercase">
                    Weekly Bestseller
                  </span>
                  <h2 className="mt-4 text-5xl font-black text-white leading-tight">{heroDish.name}</h2>
                  {heroDish.description && (
                    <p className="mt-3 text-white/85 text-lg leading-relaxed">{heroDish.description}</p>
                  )}
                  <div className="mt-4 text-sm text-white/80 font-medium">House-made • Fresh Ingredients • Big Flavour</div>
                  <button
                    onClick={() => handleDishCardClick(heroDish)}
                    className="mt-6 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-white font-semibold"
                  >
                    Explore Menu
                  </button>
                </div>
              </div>
            </div>
          )}

          {(hasVideos || hasPhotos) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-black text-zinc-900">Our Menu</h3>
                  <p className="text-sm text-zinc-500 mt-1">Made fresh daily with quality ingredients.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenFullMenu}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-sm font-semibold text-zinc-700"
                  >
                    <List size={15} />
                    View Full Menu
                  </button>
                  {savedCount > 0 && (
                    <button
                      onClick={() => {
                        setShowFullMenu(true);
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('openYourPicks'));
                        }, 100);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-orange-200 bg-orange-50 text-sm font-semibold text-orange-600"
                    >
                      <Bookmark size={15} className="fill-orange-500" />
                      Your Picks ({savedCount})
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {mediaCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredDishes.map((dish) => {
                  const mediaSrc = dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl;

                  return (
                    <article
                      key={dish.id}
                      className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-[0_6px_20px_rgba(15,23,42,0.06)]"
                    >
                      <button
                        onClick={() => handleDishCardClick(dish)}
                        className="relative h-48 w-full bg-zinc-100 text-left"
                      >
                        {dish.videoUrl ? (
                          <video
                            src={getCDNUrl(dish.videoUrl)}
                            className="w-full h-full object-cover"
                            playsInline
                            loop
                            muted
                            preload="metadata"
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
                          <img src={mediaSrc} alt={dish.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={26} className="text-zinc-400" />
                          </div>
                        )}

                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/45 text-white px-2 py-1 rounded-full text-[11px] font-semibold">
                          <Eye size={11} />
                          {viewCounts.get(dish.id) || 0}
                        </div>
                        {dish.videoUrl && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                              <Play size={18} className="fill-zinc-900 text-zinc-900 ml-0.5" />
                            </div>
                          </div>
                        )}
                      </button>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-zinc-900 leading-tight line-clamp-1">{dish.name}</h4>
                          {dish.price && <span className="text-orange-500 font-black">${dish.price}</span>}
                        </div>
                        {dish.description && (
                          <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{dish.description}</p>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[11px] text-emerald-600 font-semibold">Vegetarian</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDishLike(dish.id);
                              }}
                              className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50"
                            >
                              <Heart size={14} className={likedVideos.has(dish.id) ? 'text-red-500 fill-red-500' : 'text-zinc-500'} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDishSave(dish.id);
                              }}
                              className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50"
                            >
                              <Bookmark size={14} className={savedVideos.has(dish.id) ? 'text-orange-500 fill-orange-500' : 'text-zinc-500'} />
                            </button>
                            {(dish.dish_order_url || restaurant.ordering_url) && restaurant.enable_ordering_button && (
                              <button
                                onClick={(e) => handleOrderNow(dish, e)}
                                className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600"
                              >
                                <ShoppingBag size={14} className="text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <footer className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50/60 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Address</p>
                <p className="text-sm text-zinc-700 mt-1">{restaurant.address || 'Address unavailable'}</p>
              </div>
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:border-orange-300 hover:text-orange-600 transition-colors"
                    >
                      {social.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </footer>
        </div>

        {previewDish && (
          <div
            className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setPreviewDish(null)}
          >
            <div
              className="w-full max-w-5xl rounded-3xl bg-white overflow-hidden border border-zinc-200 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <h4 className="font-bold text-zinc-900 truncate">{previewDish.name}</h4>
                <button
                  onClick={() => setPreviewDish(null)}
                  className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center"
                >
                  <X size={18} className="text-zinc-700" />
                </button>
              </div>

              <div className="grid md:grid-cols-[1.4fr_1fr]">
                <div className="bg-zinc-950 min-h-[360px] flex items-center justify-center">
                  {previewDish.videoUrl ? (
                    <video
                      src={getCDNUrl(previewDish.videoUrl)}
                      className="w-full h-full max-h-[68vh] object-contain"
                      controls
                      autoPlay
                      playsInline
                      onPlay={() => {
                        trackAnalyticsEvent({ eventType: 'play', restaurantId: restaurant.id, itemId: previewDish.id }).catch(() => {});
                      }}
                    />
                  ) : (previewDish.photoUrl || previewDish.thumbnailUrl || restaurant.mainPhotoUrl) ? (
                    <img
                      src={previewDish.photoUrl || previewDish.thumbnailUrl || restaurant.mainPhotoUrl}
                      alt={previewDish.name}
                      className="w-full h-full max-h-[68vh] object-contain"
                    />
                  ) : (
                    <div className="text-zinc-500 flex items-center gap-2">
                      <ImageIcon size={20} />
                      No media
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-zinc-500">{previewDish.category || 'Menu Item'}</p>
                    <h5 className="text-2xl font-black text-zinc-900 mt-1">{previewDish.name}</h5>
                    {previewDish.price && <p className="text-xl font-black text-orange-500 mt-1">${previewDish.price}</p>}
                  </div>

                  {previewDish.description && (
                    <p className="text-sm text-zinc-600 leading-relaxed">{previewDish.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleToggleDishLike(previewDish.id)}
                      className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 inline-flex items-center gap-2"
                    >
                      <Heart size={15} className={likedVideos.has(previewDish.id) ? 'text-red-500 fill-red-500' : 'text-zinc-500'} />
                      Like
                    </button>
                    <button
                      onClick={() => handleToggleDishSave(previewDish.id)}
                      className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 inline-flex items-center gap-2"
                    >
                      <Bookmark size={15} className={savedVideos.has(previewDish.id) ? 'text-orange-500 fill-orange-500' : 'text-zinc-500'} />
                      Save
                    </button>
                    <button
                      onClick={() => handleShareDish(previewDish)}
                      className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 inline-flex items-center gap-2"
                    >
                      <Share2 size={15} className="text-zinc-500" />
                      Share
                    </button>
                    {previewDish.videoUrl && onSelectVideo && (
                      <button
                        onClick={() => onSelectVideo(previewDish.id)}
                        className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 inline-flex items-center gap-2"
                      >
                        <Video size={15} className="text-zinc-500" />
                        Open Feed
                      </button>
                    )}
                    {restaurant.enable_ordering_button && (previewDish.dish_order_url || restaurant.ordering_url) && (
                      <button
                        onClick={(e) => handleOrderNow(previewDish, e)}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-semibold text-white inline-flex items-center gap-2"
                      >
                        <ShoppingBag size={15} />
                        Order Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
            const selectedDish = restaurant.dishes.find((dish) => dish.id === itemId);
            if (!selectedDish) return;
            setPreviewDish(selectedDish);
            trackAnalyticsEvent({ eventType: 'view', restaurantId: restaurant.id, itemId }).catch(() => {});
          }}
          isQRRoute={isQRRoute}
        />
      )}
    </div>
  );
};

export default DesktopRestaurantProfile;
