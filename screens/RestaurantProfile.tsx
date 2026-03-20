import React, { useState, useRef, useEffect } from 'react';
import { Restaurant, Dish, Review } from '../types';
import { ChevronLeft, Globe, MapPin, Navigation, Bookmark, PlayCircle, Camera, X, Crown, Play, Pause, Volume2, VolumeX, Star, ChevronRight, ChevronUp, ExternalLink, Home, Search, MessageSquare, Filter, Clock, Heart, Trash2, Phone, Sparkles, UtensilsCrossed, Video, Share2, ShoppingBag, Eye } from 'lucide-react';
import BannerSlider from '../components/BannerSlider';
import { getPlaceDetails, textSearchRestaurants } from '../services/googlePlacesProxy';
import { trackEvent } from '../services/eventsService';
import { trackAnalyticsEvent } from '../services/analyticsV2Service';
import { getMenuItemViewCounts } from '../services/partnerAnalyticsService';
import { getCDNUrl } from '../utils/cdnHelper';

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
      if (params.get('qr') === '1') {
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
  const [showOpeningHours, setShowOpeningHours] = useState(false);
  
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
        // Fallback to mock data
        const mockCounts = new Map<string, number>();
        restaurant.dishes.forEach((dish) => {
          mockCounts.set(dish.id, Math.floor(Math.random() * 450) + 50);
        });
        setViewCounts(mockCounts);
      }
    };
    loadViewCounts();
  }, [restaurant.id]);
  
  // Google reviews state (for non-partner restaurants)
  const [googleReviews, setGoogleReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const dishesWithVideo = restaurant.dishes.filter(d => d.videoUrl);
  const savedDishes = restaurant.dishes.filter(d => savedDishIds.has(d.id));
  
  // Video menu categories
  const [selectedVideoCategory, setSelectedVideoCategory] = useState<string>('All');
  const videoCategories = ['All', ...new Set(dishesWithVideo.map(d => d.category).filter(Boolean))];
  const filteredVideos = selectedVideoCategory === 'All' 
    ? dishesWithVideo 
    : dishesWithVideo.filter(d => d.category === selectedVideoCategory);
  
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
          console.log('[RestaurantProfile] Partner location:', restaurant.latitude, restaurant.longitude);
          
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
              restaurant.latitude || 0, 
              restaurant.longitude || 0, 
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
            // Select best candidate by distance to partner location
            const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
              const R = 6371; // Earth radius in km
              const dLat = (lat2 - lat1) * Math.PI / 180;
              const dLng = (lng2 - lng1) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              return R * c;
            };
            
            const candidatesWithDistance = uniqueCandidates.map(c => ({
              ...c,
              distanceKm: calculateDistance(
                restaurant.latitude || 0,
                restaurant.longitude || 0,
                c.latitude || 0,
                c.longitude || 0
              )
            }));
            
            // Sort by distance (closest first)
            candidatesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
            
            const bestCandidate = candidatesWithDistance[0];
            placeId = bestCandidate.id;
            
            console.log('[RestaurantProfile] Best candidate selected:');
            console.log('  - Place ID:', placeId);
            console.log('  - Name:', bestCandidate.name);
            console.log('  - Distance:', bestCandidate.distanceKm.toFixed(2), 'km');
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
  }, [filteredVideos]);
  
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
                  ref={el => videoRefs.current[idx] = el}
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

      <div className="relative h-[45vh] shrink-0">
        {/* QR Code route with banner images: show slider */}
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
        
        {/* Header buttons */}
        <div className="absolute top-14 left-6 right-6 flex justify-between">
          {/* Back button - Hidden on /r/ routes, shown on /demo/ routes, hidden when onBack is undefined (external link) */}
          {!window.location.pathname.startsWith('/r/') && onBack && (
            <button onClick={onBack} className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform">
              <ChevronLeft size={24}/>
            </button>
          )}
          {!isStandalone && (
            <div className="flex gap-3">
              {restaurant.isSubscribed && (
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
        
        {/* Restaurant info overlay */}
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl font-black text-white tracking-tight mb-1 drop-shadow-lg">{restaurant.name}</h1>
          {!isStandalone && (
            <p className="text-white/70 text-sm font-medium">{restaurant.cuisine}</p>
          )}
        </div>
      </div>

      <div className="p-6 space-y-3 flex-1 bg-white rounded-t-[32px] -mt-6 relative z-10">
        
        {/* MENU VIDEOS - Clean grid */}
        {restaurant.isSubscribed && (
          <section>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={20} className="text-orange-500" />
              <h2 className="text-lg font-bold text-zinc-900">Video Menus</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-3">Tap any video to see the dish in detail.</p>
            
            {dishesWithVideo.length === 0 && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                  <PlayCircle size={32} className="text-zinc-400" />
                </div>
                <p className="text-zinc-500 font-medium">Menu videos coming soon!</p>
                <p className="text-zinc-400 text-xs mt-1">This restaurant is setting up their video menu.</p>
              </div>
            )}

            {/* Category Pills - Desktop style for mobile */}
            {dishesWithVideo.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 -mx-6 px-6 scrollbar-hide mb-3">
                {videoCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedVideoCategory(category)}
                    className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                      selectedVideoCategory === category
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
                <a
                  href={`${window.location.pathname.startsWith('/demo/') ? '/demo/' : isStandalone ? '/r/' : '/'}${restaurant.slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/full-menu`}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 flex items-center gap-1.5"
                >
                  Full Menu
                  <ChevronRight size={14} />
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
              {filteredVideos.map((dish, index) => {
                // Find the correct index in the unfiltered dishesWithVideo array
                const realIndex = dishesWithVideo.findIndex(d => d.id === dish.id);
                return (
                <button 
                  key={dish.id} 
                  className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 group text-left"
                  onClick={() => openVideoReels(realIndex >= 0 ? realIndex : index)}
                >
                  {/* Video with 3-second auto-play cycles */}
                  {dish.videoUrl ? (
                    <video 
                      ref={(el) => (gridVideoRefs.current[index] = el)}
                      src={getCDNUrl(dish.videoUrl)} 
                      className="w-full h-full object-cover group-active:scale-105 transition-transform duration-300" 
                      muted 
                      playsInline
                      preload="metadata"
                      poster={dish.thumbnailUrl || restaurant.mainPhotoUrl}
                      onLoadedData={(e) => {
                        // Show first frame
                        e.currentTarget.currentTime = 0.1;
                      }}
                    />
                  ) : (
                    <img 
                      src={dish.thumbnailUrl || restaurant.mainPhotoUrl} 
                      className="w-full h-full object-cover group-active:scale-105 transition-transform duration-300" 
                      alt={dish.name}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2.5">
                    <p className="text-white font-semibold text-xs">{dish.name}</p>
                  </div>
                  {/* View counter - top left */}
                  {viewCounts.get(dish.id) !== undefined && viewCounts.get(dish.id)! > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                      <Eye size={10} className="text-white/80" />
                      <span className="text-white/80 text-[9px] font-medium">{viewCounts.get(dish.id)}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <div className="w-7 h-7 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
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
                );
              })}
            </div>
          </section>
        )}

        {/* Your Picks - Card style */}
        {savedDishIds.size > 0 && (
          <a 
            href={isStandalone 
              ? `/demo/${(restaurant as any).slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/saved`
              : `/${(restaurant as any).slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/saved`
            }
            className="w-full bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between active:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bookmark size={20} className="text-orange-500" fill="currentColor" />
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
          href={`${window.location.pathname.startsWith('/demo/') ? '/demo/' : isStandalone ? '/r/' : '/'}${restaurant.slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/full-menu`}
          className="w-full bg-orange-500 text-white rounded-2xl border border-orange-500 p-4 flex items-center justify-center gap-2 font-semibold text-base active:bg-orange-600 transition-colors"
        >
          <UtensilsCrossed size={20} />
          <span>Full Menu</span>
        </a>

        {/* Phone - Card style */}
        {restaurant.phone && (
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

        {/* Opening Hours - Collapsible Card */}
        {restaurant.openingHours && restaurant.openingHours.length > 0 && (
          <div className="w-full bg-white rounded-2xl border border-zinc-200 p-4">
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

        {/* Quick action buttons - Compact */}
        <div className="flex gap-2">
          <a 
            href={restaurant.googleMapsUrl} 
            target="_blank" 
            onClick={() => {
              trackEvent({ 
                eventType: 'directions_click',
                restaurantId: restaurant.id 
              });
              // Analytics V2: Track directions click
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

        {/* Share button */}
        <button
          onClick={async () => {
            // Analytics V2: Track share
            trackAnalyticsEvent({ eventType: 'share', restaurantId: restaurant.id }).catch(() => {});
            
            const slug = (restaurant as any).slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            // Public share link uses /restaurant-name (not /r/ - that's QR code only)
            const shareUrl = restaurant.isSubscribed 
              ? `${window.location.origin}/${slug}`
              : `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(restaurant.id)}`;
            const shareData = {
              title: restaurant.name,
              text: `Check out ${restaurant.name} on MenuLove!`,
              url: shareUrl,
            };
            if (navigator.share) {
              try { await navigator.share(shareData); } catch (e) { /* user cancelled */ }
            } else {
              await navigator.clipboard.writeText(shareUrl);
              alert('Link copied to clipboard!');
            }
          }}
          className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-zinc-700 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-all"
        >
          <Share2 size={14} /> Share
        </button>

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
        <div className="py-4 px-2 space-y-3">
          {isStandalone ? (
            <>
              <div className="flex flex-col items-center gap-1 pt-2">
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
