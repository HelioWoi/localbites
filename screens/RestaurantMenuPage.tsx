import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, ChevronUp, Star, MapPin, Globe, Navigation, Heart, Bookmark, X, ChevronLeft, MessageSquare, Home, Search, Sparkles, Filter, Clock, Send, Video, UtensilsCrossed, ShoppingBag, Eye } from 'lucide-react';
import { trackEvent } from '../services/eventsService';
import { trackAnalyticsEvent } from '../services/analyticsV2Service';
import { getMenuItemViewCounts } from '../services/partnerAnalyticsService';
import { getCDNUrl } from '../utils/cdnHelper';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  videoUrl: string;
  price?: number;
  dish_order_url?: string;
}

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  address: string;
  rating: number;
  totalReviews: number;
  logoUrl?: string;
  coverPhotoUrl?: string;
  googleMapsUrl?: string;
  website?: string;
  ordering_url?: string;
  enable_ordering_button?: boolean;
  menuItems: MenuItem[];
  categories: string[];
}

interface RestaurantMenuPageProps {
  restaurant: RestaurantData;
}

const RestaurantMenuPage: React.FC<RestaurantMenuPageProps> = ({ restaurant }) => {
  const isQRRoute = window.location.pathname.startsWith('/r/');
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted, user clicks to unmute
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSavedOnly, setShowSavedOnly] = useState(false); // Filter for saved videos
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState<Set<number>>(new Set());
  const isInitialMount = useRef(true); // Track which videos are ready to play
  
  // Likes and saves state
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [likesCounts, setLikesCounts] = useState<Map<string, number>>(new Map());
  const [viewCounts, setViewCounts] = useState<Map<string, number>>(new Map());
  const [videoErrors, setVideoErrors] = useState<Set<number>>(new Set());
  const [videoTimedOut, setVideoTimedOut] = useState<Set<number>>(new Set());
  
  // Analytics V2: Track QR scan on mount only if ?qr=1 param present (real QR code scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ((params.get('qr') === '1' || params.get('source') === 'qr') && restaurant.id) {
      trackAnalyticsEvent({ eventType: 'qr_scan', restaurantId: restaurant.id }).catch(() => {});
    }
  }, [restaurant.id]);

  // Load saved items from localStorage and check URL params
  useEffect(() => {
    const saved = localStorage.getItem(`saved_dishes_${restaurant.id}`);
    if (saved) {
      setSavedItems(new Set(JSON.parse(saved)));
    }
    
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if URL has ?saved=true parameter
    if (urlParams.get('saved') === 'true') {
      setShowSavedOnly(true);
    }
    
    // Check if URL has ?dish=id parameter to open specific video
    const dishId = urlParams.get('dish');
    let categoryParam = urlParams.get('category');
    
    // If we have dishId but no category, find the dish's category automatically
    if (dishId && !categoryParam) {
      const dish = restaurant.menuItems.find(item => item.id === dishId);
      if (dish && dish.category) {
        categoryParam = dish.category;
        setActiveCategory(categoryParam);
      }
    } else if (categoryParam) {
      // If category is provided in URL, use it
      setActiveCategory(categoryParam);
    }
    
    if (dishId) {
      // If category filter is active, find index in filtered list
      const itemsList = categoryParam 
        ? restaurant.menuItems.filter(item => item.category === categoryParam)
        : restaurant.menuItems;
      
      const dishIndex = itemsList.findIndex(item => item.id === dishId);
      if (dishIndex !== -1) {
        setActiveVideoIndex(dishIndex);
        // Scroll to the video
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTo({ 
              top: dishIndex * window.innerHeight, 
              behavior: 'smooth' 
            });
          }
        }, 100);
      }
    }
  }, [restaurant.id, restaurant.menuItems]);
  
  // Lazy load analytics data AFTER first video is ready (non-blocking)
  useEffect(() => {
    // Wait for first video to be ready before loading analytics
    const timer = setTimeout(() => {
      // Load likes counts from Supabase
      const loadLikesCounts = async () => {
        try {
          const { getAllLikesCounts } = await import('../services/interactionService');
          const itemIds = restaurant.menuItems.map(item => item.id);
          const counts = await getAllLikesCounts(itemIds);
          setLikesCounts(counts);
        } catch (error) {
          console.error('Failed to load likes counts:', error);
        }
      };
      
      // Load view counts from analytics
      const loadViewCounts = async () => {
        try {
          const itemIds = restaurant.menuItems.map(item => item.id);
          const counts = await getMenuItemViewCounts(itemIds);
          setViewCounts(counts);
        } catch (error) {
          console.error('Failed to load view counts:', error);
        }
      };
      
      // Load both in parallel (non-blocking)
      Promise.all([loadLikesCounts(), loadViewCounts()]);
    }, 500); // Wait 500ms after mount to let video load first
    
    return () => clearTimeout(timer);
  }, [restaurant.id, restaurant.menuItems]);
  
  // Order Now - redirect to ordering system
  const handleOrderNow = (item: MenuItem) => {
    const orderUrl = item.dish_order_url || restaurant.ordering_url;
    if (!orderUrl) return;

    // Track order button click
    trackEvent({
      restaurantId: restaurant.id,
      eventType: 'order_button_click',
      itemId: item.id,
      itemType: item.category,
    });
    // Analytics V2: Track order click
    trackAnalyticsEvent({ eventType: 'order_click', restaurantId: restaurant.id, itemId: item.id }).catch(() => {});

    // Open ordering URL in same page
    window.location.href = orderUrl;
  };

  // Share dish
  const shareDish = async (item: MenuItem) => {
    // Analytics V2: Track share
    trackAnalyticsEvent({ eventType: 'share', restaurantId: restaurant.id, itemId: item.id }).catch(() => {});
    
    const shareUrl = `${window.location.origin}/r/${restaurant.slug}/menu?dish=${item.id}`;
    const shareText = `Check out this ${item.name} from ${restaurant.name}! 🍽️`;

    // Use Web Share API if available (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${item.name} - ${restaurant.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard! Share it with your friends.');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Could not copy link. Please try again.');
      }
    }
  };

  // Toggle like
  const toggleLike = async (itemId: string) => {
    const { likeRestaurant, unlikeRestaurant } = await import('../services/interactionService');
    const item = restaurant.menuItems.find(i => i.id === itemId);
    
    setLikedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        unlikeRestaurant(itemId);
        // Update count
        const currentCount = likesCounts.get(itemId) || 0;
        const newCounts = new Map(likesCounts);
        newCounts.set(itemId, Math.max(0, currentCount - 1));
        setLikesCounts(newCounts);
      } else {
        next.add(itemId);
        likeRestaurant(restaurant.id, itemId, item?.category);
        // Analytics V2: Track like
        trackAnalyticsEvent({ eventType: 'like', restaurantId: restaurant.id, itemId }).catch(() => {});
        // Update count
        const currentCount = likesCounts.get(itemId) || 0;
        const newCounts = new Map(likesCounts);
        newCounts.set(itemId, currentCount + 1);
        setLikesCounts(newCounts);
      }
      return next;
    });
  };
  
  // Toggle save
  const toggleSave = async (itemId: string) => {
    console.log('[RestaurantMenuPage] Toggle save:', itemId);
    const { saveRestaurant, unsaveRestaurant } = await import('../services/interactionService');
    const item = restaurant.menuItems.find(i => i.id === itemId);
    
    setSavedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        unsaveRestaurant(itemId);
        console.log('[RestaurantMenuPage] Removed from saved');
      } else {
        next.add(itemId);
        saveRestaurant(restaurant.id, itemId, item?.category);
        // Analytics V2: Track save
        trackAnalyticsEvent({ eventType: 'save', restaurantId: restaurant.id, itemId }).catch(() => {});
        console.log('[RestaurantMenuPage] Added to saved');
      }
      localStorage.setItem(`saved_dishes_${restaurant.id}`, JSON.stringify([...next]));
      console.log('[RestaurantMenuPage] Saved to localStorage:', Array.from(next));
      
      // Dispatch event for sync with RestaurantProfile
      window.dispatchEvent(new Event('savedDishesChanged'));
      console.log('[RestaurantMenuPage] Event dispatched');
      
      return next;
    });
  };

  // Filter items by category and saved status
  let filteredItems = activeCategory 
    ? restaurant.menuItems.filter(item => item.category === activeCategory)
    : restaurant.menuItems;
  
  // If showSavedOnly is true, only show saved videos
  if (showSavedOnly) {
    filteredItems = filteredItems.filter(item => savedItems.has(item.id));
  }

  // Get next category helper
  const getNextCategory = (): string | null | false => {
    if (activeCategory === null) {
      // "All" view → go to first category
      return restaurant.categories.length > 0 ? restaurant.categories[0] : false;
    }
    const currentIdx = restaurant.categories.indexOf(activeCategory);
    const nextIdx = currentIdx + 1;
    if (nextIdx < restaurant.categories.length) return restaurant.categories[nextIdx];
    return false; // no more categories
  };

  // Handle scroll to update active video
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    const itemHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / itemHeight);

    // On /r/ routes: auto-advance to next category when scrolling past last video
    if (isQRRoute && newIndex >= filteredItems.length && filteredItems.length > 0) {
      const next = getNextCategory();
      if (next !== false) {
        setActiveCategory(next);
        return;
      }
    }

    if (newIndex !== activeVideoIndex && newIndex >= 0 && newIndex < filteredItems.length) {
      setActiveVideoIndex(newIndex);
    }
  };

  // Play active video — only ONE <video> element exists at a time (rendered in JSX)
  useEffect(() => {
    const activeVideo = videoRefs.current[activeVideoIndex];
    if (!activeVideo) return;
    
    activeVideo.muted = isMuted;
    if (isPlaying) {
      activeVideo.play().catch(() => {});
    }
    
    // Retry play every 500ms (mobile Safari sometimes needs multiple attempts)
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      const video = videoRefs.current[activeVideoIndex];
      retryCount++;
      if (retryCount >= 10) { clearInterval(retryInterval); return; }
      if (video && isPlaying && video.paused) {
        video.muted = isMuted;
        video.play().catch(() => {});
      }
      if (video && !video.paused) {
        clearInterval(retryInterval);
        setVideoReady(prev => new Set(prev).add(activeVideoIndex));
      }
    }, 500);
    
    return () => clearInterval(retryInterval);
  }, [activeVideoIndex, isMuted, isPlaying, filteredItems]);
  
  // Analytics V2: Track play and view when active video changes
  const currentActiveItemId = filteredItems[activeVideoIndex]?.id;
  useEffect(() => {
    if (currentActiveItemId && restaurant.id) {
      trackAnalyticsEvent({ eventType: 'play', restaurantId: restaurant.id, itemId: currentActiveItemId }).catch(() => {});
      trackAnalyticsEvent({ eventType: 'view', restaurantId: restaurant.id, itemId: currentActiveItemId }).catch(() => {});
    }
  }, [currentActiveItemId, restaurant.id]);

  // Auto-play next video when current ends
  useEffect(() => {
    const currentVideo = videoRefs.current[activeVideoIndex];
    if (!currentVideo) return;
    
    const handleVideoEnd = () => {
      // If not the last video in filtered items, go to next
      if (activeVideoIndex < filteredItems.length - 1) {
        setActiveVideoIndex(activeVideoIndex + 1);
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ 
            top: (activeVideoIndex + 1) * window.innerHeight, 
            behavior: 'smooth' 
          });
        }
      } else {
        // Last video of current category - switch to next category
        const currentCategoryIndex = restaurant.categories.indexOf(activeCategory || '');
        const nextCategoryIndex = currentCategoryIndex + 1;
        
        if (activeCategory === null) {
          // We're in "All" view, go to first category
          if (restaurant.categories.length > 0) {
            setActiveCategory(restaurant.categories[0]);
          }
        } else if (nextCategoryIndex < restaurant.categories.length) {
          // Go to next category
          setActiveCategory(restaurant.categories[nextCategoryIndex]);
        } else {
          // All categories done, go back to "All"
          setActiveCategory(null);
        }
      }
    };
    
    currentVideo.addEventListener('ended', handleVideoEnd);
    return () => currentVideo.removeEventListener('ended', handleVideoEnd);
  }, [activeVideoIndex, filteredItems.length, activeCategory, restaurant.categories]);

  // Cleanup: unload all videos when component unmounts to free memory
  useEffect(() => {
    return () => {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
      });
      videoRefs.current = [];
    };
  }, []);

  // Timeout fallback: show retry UI after 4s if video doesn't load
  useEffect(() => {
    if (videoReady.has(activeVideoIndex)) return;
    const timeout = setTimeout(() => {
      setVideoTimedOut(prev => new Set(prev).add(activeVideoIndex));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [activeVideoIndex, videoReady]);

  // Reset video index and state when category changes (skip initial mount to preserve URL dish params)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setActiveVideoIndex(0);
    setVideoReady(new Set());
    setVideoErrors(new Set());
    setVideoTimedOut(new Set());
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
  }, [activeCategory]);

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      
      {/* Header - Restaurant Info */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6 pt-12">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button 
            onClick={() => {
              const pathname = window.location.pathname;
              const isDemoRoute = pathname.startsWith('/demo/');
              const isQRRoute = pathname.startsWith('/r/');
              
              if (isDemoRoute) {
                // Demo route (/demo/:slug/menu) - check for special routes
                const params = new URLSearchParams(window.location.search);
                const from = params.get('from');
                
                if (from === 'full-menu') {
                  window.location.href = `/demo/${restaurant.slug}/full-menu`;
                } else if (from === 'saved') {
                  window.location.href = `/demo/${restaurant.slug}/saved`;
                } else {
                  window.location.href = `/demo/${restaurant.slug}`;
                }
              } else if (isQRRoute) {
                // QR code route (/r/:slug/menu) - check for special routes
                const params = new URLSearchParams(window.location.search);
                const from = params.get('from');
                
                if (from === 'full-menu') {
                  window.location.href = `/r/${restaurant.slug}/full-menu`;
                } else if (from === 'saved') {
                  window.location.href = `/r/${restaurant.slug}/saved`;
                } else {
                  window.location.href = `/r/${restaurant.slug}`;
                }
              } else {
                // App feed route (/:slug/menu) - go back to /:slug
                window.location.href = `/${restaurant.slug}`;
              }
            }}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all flex-shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          {/* Logo - clickable to go back */}
          <button onClick={() => {
            const pathname = window.location.pathname;
            const isDemoRoute = pathname.startsWith('/demo/');
            const isQRRoute = pathname.startsWith('/r/');
            
            if (isDemoRoute) {
              // Demo route (/demo/:slug/menu) - check for special routes
              const params = new URLSearchParams(window.location.search);
              const from = params.get('from');
              
              if (from === 'full-menu') {
                window.location.href = `/demo/${restaurant.slug}/full-menu`;
              } else if (from === 'saved') {
                window.location.href = `/demo/${restaurant.slug}/saved`;
              } else {
                window.location.href = `/demo/${restaurant.slug}`;
              }
            } else if (isQRRoute) {
              // QR code route (/r/:slug/menu) - check for special routes
              const params = new URLSearchParams(window.location.search);
              const from = params.get('from');
              
              if (from === 'full-menu') {
                window.location.href = `/r/${restaurant.slug}/full-menu`;
              } else if (from === 'saved') {
                window.location.href = `/r/${restaurant.slug}/saved`;
              } else {
                window.location.href = `/r/${restaurant.slug}`;
              }
            } else {
              // App feed route (/:slug/menu) - go back to /:slug
              window.location.href = `/${restaurant.slug}`;
            }
          }} className="flex-shrink-0">
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt={restaurant.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{restaurant.name.charAt(0)}</span>
              </div>
            )}
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-base leading-tight">{restaurant.name}</h1>
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <span>{restaurant.cuisine}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Star size={10} className="text-amber-400" fill="currentColor" />
                <span>{restaurant.rating}</span>
              </div>
            </div>
          </div>
          {/* Review button - top right */}
          <a
            href={restaurant.googleMapsUrl ? `${restaurant.googleMapsUrl}#reviews` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full hover:bg-white/30 transition-all"
          >
            <Star size={14} className="text-amber-400" fill="currentColor" />
            <span className="text-white font-bold text-sm">{restaurant.rating?.toFixed(1)}</span>
            <span className="text-white/70 text-xs">({restaurant.totalReviews})</span>
          </a>
        </div>

        {/* Category Pills */}
        {restaurant.categories.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === null 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              All
            </button>
            {restaurant.categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === category 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {category}
              </button>
            ))}
            {/* Full Menu Link */}
            <a
              href={`${window.location.pathname.startsWith('/demo/') ? '/demo/' : window.location.pathname.startsWith('/r/') ? '/r/' : '/'}${restaurant.slug}/full-menu`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-white/10 text-orange-400 hover:bg-white/20 transition-all border border-orange-400/30"
            >
              <UtensilsCrossed size={12} />
              Full Menu
            </a>
          </div>
        )}
      </div>

      {/* Video Feed - Vertical Scroll */}
      <div 
        ref={scrollRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >
        {filteredItems.map((item, index) => (
          <div key={item.id} className="h-screen w-full snap-start relative">
            {/* Only render <video> for active video — multiple video elements kill mobile Safari */}
            {index === activeVideoIndex ? (
              <>
                {/* Loading spinner */}
                {!videoReady.has(index) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
                    {restaurant.coverPhotoUrl && (
                      <img src={restaurant.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    {videoTimedOut.has(index) || videoErrors.has(index) ? (
                      <button
                        onClick={() => {
                          const video = videoRefs.current[index];
                          if (video) {
                            setVideoTimedOut(prev => { const n = new Set(prev); n.delete(index); return n; });
                            setVideoErrors(prev => { const n = new Set(prev); n.delete(index); return n; });
                            video.play().catch(() => {});
                          }
                        }}
                        className="relative z-10 flex flex-col items-center gap-3"
                      >
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                          <Play size={24} className="text-white ml-1" fill="white" />
                        </div>
                        <span className="text-white/70 text-xs">Tap to play</span>
                      </button>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin mb-3" />
                        <span className="text-zinc-500 text-xs">Loading video...</span>
                      </div>
                    )}
                  </div>
                )}
                <video
                  ref={el => {
                    videoRefs.current[index] = el;
                    if (el) el.muted = isMuted;
                  }}
                  src={getCDNUrl(item.videoUrl)}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop
                  muted
                  autoPlay
                  playsInline
                  preload="auto"
                  onPlaying={() => setVideoReady(prev => new Set(prev).add(index))}
                  onCanPlay={() => {
                    setVideoReady(prev => new Set(prev).add(index));
                    const video = videoRefs.current[index];
                    if (video && isPlaying) video.play().catch(() => {});
                  }}
                  onLoadedData={() => setVideoReady(prev => new Set(prev).add(index))}
                  onError={() => {
                    console.error('Video failed to load:', item.videoUrl);
                    setVideoErrors(prev => new Set(prev).add(index));
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-black">
                {restaurant.coverPhotoUrl && (
                  <img src={restaurant.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            {/* Item Info */}
            <div className="absolute bottom-32 left-0 right-0 p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">{item.category}</span>
                {/* View counter - discrete but visible */}
                {viewCounts.get(item.id) !== undefined && viewCounts.get(item.id)! > 0 && (
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <Eye size={10} className="text-white/70" />
                    <span className="text-white/70 text-[10px] font-medium">{viewCounts.get(item.id)}</span>
                  </div>
                )}
              </div>
              <h2 className="text-white text-2xl font-black mt-1">{item.name}</h2>
              {item.description && (
                <p className="text-white/70 text-sm mt-2 line-clamp-2">{item.description}</p>
              )}
              {item.price && (
                <p className="text-white font-bold text-lg mt-2">${item.price.toFixed(2)}</p>
              )}
            </div>

            {/* Right side controls */}
            <div className="absolute right-4 bottom-40 flex flex-col items-center gap-4">
              {/* Like button */}
              <button 
                onClick={() => toggleLike(item.id)}
                className="flex flex-col items-center gap-1"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  likedItems.has(item.id) 
                    ? 'bg-red-500' 
                    : 'bg-white/20 backdrop-blur-md'
                }`}>
                  <Heart 
                    size={24} 
                    className={likedItems.has(item.id) ? 'text-white fill-white' : 'text-white'} 
                  />
                </div>
                <span className="text-white text-[10px] font-medium">
                  {likesCounts.get(item.id) || 0}
                </span>
              </button>
              
              {/* Save button */}
              <button 
                onClick={() => toggleSave(item.id)}
                className="flex flex-col items-center gap-1"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  savedItems.has(item.id) 
                    ? 'bg-orange-500' 
                    : 'bg-white/20 backdrop-blur-md'
                }`}>
                  <Bookmark 
                    size={24} 
                    className={savedItems.has(item.id) ? 'text-white fill-white' : 'text-white'} 
                  />
                </div>
                <span className="text-white text-[10px] font-medium">
                  {savedItems.has(item.id) ? 'Saved' : 'Save'}
                </span>
              </button>
              
              {/* Share button */}
              <button 
                onClick={() => shareDish(item)}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md">
                  <Send size={24} className="text-white" />
                </div>
                <span className="text-white text-[10px] font-medium">Share</span>
              </button>
              
              {/* Order Now button - only show if ordering is enabled and URL exists */}
              {restaurant.enable_ordering_button && (item.dish_order_url || restaurant.ordering_url) && (
                <button 
                  onClick={() => handleOrderNow(item)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-500">
                    <ShoppingBag size={24} className="text-white" />
                  </div>
                  <span className="text-white text-[10px] font-medium">Order</span>
                </button>
              )}
              
              {/* Mute button */}
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white mt-2"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              {/* Play/Pause button */}
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>

            {/* Swipe indicator - on /r/ routes, also show on last video if there's a next category */}
            {index === activeVideoIndex && (index < filteredItems.length - 1 || (isQRRoute && getNextCategory() !== false)) && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                <ChevronUp className="w-6 h-6 text-white/50 animate-bounce" />
              </div>
            )}
          </div>
        ))}

        {/* End card - on /r/ routes, only show when no more categories to advance to */}
        {filteredItems.length > 0 && !(isQRRoute && getNextCategory() !== false) && (
          <div className="h-screen w-full snap-start flex flex-col items-center justify-center p-8 bg-gradient-to-b from-black to-zinc-900">
            <div className="text-center">
              {restaurant.logoUrl ? (
                <img src={restaurant.logoUrl} alt={restaurant.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-6 border-2 border-white/20" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-6">
                  <span className="text-white font-bold text-3xl">{restaurant.name.charAt(0)}</span>
                </div>
              )}
              <h2 className="text-white text-2xl font-black mb-2">{restaurant.name}</h2>
              <p className="text-white/60 text-sm mb-8">Thanks for watching our menu!</p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                {/* Show trial CTA only on /demo/ routes */}
                {window.location.pathname.startsWith('/demo/') ? (
                  <a 
                    href="/partner?step=2"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                  >
                    <Sparkles size={18} />
                    Loved it? Start Your Free Menu
                  </a>
                ) : restaurant.googleMapsUrl && (
                  <a 
                    href={restaurant.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      trackEvent({ 
                        eventType: 'directions_click',
                        restaurantId: restaurant.id 
                      });
                      // Analytics V2: Track directions click
                      trackAnalyticsEvent({ eventType: 'directions_click', restaurantId: restaurant.id }).catch(() => {});
                    }}
                    className="flex items-center justify-center gap-2 bg-white text-black font-bold py-4 px-6 rounded-2xl"
                  >
                    <Navigation size={18} />
                    Get Directions
                  </a>
                )}
                {restaurant.website && (
                  <a 
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 px-6 rounded-2xl"
                  >
                    <Globe size={18} />
                    Visit Website
                  </a>
                )}
              </div>

              <p className="text-white/40 text-xs mt-8">
                Powered by MenuLove
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video counter */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-2">
          <span className="text-white text-xs font-bold">
            {activeVideoIndex + 1} / {filteredItems.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantMenuPage;
