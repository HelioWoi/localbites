import React, { useState, useRef, useEffect } from 'react';
import { Restaurant, Dish, Review } from '../types';
import { ChevronLeft, ChevronDown, Globe, MapPin, Navigation, Bookmark, PlayCircle, Camera, X, Crown, Play, Pause, Volume2, VolumeX, Star, ChevronRight, ChevronUp, ExternalLink, Home, Search, MessageSquare, Filter, Clock, Heart, Trash2, Phone, Sparkles, UtensilsCrossed, Video, Share2, ShoppingBag, Eye } from 'lucide-react';
import BannerSlider from '../components/BannerSlider';
import { getPlaceDetails, textSearchRestaurants } from '../services/googlePlacesProxy';
import { trackEvent } from '../services/eventsService';
import { trackAnalyticsEvent } from '../services/analyticsV2Service';
import { getMenuItemViewCounts } from '../services/partnerAnalyticsService';
import { getCDNUrl } from '../utils/cdnHelper';
import { orderCategoriesAlcoholLast } from '../utils/categoryOrder';

interface RestaurantProfileProps {
  restaurant: Restaurant;
  onBack?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  openReviews?: boolean;
  onNavigateToPartner?: () => void;
  onOpenAI?: () => void;
  onRequestRemoval?: (name: string, id: string) => void;
  isStandalone?: boolean;
  onOpenSearch?: () => void;
  onOpenFilter?: () => void;
}

// Helper to get/set saved dishes from localStorage
const getSavedDishes = (restaurantId: string): Set<string> => {
  try {
    const saved = localStorage.getItem(`saved_dishes_${restaurantId}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
};

const saveDishesToStorage = (restaurantId: string, dishIds: Set<string>) => {
  localStorage.setItem(`saved_dishes_${restaurantId}`, JSON.stringify([...dishIds]));
};

const RestaurantProfile: React.FC<RestaurantProfileProps> = ({ restaurant, onBack, isSaved, onToggleSave, openReviews = false, onNavigateToPartner, onOpenAI, onOpenSearch, onOpenFilter, isStandalone = false, onRequestRemoval }) => {
  // Analytics V2: Track profile view on mount + QR scan only if ?qr=1 param present
  useEffect(() => {
    if (restaurant.id) {
      trackAnalyticsEvent({ eventType: 'profile_view', restaurantId: restaurant.id }).catch(() => {});
      const params = new URLSearchParams(window.location.search);
      if (params.get('qr') === '1' || params.get('source') === 'qr') {
        trackAnalyticsEvent({ eventType: 'qr_scan', restaurantId: restaurant.id }).catch(() => {});
      }
    }
  }, [restaurant.id]);

  const [showVideoReels, setShowVideoReels] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [swipeHintCounts, setSwipeHintCounts] = useState<number[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const videoReelsRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const gridVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  
  // Reviews Reels state
  const [showReviewsReel, setShowReviewsReel] = useState(openReviews);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [reviewSwipeCount, setReviewSwipeCount] = useState(0);
  const reviewsScrollRef = useRef<HTMLDivElement>(null);
  
  // Expandable text state
  const [expandedVideoText, setExpandedVideoText] = useState(false);
  const [expandedReviewText, setExpandedReviewText] = useState(false);
  
  // Saved dishes state
  const [savedDishIds, setSavedDishIds] = useState<Set<string>>(() => getSavedDishes(restaurant.id));
  
  // View counts state
  const [viewCounts, setViewCounts] = useState<Map<string, number>>(new Map());
  const [weeklyViewCounts, setWeeklyViewCounts] = useState<Map<string, number>>(new Map());
  const [showOpeningHours, setShowOpeningHours] = useState(false);
  const [gridMediaLoaded, setGridMediaLoaded] = useState<Set<string>>(new Set());
  const [mediaView, setMediaView] = useState<'video' | 'photo'>('video');
  const isPartnerExperience = restaurant.isSubscribed;
  
  // Reload saved dishes when component mounts (e.g., returning from menu page)
  useEffect(() => {
    console.log('[RestaurantProfile] Component mounted, reloading saved dishes');
    const updated = getSavedDishes(restaurant.id);
    console.log('[RestaurantProfile] Loaded saved dishes:', Array.from(updated));
    setSavedDishIds(updated);
    
    // Load view counts
    const loadViewCounts = async () => {
      try {
        const itemIds = restaurant.dishes.map(dish => dish.id);
        const [counts, weeklyCounts] = await Promise.all([
          getMenuItemViewCounts(itemIds),
          getMenuItemViewCounts(itemIds, 7),
        ]);
        
        // If no real data, add mock data for visual testing
        if (counts.size === 0) {
          const mockCounts = new Map<string, number>();
          restaurant.dishes.forEach((dish) => {
            mockCounts.set(dish.id, Math.floor(Math.random() * 450) + 50);
          });
          setViewCounts(mockCounts);
          setWeeklyViewCounts(mockCounts);
        } else {
          setViewCounts(counts);
          setWeeklyViewCounts(weeklyCounts.size > 0 ? weeklyCounts : counts);
        }
      } catch (error) {
        console.error('Failed to load view counts:', error);
        // Fallback to mock data
        const mockCounts = new Map<string, number>();
        restaurant.dishes.forEach((dish) => {
          mockCounts.set(dish.id, Math.floor(Math.random() * 450) + 50);
        });
        setViewCounts(mockCounts);
        setWeeklyViewCounts(mockCounts);
      }
    };
    loadViewCounts();
  }, [restaurant.id]);
  
  // Google reviews state (for non-partner restaurants)
  const [googleReviews, setGoogleReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const dishesWithVideo = restaurant.dishes.filter(d => d.videoUrl);
  const dishesWithPhotoOnly = isPartnerExperience
    ? restaurant.dishes.filter(d => !d.videoUrl && (d.photoUrl || d.thumbnailUrl))
    : [];

  const normalizeCategoryForPartner = (category?: string) => {
    const clean = (category || '').trim();
    if (!isPartnerExperience || !clean) return clean;
    const lower = clean.toLowerCase();
    if (lower.endsWith('s')) return clean.slice(0, -1);
    return clean;
  };

  const normalizedMenuItems = [...dishesWithVideo, ...dishesWithPhotoOnly].map((dish) => ({
    ...dish,
    category: normalizeCategoryForPartner(dish.category),
  }));
  const videoMenuItems = normalizedMenuItems.filter(d => d.videoUrl);
  const photoMenuItems = normalizedMenuItems.filter(d => !d.videoUrl && (d.photoUrl || d.thumbnailUrl));
  // For subscribed (partner experience) restaurants, include photo-only items in the main feed
  const menuFeedItems = mediaView === 'video'
    ? (isPartnerExperience ? normalizedMenuItems : videoMenuItems)
    : photoMenuItems;
  const restaurantSlug = ((restaurant as any).slug) || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fullMenuPath = `${window.location.pathname.startsWith('/demo/') ? '/demo/' : isStandalone ? '/r/' : '/'}${restaurantSlug}/full-menu`;

  const menuCategories = [...new Set(menuFeedItems.map(d => d.category).filter(Boolean))] as string[];
  const orderedMenuCategories = orderCategoriesAlcoholLast(menuCategories);

  const menuCategoryOrder = new Map(
    orderedMenuCategories.map((category, index) => [category, index])
  );

  const photoCategoryOrder = new Map(
    orderCategoriesAlcoholLast([...new Set(photoMenuItems.map(d => d.category).filter(Boolean))] as string[])
      .map((category, index) => [category, index])
  );

  const orderedPhotoMenuItems = [...photoMenuItems].sort((a, b) => {
    const aOrder = photoCategoryOrder.get(a.category || '') ?? Number.MAX_SAFE_INTEGER;
    const bOrder = photoCategoryOrder.get(b.category || '') ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (weeklyViewCounts.get(b.id) || 0) - (weeklyViewCounts.get(a.id) || 0);
  });

  const orderedMenuFeedItems = [...menuFeedItems].sort((a, b) => {
    const aOrder = menuCategoryOrder.get(a.category || '') ?? Number.MAX_SAFE_INTEGER;
    const bOrder = menuCategoryOrder.get(b.category || '') ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (weeklyViewCounts.get(b.id) || 0) - (weeklyViewCounts.get(a.id) || 0);
  });

  const hasVideoItems = videoMenuItems.length > 0;
  const hasPhotoItems = photoMenuItems.length > 0;

  const heroDish = orderedMenuFeedItems.find((dish) => Boolean(dish.videoUrl)) || videoMenuItems[0] || null;
  const savedDishes = restaurant.dishes.filter(d => savedDishIds.has(d.id));
  
  // Video menu categories
  const [selectedVideoCategory, setSelectedVideoCategory] = useState<string>('All');
  const videoCategories = ['All', ...orderedMenuCategories];
  const filteredMenuItems = selectedVideoCategory === 'All' 
    ? orderedMenuFeedItems 
    : orderedMenuFeedItems.filter(d => d.category === selectedVideoCategory);
  const selectedCategoryPhotoItems = selectedVideoCategory === 'All'
    ? orderedPhotoMenuItems
    : orderedPhotoMenuItems.filter(d => d.category === selectedVideoCategory);
  const photoContinuationGroups = selectedVideoCategory === 'All'
    ? orderCategoriesAlcoholLast([...new Set(selectedCategoryPhotoItems.map(d => d.category).filter(Boolean))] as string[])
        .map((category) => ({
          category,
          items: selectedCategoryPhotoItems.filter((dish) => dish.category === category),
        }))
    : [{ category: selectedVideoCategory, items: selectedCategoryPhotoItems }];
  // Photos are now included in the main feed for partner experience — continuation section not needed
  const shouldShowPhotoContinuation = false;
  const menuFeedBasePath = `${window.location.pathname.startsWith('/demo/') ? '/demo/' : isStandalone ? '/r/' : '/'}${restaurantSlug}/menu`;
  const isAllVideoCategory = selectedVideoCategory === 'All';
  const recommendedItems = filteredMenuItems.slice(0, 4);
  const menuCategorySections = (isAllVideoCategory ? orderedMenuCategories : [selectedVideoCategory])
    .map((category) => ({
      category,
      items: isAllVideoCategory
        ? filteredMenuItems.filter((dish) => dish.category === category).slice(0, 4)
        : filteredMenuItems.filter((dish) => dish.category === category),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    if (mediaView === 'video' && !hasVideoItems && hasPhotoItems) {
      setMediaView('photo');
      setSelectedVideoCategory('All');
    }
    if (mediaView === 'photo' && !hasPhotoItems && hasVideoItems) {
      setMediaView('video');
      setSelectedVideoCategory('All');
    }
  }, [mediaView, hasVideoItems, hasPhotoItems]);

  useEffect(() => {
    setSelectedVideoCategory('All');
  }, [mediaView, restaurant.id]);
  
  // Load Google reviews for all restaurants
  useEffect(() => {
    const loadGoogleReviews = async () => {
      // Google Place IDs start with "ChIJ" or "places/"
      const isGoogleRestaurant = restaurant.id.startsWith('places/') || restaurant.id.startsWith('ChIJ');
      const hasReviews = restaurant.reviews && restaurant.reviews.length > 0;
      const hasValidRating = restaurant.totalReviews && restaurant.totalReviews > 0;
      const needsReviews = !hasReviews || !hasValidRating;
      
      console.log('[RestaurantProfile] ===== PARTNER LOOKUP START =====');
      console.log('[RestaurantProfile] Partner ID:', restaurant.id);
      console.log('[RestaurantProfile] Partner Name:', restaurant.name);
      console.log('[RestaurantProfile] Stored google_place_id:', (restaurant as any).google_place_id || 'NONE');
      console.log('[RestaurantProfile] Is Google restaurant:', isGoogleRestaurant);
      console.log('[RestaurantProfile] Has reviews:', hasReviews, 'Has valid rating:', hasValidRating);
      console.log('[RestaurantProfile] Needs reviews:', needsReviews);
      
      if (!needsReviews) return;
      
      setLoadingReviews(true);
      try {
        let placeId = isGoogleRestaurant ? restaurant.id : (restaurant as any).google_place_id || null;
        
        // For partner restaurants, resolve Google Place ID if not already stored
        if (!placeId && restaurant.name) {
          console.log('[RestaurantProfile] No stored place_id - running resolver');
          
          // Build search variations with smart name handling
          const baseName = restaurant.name.replace(/\s*-\s*Sunshine Coast$/i, '').trim();
          const searchVariations = [
            baseName, // Clean name without location suffix
            `${baseName} Sunshine Coast`, // Name + location
            `${baseName} cafe`, // Name + cafe
            restaurant.name, // Original name as-is
            restaurant.address ? `${baseName} ${restaurant.address}` : null, // Name + full address
          ].filter(Boolean);
          
          console.log('[RestaurantProfile] Search variations:', searchVariations);
          
          let allCandidates: any[] = [];
          
          // Collect all candidates from all variations
          for (const query of searchVariations) {
            console.log('[RestaurantProfile] Trying search:', query);
            const results = await textSearchRestaurants(
              0,
              0,
              50000, // 50km radius
              query!
            );
            if (results.length > 0) {
              console.log('[RestaurantProfile] Found', results.length, 'results with query:', query);
              allCandidates.push(...results);
            }
          }
          
          // Remove duplicates by place ID
          const uniqueCandidates = Array.from(
            new Map(allCandidates.map(c => [c.id, c])).values()
          );
          
          console.log('[RestaurantProfile] Total unique candidates:', uniqueCandidates.length);
          
          if (uniqueCandidates.length > 0) {
            // GPS-free selection: prioritize more reviewed and better rated candidates
            const rankedCandidates = [...uniqueCandidates].sort((a, b) => {
              const reviewsA = Number(a.totalReviews || 0);
              const reviewsB = Number(b.totalReviews || 0);
              if (reviewsB !== reviewsA) return reviewsB - reviewsA;
              const ratingA = Number(a.rating || 0);
              const ratingB = Number(b.rating || 0);
              return ratingB - ratingA;
            });

            const bestCandidate = rankedCandidates[0];
            placeId = bestCandidate.id;
            
            console.log('[RestaurantProfile] Best candidate selected:');
            console.log('  - Place ID:', placeId);
            console.log('  - Name:', bestCandidate.name);
            console.log('  - Rating:', bestCandidate.rating);
            console.log('  - Total reviews:', bestCandidate.totalReviews);
            
            // Update local state
            restaurant.rating = bestCandidate.rating || restaurant.rating;
            restaurant.totalReviews = bestCandidate.totalReviews || 0;
            
            // Save to DB for future lookups (persistent cache)
            const { supabase } = await import('../lib/supabase');
            const { error } = await supabase
              .from('partners')
              .update({ 
                rating: bestCandidate.rating || restaurant.rating, 
                total_reviews: bestCandidate.totalReviews || 0,
                google_place_id: placeId
              })
              .eq('id', restaurant.id);
            
            if (error) {
              console.error('[RestaurantProfile] Error saving place_id to DB:', error);
            } else {
              console.log('[RestaurantProfile] ✓ Saved place_id to DB for future use');
            }
          } else {
            console.log('[RestaurantProfile] ✗ No candidates found - tried all variations');
            console.log('[RestaurantProfile] This partner needs manual Place ID configuration');
          }
        } else if (placeId) {
          console.log('[RestaurantProfile] Using stored place_id:', placeId);
        }
        
        if (placeId) {
          console.log('[RestaurantProfile] Fetching reviews for:', placeId);
          const details = await getPlaceDetails(placeId);
          console.log('[RestaurantProfile] Got details:', details);
          
          // Save opening hours to DB if available
          if (details?.openingHours && details.openingHours.length > 0 && !isGoogleRestaurant) {
            console.log('[RestaurantProfile] Saving opening hours to DB:', details.openingHours);
            const { supabase } = await import('../lib/supabase');
            await supabase
              .from('partners')
              .update({ 
                opening_hours: details.openingHours
              })
              .eq('id', restaurant.id);
            // Update local state
            restaurant.openingHours = details.openingHours;
          }
          
          if (details?.reviews && details.reviews.length > 0) {
            console.log('[RestaurantProfile] Setting', details.reviews.length, 'reviews');
            setGoogleReviews(details.reviews.map((r: any, i: number) => ({
              id: `google-${i}`,
              authorName: r.authorName,
              authorPhotoUrl: r.authorPhotoUrl,
              rating: r.rating,
              text: r.text,
              relativeTimeDescription: r.relativeTimeDescription,
              time: r.time,
            })));
          } else {
            console.log('[RestaurantProfile] No reviews in response');
          }
        } else {
          console.log('[RestaurantProfile] Could not find Google Place ID');
        }
      } catch (error) {
        console.error('[RestaurantProfile] Error loading Google reviews:', error);
      } finally {
        setLoadingReviews(false);
      }
    };
    loadGoogleReviews();
  }, [restaurant.id]);
  
  // Keep grid videos paused - only show first frame
  useEffect(() => {
    // Ensure all grid videos are paused and show first frame
    gridVideoRefs.current.forEach((video) => {
      if (video) {
        video.pause();
        video.currentTime = 0.1; // Show first frame
      }
    });
  }, [filteredMenuItems]);
  
  // Sync saved dishes when changed in video feed
  useEffect(() => {
    const handleStorageChange = () => {
      // Reload saved dishes from storage
      const updated = getSavedDishes(restaurant.id);
      setSavedDishIds(updated);
    };

    // Listen for storage changes (from video feed)
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event (same-tab changes)
    window.addEventListener('savedDishesChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('savedDishesChanged', handleStorageChange);
    };
  }, [restaurant.id]);
  
  // Toggle save dish
  const toggleSaveDish = (dishId: string) => {
    console.log('[RestaurantProfile] Toggle save dish:', dishId);
    console.log('[RestaurantProfile] Restaurant ID:', restaurant.id);
    console.log('[RestaurantProfile] Current saved:', Array.from(savedDishIds));
    
    const newSaved = new Set(savedDishIds);
    if (newSaved.has(dishId)) {
      newSaved.delete(dishId);
      console.log('[RestaurantProfile] Removed from saved');
    } else {
      newSaved.add(dishId);
      console.log('[RestaurantProfile] Added to saved');
    }
    
    console.log('[RestaurantProfile] New saved:', Array.from(newSaved));
    setSavedDishIds(newSaved);
    saveDishesToStorage(restaurant.id, newSaved);
    
    // Dispatch event for same-tab sync
    window.dispatchEvent(new Event('savedDishesChanged'));
    console.log('[RestaurantProfile] Event dispatched');
  };

  // Order Now - redirect to ordering system
  const handleOrderNow = (dish: Dish) => {
    const orderUrl = dish.dish_order_url || restaurant.ordering_url;
    if (!orderUrl) return;

    // Track order button click
    trackEvent({
      restaurantId: restaurant.id,
      eventType: 'order_button_click',
      itemId: dish.id,
      itemType: dish.category,
    });
    // Analytics V2: Track order click
    trackAnalyticsEvent({ eventType: 'order_click', restaurantId: restaurant.id, itemId: dish.id }).catch(() => {});

    // Open ordering URL in same page
    window.location.href = orderUrl;
  };

  // Combine restaurant reviews with Google reviews
  const allReviews = [...(restaurant.reviews || []), ...googleReviews];
  const sortedReviews = allReviews.sort((a, b) => b.time - a.time);

  // Initialize swipe hint counts for all videos
  useEffect(() => {
    if (showVideoReels && swipeHintCounts.length !== dishesWithVideo.length) {
      setSwipeHintCounts(new Array(dishesWithVideo.length).fill(0));
    }
  }, [showVideoReels, dishesWithVideo.length]);

  // No auto-scroll for videos - manual swipe only (like Instagram)

  // Handle scroll to detect active video
  const handleVideoScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== activeVideoIndex) {
      setActiveVideoIndex(index);
      // Play the new active video, pause others
      videoRefs.current.forEach((video, i) => {
        if (video) {
          if (i === index) {
            video.play();
          } else {
            video.pause();
          }
        }
      });
    }
  };

  const handleSeeMoreFromHero = () => {
    if (!heroDish) return;
    const heroIndex = menuFeedItems.findIndex(d => d.id === heroDish.id);
    openDishFromGrid(heroDish, heroIndex >= 0 ? heroIndex : 0);
  };

  const navigateToMenuFeedFromDish = (dish?: Dish) => {
    const slug = (restaurant as any).slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const isDemoMode = window.location.pathname.startsWith('/demo/');
    const params = new URLSearchParams();
    if (dish?.id) params.set('dish', dish.id);
    const normalizedCategory = normalizeCategoryForPartner(dish?.category);
    if (normalizedCategory) params.set('category', normalizedCategory);
    if (isStandalone && !isDemoMode) params.set('qr', '1');
    const basePath = isDemoMode ? `/demo/${slug}/menu` : isStandalone ? `/r/${slug}/menu` : `/${slug}/menu`;
    window.location.href = params.toString() ? `${basePath}?${params.toString()}` : basePath;
  };

  const openDishFromGrid = (dish: Dish, fallbackIndex: number) => {
    if (isPartnerExperience) {
      navigateToMenuFeedFromDish(dish);
      return;
    }

    if (dish.videoUrl) {
      const realIndex = dishesWithVideo.findIndex(d => d.id === dish.id);
      openVideoReels(realIndex >= 0 ? realIndex : fallbackIndex);
      return;
    }
  };

  const openVideoReels = (startIndex: number) => {
    if (restaurant.isSubscribed) {
      const slug = (restaurant as any).slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const dishId = dishesWithVideo[startIndex]?.id;
      const category = dishesWithVideo[startIndex]?.category;
      
      // Build URL params
      const params = new URLSearchParams();
      if (dishId) params.append('dish', dishId);
      if (category) params.append('category', category);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      // Check if we're in demo mode
      const isDemoMode = window.location.pathname.startsWith('/demo/');
      
      if (isDemoMode) {
        // Demo route - navigate to /demo/:slug/menu
        window.location.href = `/demo/${slug}/menu${queryString}`;
      } else if (isStandalone) {
        // QR code standalone - navigate to /r/:slug/menu
        window.location.href = `/r/${slug}/menu${queryString}`;
      } else {
        // App feed - navigate to /:slug/menu (no /r/ prefix)
        window.location.href = `/${slug}/menu${queryString}`;
      }
    } else {
      // Fallback to modal for non-partner restaurants
      setActiveVideoIndex(startIndex);
      setSwipeHintCounts(new Array(dishesWithVideo.length).fill(0));
      setShowVideoReels(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    videoRefs.current.forEach(video => {
      if (video) video.muted = !isMuted;
    });
  };

  // Handle review scroll
  const handleReviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== activeReviewIndex) {
      setActiveReviewIndex(index);
      setReviewSwipeCount(0); // Reset counter when scrolling
    }
  };

  // No auto-scroll for reviews - manual swipe only (like Instagram)

  // Google Reviews URL
  const googleReviewsUrl = `${restaurant.googleMapsUrl}&review=true`;

  const handleShareRestaurant = async () => {
    trackAnalyticsEvent({ eventType: 'share', restaurantId: restaurant.id }).catch(() => {});

    const slug = (restaurant as any).slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const shareUrl = restaurant.isSubscribed
      ? `${window.location.origin}/${slug}`
      : `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(restaurant.id)}`;
    const shareData = {
      title: restaurant.name,
      text: `Check out ${restaurant.name} on MenuLove!`,
      url: shareUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) { }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="h-screen w-full bg-white flex flex-col profile-scroll">
      
      {/* Video Reels Modal - scroll vertical like TikTok/Reels */}
      {showVideoReels && dishesWithVideo.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header - always visible */}
          <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center justify-between">
              <button onClick={() => setShowVideoReels(false)} className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl text-white active:scale-90 transition-transform">
                <X size={24} />
              </button>
              <button onClick={toggleMute} className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl text-white active:scale-90 transition-transform">
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>
          </div>

          {/* Scrollable video container */}
          <div 
            ref={videoReelsRef}
            className="h-full w-full snap-y snap-mandatory overflow-y-scroll"
            onScroll={handleVideoScroll}
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {dishesWithVideo.map((dish, idx) => (
              <div key={dish.id} className="h-screen w-full snap-start relative flex items-center justify-center">
                <video
                  ref={el => {
                    videoRefs.current[idx] = el;
                  }}
                  src={getCDNUrl(dish.videoUrl)}
                  className="w-full h-full object-cover"
                  autoPlay={idx === activeVideoIndex}
                  loop
                  muted={isMuted}
                  playsInline
                  webkit-playsinline="true"
                  crossOrigin="anonymous"
                  preload="auto"
                  onError={(e) => {
                    console.error('Video failed to load:', dish.videoUrl);
                  }}
                />
                
                {/* Right side action buttons */}
                <div className="absolute right-4 bottom-[200px] flex flex-col items-center gap-4 z-30 pointer-events-auto">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[RestaurantProfile] Bookmark clicked!');
                      toggleSaveDish(dish.id);
                    }}
                    className="flex flex-col items-center gap-1 pointer-events-auto touch-manipulation"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${savedDishIds.has(dish.id) ? 'bg-orange-500' : 'bg-white/20 backdrop-blur-md'}`}>
                      <Bookmark size={24} className={savedDishIds.has(dish.id) ? "text-white fill-white" : "text-white"} />
                    </div>
                    <span className="text-white text-[10px] font-medium">
                      {savedDishIds.has(dish.id) ? 'Saved' : 'Save'}
                    </span>
                  </button>
                </div>
                
                {/* Bottom info + expandable text like Instagram Reels */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-all duration-300 ${expandedVideoText && idx === activeVideoIndex ? 'pb-20' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => setExpandedVideoText(!expandedVideoText)}
                  >
                    <h3 className="text-xl font-black text-white mb-1">{dish.name}</h3>
                    <p className={`text-white/80 font-medium transition-all duration-300 ${expandedVideoText && idx === activeVideoIndex ? '' : 'line-clamp-2'}`}>
                      {dish.description}
                    </p>
                    {dish.description && dish.description.length > 60 && (
                      <button className="text-white/50 text-xs font-bold mt-1">
                        {expandedVideoText && idx === activeVideoIndex ? 'less' : 'more'}
                      </button>
                    )}
                  </div>
                  
                  {/* Swipe hint - shows on all videos except last */}
                  {idx < dishesWithVideo.length - 1 && idx === activeVideoIndex && !expandedVideoText && (
                    <div className="flex flex-col items-center animate-bounce mt-4">
                      <ChevronUp className="w-6 h-6 text-white/70" />
                      <span className="text-white/70 text-xs font-medium">Swipe for more</span>
                    </div>
                  )}
                  
                  {/* Last video indicator */}
                  {idx === dishesWithVideo.length - 1 && idx === activeVideoIndex && !expandedVideoText && (
                    <div className="flex flex-col items-center mt-4">
                      <span className="text-white/50 text-xs font-medium">Last video</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Reels Modal */}
      {showReviewsReel && sortedReviews.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black">
          <div 
            ref={reviewsScrollRef}
            className="h-full w-full snap-y snap-mandatory overflow-y-scroll"
            onScroll={handleReviewScroll}
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {sortedReviews.map((review, idx) => (
              <div key={review.id} className="h-screen w-full snap-start relative overflow-hidden">
                <img 
                  src={review.photoUrl || restaurant.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'} 
                  className={`w-full h-full object-cover transition-transform duration-[8000ms] ease-out ${idx === activeReviewIndex ? 'scale-110' : 'scale-100'}`}
                  alt="Customer photo"
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-6">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setShowReviewsReel(false)} className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white active:scale-90 transition-transform">
                      <X size={24} />
                    </button>
                    <button 
                      onClick={() => {
                        const url = restaurant.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;
                        window.open(url, '_blank');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full active:scale-95 transition-transform"
                    >
                      <Star size={14} className="text-amber-400" fill="currentColor" />
                      <span className="text-white text-sm font-bold">{restaurant.rating}</span>
                      <span className="text-white/60 text-xs">({restaurant.totalReviews} reviews)</span>
                    </button>
                  </div>
                </div>

                {/* Review content at bottom - expandable text like Instagram Reels */}
                <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-all duration-300 ${expandedReviewText && idx === activeReviewIndex ? 'pb-20' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {review.authorPhotoUrl ? (
                      <img src={review.authorPhotoUrl} className="w-10 h-10 rounded-full object-cover border-2 border-white" alt={review.authorName} />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {review.authorName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-bold text-sm">{review.authorName}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className={i < review.rating ? "text-amber-400" : "text-white/30"} fill="currentColor" />
                          ))}
                        </div>
                        <span className="text-white/60 text-[10px]">{review.relativeTimeDescription}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expandable review text */}
                  <div 
                    className="cursor-pointer"
                    onClick={() => setExpandedReviewText(!expandedReviewText)}
                  >
                    <p className={`text-white font-medium leading-relaxed transition-all duration-300 ${expandedReviewText && idx === activeReviewIndex ? '' : 'line-clamp-2'}`}>
                      "{review.text}"
                    </p>
                    {review.text.length > 80 && (
                      <button className="text-white/50 text-xs font-bold mt-1">
                        {expandedReviewText && idx === activeReviewIndex ? 'less' : 'more'}
                      </button>
                    )}
                  </div>
                  
                  {/* Link to see full review on Google - only when expanded */}
                  {expandedReviewText && idx === activeReviewIndex && (
                    <a 
                      href={googleReviewsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-white/70 text-xs font-medium hover:text-white transition-colors mt-3"
                    >
                      <span>See full review on Google</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  
                  {/* Swipe hint - shows on all reviews except last */}
                  {idx < sortedReviews.length - 1 && idx === activeReviewIndex && !expandedReviewText && (
                    <div className="mt-4 flex flex-col items-center animate-bounce">
                      <ChevronUp className="w-6 h-6 text-white/60" />
                      <span className="text-white/60 text-xs font-medium">Swipe for more</span>
                    </div>
                  )}
                  
                  {/* Last review indicator */}
                  {idx === sortedReviews.length - 1 && idx === activeReviewIndex && !expandedReviewText && (
                    <div className="mt-4 flex flex-col items-center">
                      <span className="text-white/50 text-xs font-medium">Last review</span>
                    </div>
                  )}
                </div>

                {/* Progress dots */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  {sortedReviews.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeReviewIndex ? 'bg-white h-4' : 'bg-white/40'}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPartnerExperience ? (
        <>
          <div
            className="px-4 bg-black flex items-center justify-between shrink-0"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 12px)',
              minHeight: 'calc(56px + env(safe-area-inset-top))',
            }}
          >
            {!window.location.pathname.startsWith('/r/') && onBack ? (
              <button onClick={onBack} className="p-1.5 -ml-1 rounded-full text-white/70 active:text-white transition-colors">
                <ChevronLeft size={22} />
              </button>
            ) : <div className="w-8" />}
            <button className="flex items-center gap-1 max-w-[55vw]">
              <h1 className="text-[15px] font-bold text-white truncate">{restaurant.name}</h1>
              <ChevronDown size={15} className="text-white/40 shrink-0" />
            </button>
            <button onClick={handleShareRestaurant} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-white text-xs font-semibold active:bg-white/20 transition-all">
              <Share2 size={12} />
              Share
            </button>
          </div>

          <div className="relative h-[52vh] shrink-0 bg-zinc-900">
            {heroDish?.videoUrl ? (
              <video
                src={getCDNUrl(heroDish.videoUrl)}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col items-center justify-center">
                <Video size={48} className="text-zinc-600 mb-3" />
                <p className="text-zinc-500 text-sm font-medium">Hero video coming soon</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <div className="inline-flex items-center border border-orange-500/80 rounded-full px-2.5 py-0.5 mb-2.5">
                <span className="text-orange-400 text-[10px] font-bold uppercase tracking-widest">Weekly Bestseller</span>
              </div>
              <h2 className="text-2xl font-black text-white leading-tight mb-1.5">{heroDish?.name || restaurant.name}</h2>
              {heroDish?.description && (
                <p className="text-white/55 text-sm leading-snug line-clamp-2 mb-4">{heroDish.description}</p>
              )}
              <button
                onClick={handleSeeMoreFromHero}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-white text-sm font-semibold active:bg-white/20 transition-all"
              >
                See more
                <ChevronRight size={15} className="text-orange-400" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="relative h-[45vh] shrink-0">
          {isStandalone && (restaurant as any).banner_images && (restaurant as any).banner_images.length > 0 ? (
            <BannerSlider images={(restaurant as any).banner_images} />
          ) : restaurant.mainPhotoUrl ? (
            <img src={restaurant.mainPhotoUrl} className="w-full h-full object-cover" alt={restaurant.name} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col items-center justify-center">
              <Camera size={48} className="text-zinc-600 mb-3" />
              <p className="text-zinc-500 text-sm font-medium">Cover photo coming soon</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          <div className="absolute top-14 left-6 right-6 flex justify-between">
            {!window.location.pathname.startsWith('/r/') && onBack && (
              <button onClick={onBack} className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform">
                <ChevronLeft size={24}/>
              </button>
            )}
            {!isStandalone && (
              <div className="flex gap-3">
                {restaurant.isSubscribed && !isPartnerExperience && (
                  <div className="w-11 h-11 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center">
                    <Crown size={18} fill="currentColor" />
                  </div>
                )}
                <button onClick={onToggleSave} className={`p-3 backdrop-blur-md rounded-full transition-all active:scale-90 ${isSaved ? 'bg-orange-500 text-white' : 'bg-black/20 text-white'}`}>
                  <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
                </button>
              </div>
            )}
          </div>

          <div className={`absolute bottom-6 left-6 right-6 ${isPartnerExperience ? 'text-center' : ''}`}>
            {!isPartnerExperience && (
              <h1 className="text-3xl font-black text-white tracking-tight mb-1 drop-shadow-lg">{restaurant.name}</h1>
            )}
            {!isStandalone && !isPartnerExperience && (
              <p className="text-white/70 text-sm font-medium">{restaurant.cuisine}</p>
            )}
          </div>
        </div>
      )}

      <div className={`${isPartnerExperience ? 'px-4 pt-3 pb-4 bg-black' : 'p-6 bg-white'} space-y-3 flex-1 ${isPartnerExperience ? '' : 'rounded-t-[32px]'} ${isPartnerExperience ? '' : '-mt-6'} relative z-10`}>
        
        {/* MENU VIDEOS - Clean grid */}
        {restaurant.isSubscribed && (
          <section>
            {!isPartnerExperience && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={20} className="text-orange-500" />
                  <h2 className="text-lg font-bold text-zinc-900">Video Menus</h2>
                </div>
                <p className="text-xs text-zinc-500 mb-3">Tap any video to see the dish in detail.</p>
              </>
            )}

            
            {menuFeedItems.length === 0 && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                  <PlayCircle size={32} className="text-zinc-400" />
                </div>
                <p className="text-zinc-500 font-medium">Menu videos coming soon!</p>
                <p className="text-zinc-400 text-xs mt-1">This restaurant is setting up their video menu.</p>
              </div>
            )}

            {/* Category Pills - text only */}
            {menuFeedItems.length > 0 && (
              <div className={`${isPartnerExperience ? 'sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-zinc-800 -mx-4 px-4 py-1 mb-2 relative overflow-hidden' : ''}`}>
              <div className={`flex gap-2 overflow-x-auto ${isPartnerExperience ? 'pb-1 -mx-4 px-4 mb-1' : 'pb-3 -mx-6 px-6 mb-3'} scrollbar-hide`}>
                {videoCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedVideoCategory(category)}
                    className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                      selectedVideoCategory === category
                        ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm shadow-orange-200/70'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
                <a
                  href={fullMenuPath}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm shadow-orange-200/70"
                >
                  Full Menu
                </a>
              </div>
              {isPartnerExperience && <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/95 to-transparent pointer-events-none z-10" />}
              </div>
            )}

            {isPartnerExperience ? (
              <div className="space-y-5">
                {isAllVideoCategory && recommendedItems.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-white">Recommended <span className="text-orange-500">*</span></h4>
                      <a
                        href={`${menuFeedBasePath}?dish=${recommendedItems[0].id}${recommendedItems[0].category ? `&category=${encodeURIComponent(recommendedItems[0].category)}` : ''}`}
                        className="text-xs font-bold text-orange-500"
                      >
                        View all
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {recommendedItems.map((dish, index) => {
                        const feedIndex = filteredMenuItems.findIndex((item) => item.id === dish.id);
                        return (
                          <button
                            key={`recommended-${dish.id}`}
                            className="relative aspect-[3/4] rounded-2xl border border-white/10 overflow-hidden bg-black group text-left active:scale-[0.985] transition-transform duration-200"
                            onClick={() => openDishFromGrid(dish, feedIndex >= 0 ? feedIndex : index)}
                          >
                            {dish.videoUrl ? (
                              <>
                                <img
                                  src={dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  alt={dish.name}
                                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'; }}
                                />
                                <video
                                  ref={(el) => {
                                    gridVideoRefs.current[feedIndex >= 0 ? feedIndex : index] = el;
                                  }}
                                  src={getCDNUrl(dish.videoUrl)}
                                  className={`absolute inset-0 w-full h-full object-cover group-active:scale-105 transition-all duration-300 ${gridMediaLoaded.has(dish.id) ? 'opacity-100' : 'opacity-0'}`}
                                  autoPlay
                                  muted
                                  playsInline
                                  preload="auto"
                                  poster={dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                  onPlay={(e) => {
                                    e.currentTarget.pause();
                                    e.currentTarget.currentTime = 0.1;
                                    setGridMediaLoaded(prev => new Set(prev).add(dish.id));
                                  }}
                                  onLoadedData={(e) => {
                                    e.currentTarget.currentTime = 0.1;
                                    setGridMediaLoaded(prev => new Set(prev).add(dish.id));
                                  }}
                                  onError={() => {
                                    setGridMediaLoaded(prev => { const n = new Set(prev); n.delete(dish.id); return n; });
                                  }}
                                />
                              </>
                            ) : (
                              <img
                                src={dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                className="absolute inset-0 w-full h-full object-cover"
                                alt={dish.name}
                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'; }}
                              />
                            )}
                            {dish.videoUrl && (
                              <div className="absolute top-2 right-2 rounded-full bg-orange-500/90 backdrop-blur-sm px-2 py-1 flex items-center gap-1">
                                <Video size={10} className="text-white/90" />
                                <span className="text-[10px] font-semibold text-white/90 leading-none">Video</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent flex flex-col justify-end p-2.5">
                              <p className="text-white font-semibold text-xs leading-tight">{dish.name}</p>
                              {dish.price && <p className="text-orange-200 text-[11px] mt-0.5 font-semibold">${Number(dish.price).toFixed(2)}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {menuCategorySections.map((group) => (
                  <div key={`group-${group.category}`} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-white">{group.category}</h4>
                      {isAllVideoCategory && (
                        <a
                          href={`${menuFeedBasePath}?dish=${group.items[0].id}&category=${encodeURIComponent(group.category || '')}`}
                          className="text-xs font-bold text-orange-500"
                        >
                          View all
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {group.items.map((dish) => {
                        const feedIndex = filteredMenuItems.findIndex((item) => item.id === dish.id);
                        return (
                          <button
                            key={`group-item-${dish.id}`}
                            className="relative aspect-[3/4] rounded-2xl border border-white/10 overflow-hidden bg-black group text-left active:scale-[0.985] transition-transform duration-200"
                            onClick={() => openDishFromGrid(dish, feedIndex >= 0 ? feedIndex : 0)}
                          >
                            {dish.videoUrl ? (
                              <>
                                <img
                                  src={dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  alt={dish.name}
                                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'; }}
                                />
                                <video
                                  ref={(el) => {
                                    gridVideoRefs.current[feedIndex >= 0 ? feedIndex : 0] = el;
                                  }}
                                  src={getCDNUrl(dish.videoUrl)}
                                  className={`absolute inset-0 w-full h-full object-cover group-active:scale-105 transition-all duration-300 ${gridMediaLoaded.has(dish.id) ? 'opacity-100' : 'opacity-0'}`}
                                  autoPlay
                                  muted
                                  playsInline
                                  preload="auto"
                                  poster={dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                  onPlay={(e) => {
                                    e.currentTarget.pause();
                                    e.currentTarget.currentTime = 0.1;
                                    setGridMediaLoaded(prev => new Set(prev).add(dish.id));
                                  }}
                                  onLoadedData={(e) => {
                                    e.currentTarget.currentTime = 0.1;
                                    setGridMediaLoaded(prev => new Set(prev).add(dish.id));
                                  }}
                                  onError={() => {
                                    setGridMediaLoaded(prev => { const n = new Set(prev); n.delete(dish.id); return n; });
                                  }}
                                />
                              </>
                            ) : (
                              <img
                                src={dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
                                className="absolute inset-0 w-full h-full object-cover"
                                alt={dish.name}
                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'; }}
                              />
                            )}
                            {dish.videoUrl && (
                              <div className="absolute top-2 right-2 rounded-full bg-orange-500/90 backdrop-blur-sm px-2 py-1 flex items-center gap-1">
                                <Video size={10} className="text-white/90" />
                                <span className="text-[10px] font-semibold text-white/90 leading-none">Video</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent flex flex-col justify-end p-2.5">
                              <p className="text-white font-semibold text-xs leading-tight">{dish.name}</p>
                              {dish.price && <p className="text-orange-200 text-[11px] mt-0.5 font-semibold">${Number(dish.price).toFixed(2)}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
                {filteredMenuItems.map((dish, index) => {
                  const prevDish = index > 0 ? filteredMenuItems[index - 1] : null;
                  const showCategoryHeader = selectedVideoCategory === 'All' && dish.category !== prevDish?.category;
                  const categoryItemCount = filteredMenuItems.filter((item) => item.category === dish.category).length;
                  return (
                  <React.Fragment key={dish.id}>
                    {showCategoryHeader && (
                      <div className="col-span-2 rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/25 px-4 py-3">
                        <h4 className="text-2xl font-black leading-tight text-zinc-900">{dish.category}</h4>
                        <p className="text-sm text-zinc-500">{categoryItemCount} items</p>
                      </div>
                    )}
                  <button 
                    key={`btn-${dish.id}`} 
                    className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 group text-left transition-transform duration-200"
                    onClick={() => openDishFromGrid(dish, index)}
                  >
                    {!gridMediaLoaded.has(dish.id) && (
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200" />
                    )}
                    {/* Video with 3-second auto-play cycles */}
                    {dish.videoUrl ? (
                      <video 
                        ref={(el) => {
                          gridVideoRefs.current[index] = el;
                        }}
                        src={getCDNUrl(dish.videoUrl)} 
                        className="w-full h-full object-cover group-active:scale-105 transition-all duration-300"
                        muted 
                        playsInline
                        preload="metadata"
                        poster={dish.thumbnailUrl || restaurant.mainPhotoUrl}
                        onLoadedMetadata={() => {
                          setGridMediaLoaded(prev => new Set(prev).add(dish.id));
                        }}
                        onLoadedData={(e) => {
                          e.currentTarget.currentTime = 0.1;
                          setGridMediaLoaded(prev => new Set(prev).add(dish.id));
                        }}
                        onError={() => {
                          setGridMediaLoaded(prev => new Set(prev).add(dish.id));
                        }}
                      />
                    ) : (
                      <img 
                        src={dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl} 
                        className={`w-full h-full object-cover group-active:scale-105 transition-all duration-300 ${gridMediaLoaded.has(dish.id) ? 'opacity-100' : 'opacity-0'}`}
                        alt={dish.name}
                        onLoad={() => setGridMediaLoaded(prev => new Set(prev).add(dish.id))}
                        onError={(e) => {
                          e.currentTarget.src = restaurant.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
                          setGridMediaLoaded(prev => new Set(prev).add(dish.id));
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2.5">
                      <p className="text-white font-semibold text-xs leading-tight">{dish.name}</p>
                      {dish.price && <p className="text-white/90 text-[11px] mt-0.5 font-semibold">${Number(dish.price).toFixed(2)}</p>}
                    </div>
                    {viewCounts.get(dish.id) !== undefined && viewCounts.get(dish.id)! > 0 && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                        <Eye size={10} className="text-white/80" />
                        <span className="text-white/80 text-[9px] font-medium">{viewCounts.get(dish.id)}</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <div className="w-7 h-7 rounded-full h-7 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <PlayCircle size={14} className="text-white" fill="currentColor" />
                      </div>
                      {restaurant.enable_ordering_button && (dish.dish_order_url || restaurant.ordering_url) && (
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOrderNow(dish);
                          }}
                          className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors"
                        >
                          <ShoppingBag size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                  </React.Fragment>
                  );
                })}
              </div>
            )}

            {shouldShowPhotoContinuation && (
              <div className="mt-5 rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/25 p-4 shadow-[0_8px_20px_rgba(251,146,60,0.06)]">
                {selectedVideoCategory !== 'All' && (
                  <div className="mb-3 flex items-start justify-end gap-3">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">Photos</span>
                  </div>
                )}

                <div className="space-y-5">
                  {photoContinuationGroups.map((group, groupIndex) => (
                    <div key={`photo-group-${group.category || 'all'}`} className="space-y-2.5">
                      {selectedVideoCategory === 'All' && (
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-2xl font-black text-zinc-900">{group.category}</h4>
                            <p className="text-sm text-zinc-500">{group.items.length} items</p>
                          </div>
                          {groupIndex === 0 && (
                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">Photos</span>
                          )}
                        </div>
                      )}

                      {group.items.map((dish, photoIndex) => (
                        <button
                          key={`photo-preview-${dish.id}`}
                          onClick={() => openDishFromGrid(dish, filteredMenuItems.length + photoIndex)}
                          className="w-full text-left flex items-center gap-3 rounded-xl border border-zinc-100 bg-white p-2.5"
                        >
                          <img
                            src={dish.photoUrl || dish.thumbnailUrl || restaurant.mainPhotoUrl}
                            alt={dish.name}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-zinc-900">{dish.name}</p>
                            {dish.description && <p className="line-clamp-1 text-xs text-zinc-500">{dish.description}</p>}
                          </div>
                          {dish.price && <span className="text-sm font-black text-zinc-800">${Number(dish.price).toFixed(2)}</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Your Picks - Card style */}
        {savedDishIds.size > 0 && (
          <a 
            href={(() => {
              const _slug = (restaurant as any).slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const _isDemo = window.location.pathname.startsWith('/demo/');
              const _prefix = _isDemo ? '/demo/' : isStandalone ? '/r/' : '/';
              return `${_prefix}${_slug}/saved`;
            })()}
            className="w-full bg-gradient-to-br from-white via-white to-orange-50/25 rounded-2xl border border-orange-100 p-4 flex items-center justify-between shadow-[0_8px_20px_rgba(251,146,60,0.06)] active:brightness-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center shadow-sm shadow-orange-200/70">
                <Bookmark size={16} className="text-white" fill="currentColor" />
              </div>
              <span className="text-base font-bold text-zinc-900">Your Picks</span>
              <span className="text-sm text-orange-500 font-medium">({savedDishIds.size})</span>
            </div>
            <div className="flex items-center gap-1 text-orange-500">
              <span className="text-xs font-semibold">See more</span>
              <ChevronRight size={16} />
            </div>
          </a>
        )}

        {/* FULL MENU Button */}
        <a
          href={fullMenuPath}
          className={`w-full flex items-center justify-center gap-2 font-semibold text-sm py-3 rounded-xl active:brightness-95 transition-all ${
            isPartnerExperience
              ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm shadow-orange-300/30'
              : 'bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-2xl border border-orange-400/50 p-4 text-base shadow-md shadow-orange-200/70'
          }`}
        >
          <UtensilsCrossed size={16} />
          <span>Full Menu</span>
        </a>

        {/* Phone - Card style */}
        {!isPartnerExperience && restaurant.phone && (
          <a 
            href={`tel:${restaurant.phone}`}
            onClick={() => trackAnalyticsEvent({ eventType: 'phone_call', restaurantId: restaurant.id }).catch(() => {})}
            className="w-full bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-3 active:bg-zinc-50 transition-colors"
          >
            <Phone size={20} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm font-medium text-zinc-700 flex-1">{restaurant.phone}</p>
            <ChevronRight size={16} className="text-zinc-400" />
          </a>
        )}

        {/* Secondary actions row */}
        {isPartnerExperience ? (
          <>
            <div className="flex gap-2.5">
              {restaurant.openingHours && restaurant.openingHours.length > 0 && (
                <button
                  onClick={() => setShowOpeningHours(!showOpeningHours)}
                  className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm font-semibold active:bg-zinc-800 transition-all"
                >
                  <Clock size={15} className="text-orange-400 shrink-0" />
                  <span className="truncate">Hours</span>
                  <ChevronDown size={13} className={`ml-auto text-zinc-500 transition-transform shrink-0 ${showOpeningHours ? 'rotate-180' : ''}`} />
                </button>
              )}
              <button
                onClick={handleShareRestaurant}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl py-3 text-white text-sm font-semibold active:bg-zinc-800 transition-all"
              >
                <Share2 size={15} className="text-zinc-400" />
                Share
              </button>
            </div>
            {showOpeningHours && restaurant.openingHours && restaurant.openingHours.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 space-y-1.5">
                {restaurant.openingHours.map((hours, idx) => {
                  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  const isToday = hours.toLowerCase().startsWith(today.toLowerCase());
                  return (
                    <p key={idx} className={`text-sm ${isToday ? 'font-bold text-orange-400' : 'text-zinc-400'}`}>
                      {hours}
                    </p>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {restaurant.openingHours && restaurant.openingHours.length > 0 && (
              <div className="w-full bg-gradient-to-br from-white via-white to-orange-50/20 rounded-2xl border border-orange-100 p-4 shadow-[0_8px_20px_rgba(251,146,60,0.06)]">
                <button
                  onClick={() => setShowOpeningHours(!showOpeningHours)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-orange-500 flex-shrink-0" />
                    <span className="text-base font-bold text-zinc-900">Opening Hours</span>
                  </div>
                  <ChevronRight size={18} className={`text-zinc-400 transition-transform ${showOpeningHours ? 'rotate-90' : ''}`} />
                </button>
                {showOpeningHours && (
                  <div className="space-y-1.5 pl-8 mt-3">
                    {restaurant.openingHours.map((hours, idx) => {
                      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                      const isToday = hours.toLowerCase().startsWith(today.toLowerCase());
                      return (
                        <p key={idx} className={`text-sm ${isToday ? 'font-bold text-orange-600' : 'text-zinc-600'}`}>
                          {hours}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <a
                href={restaurant.googleMapsUrl}
                target="_blank"
                onClick={() => {
                  trackEvent({ eventType: 'directions_click', restaurantId: restaurant.id });
                  trackAnalyticsEvent({ eventType: 'directions_click', restaurantId: restaurant.id }).catch(() => {});
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 text-white font-semibold py-3 rounded-xl text-sm active:scale-95 transition-all"
              >
                <Navigation size={14} fill="currentColor" /> Directions
              </a>
              {restaurant.website && (
                <a href={restaurant.website} target="_blank" className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 text-zinc-700 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-all">
                  <Globe size={14} /> Website
                </a>
              )}
            </div>
            <button
              onClick={handleShareRestaurant}
              className="w-full flex items-center justify-center gap-2 bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-all"
            >
              <Share2 size={14} /> Share
            </button>
          </>
        )}

        {/* Non-subscriber menu preview */}
        {!restaurant.isSubscribed && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight">Menu Preview</h2>
              <span className="flex items-center gap-1 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                <Camera size={14}/> Photos
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {restaurant.dishes.slice(0, 4).map((dish) => (
                <div key={dish.id} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-50">
                  <img src={dish.thumbnailUrl || restaurant.mainPhotoUrl} className="w-full h-full object-cover" alt={dish.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3">
                    <p className="text-white font-bold text-sm">{dish.name}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                  <Crown size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-orange-900 font-bold text-sm mb-1">Own this restaurant?</p>
                  <p className="text-orange-700 text-xs mb-3">Add videos and attract more customers.</p>
                  <a
                    href="/become-a-partner"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] uppercase tracking-widest rounded-lg active:scale-95 transition-transform"
                  >
                    Become a Partner →
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Disclaimer for app */}
        <div className="py-2 px-2 space-y-2">
          {(isStandalone || isPartnerExperience) ? (
            <>
              <div className="flex flex-col items-center gap-0.5 pt-1">
                <span className="text-[9px] text-zinc-400">Powered by</span>
                <span className="text-sm font-bold text-zinc-700">MenuLove</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
                The information displayed is publicly available data provided by Google Maps. MenuLove is an independent discovery platform. We do not represent, endorse, or guarantee any establishment. Please verify details directly with the business.
              </p>
              <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
                If you are the owner of this business and wish to update or remove your listing from our platform,{' '}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRequestRemoval) {
                      onRequestRemoval(restaurant.name, restaurant.id);
                    }
                  }}
                  className="text-orange-500 underline font-medium cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  click here to request removal
                </span>.
              </p>
              <div className="flex items-center justify-center gap-1 pt-1">
                <span className="text-[9px] text-zinc-300">Powered by</span>
                <span className="text-[9px] text-zinc-400 font-semibold">Google</span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default RestaurantProfile;
