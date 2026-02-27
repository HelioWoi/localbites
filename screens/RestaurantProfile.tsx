import React, { useState, useRef, useEffect } from 'react';
import { Restaurant, Dish, Review } from '../types';
import { ChevronLeft, Globe, MapPin, Navigation, Bookmark, PlayCircle, Camera, X, Crown, Play, Pause, Volume2, VolumeX, Star, ChevronRight, ChevronUp, ExternalLink, Home, Search, MessageSquare, Filter, Clock, Heart, Trash2, Phone, Sparkles, UtensilsCrossed, Video, Share2 } from 'lucide-react';
import BannerSlider from '../components/BannerSlider';
import { getPlaceDetails, textSearchRestaurants } from '../services/googlePlacesProxy';
import { trackEvent } from '../services/eventsService';

interface RestaurantProfileProps {
  restaurant: Restaurant;
  onBack: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  openReviews?: boolean;
  onNavigateToPartner?: () => void;
  onOpenAI?: () => void;
  onRequestRemoval?: (name: string, id: string) => void;
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
  
  // Reload saved dishes when component mounts (e.g., returning from menu page)
  useEffect(() => {
    console.log('[RestaurantProfile] Component mounted, reloading saved dishes');
    const updated = getSavedDishes(restaurant.id);
    console.log('[RestaurantProfile] Loaded saved dishes:', Array.from(updated));
    setSavedDishIds(updated);
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
      const needsReviews = !restaurant.reviews || restaurant.reviews.length === 0;
      
      console.log('[RestaurantProfile] Restaurant ID:', restaurant.id);
      console.log('[RestaurantProfile] Is Google restaurant:', isGoogleRestaurant);
      console.log('[RestaurantProfile] Needs reviews:', needsReviews);
      
      if (!needsReviews) return;
      
      setLoadingReviews(true);
      try {
        let placeId = isGoogleRestaurant ? restaurant.id : null;
        
        // For partner restaurants, find Google Place ID by name search
        if (!placeId && restaurant.name) {
          console.log('[RestaurantProfile] Partner restaurant - searching Google for:', restaurant.name);
          const searchQuery = restaurant.address 
            ? `${restaurant.name} ${restaurant.address}` 
            : restaurant.name;
          const searchResults = await textSearchRestaurants(0, 0, 50000, searchQuery);
          if (searchResults.length > 0) {
            placeId = searchResults[0].id;
            console.log('[RestaurantProfile] Found Google Place ID:', placeId);
            // Also update rating/totalReviews from Google
            if (searchResults[0].rating) {
              restaurant.rating = searchResults[0].rating;
              restaurant.totalReviews = searchResults[0].totalReviews || 0;
              // Save to DB so feed shows real values
              const { supabase } = await import('../lib/supabase');
              await supabase
                .from('partners')
                .update({ 
                  rating: searchResults[0].rating, 
                  total_reviews: searchResults[0].totalReviews || 0 
                })
                .eq('id', restaurant.id);
              console.log('[RestaurantProfile] Saved Google rating to DB:', searchResults[0].rating, searchResults[0].totalReviews);
            }
          }
        }
        
        if (placeId) {
          console.log('[RestaurantProfile] Fetching reviews for:', placeId);
          const details = await getPlaceDetails(placeId);
          console.log('[RestaurantProfile] Got details:', details);
          
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
  
  // Auto-play videos in 3-second cycles
  useEffect(() => {
    const playTimers = new Map<HTMLVideoElement, NodeJS.Timeout>();

    const playVideoCycle = (video: HTMLVideoElement) => {
      // Reset to start
      video.currentTime = 0;
      
      // Play for 3 seconds
      video.play().catch(() => {});
      
      // Pause after 3 seconds and schedule next cycle
      const timer = setTimeout(() => {
        video.pause();
        
        // Wait a moment and start next cycle
        const nextCycleTimer = setTimeout(() => {
          playVideoCycle(video);
        }, 100); // Small delay before next cycle
        
        playTimers.set(video, nextCycleTimer);
      }, 3000);
      
      playTimers.set(video, timer);
    };

    // Start cycles for all videos
    gridVideoRefs.current.forEach((video) => {
      if (video) {
        playVideoCycle(video);
      }
    });

    return () => {
      // Cleanup all timers
      playTimers.forEach((timer) => clearTimeout(timer));
      playTimers.clear();
      
      // Pause all videos
      gridVideoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
        }
      });
    };
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
      
      if (isStandalone) {
        // QR code standalone - navigate to /r/:slug/menu
        window.location.href = `/r/${slug}/menu${dishId ? `?dish=${dishId}` : ''}`;
      } else {
        // App feed - navigate to /:slug/menu (no /r/ prefix)
        window.location.href = `/${slug}/menu${dishId ? `?dish=${dishId}` : ''}`;
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
                  src={dish.videoUrl}
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
          {!isStandalone && (
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
                  href={`${isStandalone ? '/r/' : '/'}${restaurant.slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/full-menu`}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 flex items-center gap-1.5"
                >
                  Full Menu
                  <ChevronRight size={14} />
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
              {filteredVideos.map((dish, index) => (
                <button 
                  key={dish.id} 
                  className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 group text-left"
                  onClick={() => openVideoReels(index)}
                >
                  {/* Video with 3-second auto-play cycles */}
                  {dish.videoUrl ? (
                    <video 
                      ref={(el) => (gridVideoRefs.current[index] = el)}
                      src={dish.videoUrl} 
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
                  <div className="absolute top-2 right-2 w-7 h-7 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <PlayCircle size={14} className="text-white" fill="currentColor" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Your Picks - Card style */}
        {savedDishIds.size > 0 && (
          <a 
            href={isStandalone 
              ? `/r/${(restaurant as any).slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/saved`
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

        {/* REVIEWS - Card style */}
        {(restaurant.rating || sortedReviews.length > 0) && (
          <button 
            onClick={() => sortedReviews.length > 0 && setShowReviewsReel(true)}
            className="w-full bg-white rounded-2xl border border-zinc-200 p-4 flex items-center justify-between active:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Star size={20} className="text-amber-500" fill="currentColor" />
              <span className="text-base font-bold text-zinc-900">{restaurant.rating || '4.5'}</span>
              <span className="text-sm text-zinc-400">({restaurant.totalReviews || sortedReviews.length} reviews)</span>
            </div>
            {sortedReviews.length > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <span className="text-xs font-semibold">See more</span>
                <ChevronRight size={16} />
              </div>
            )}
          </button>
        )}

        {/* Phone - Card style */}
        {restaurant.phone && (
          <a 
            href={`tel:${restaurant.phone}`}
            className="w-full bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-3 active:bg-zinc-50 transition-colors"
          >
            <Phone size={20} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm font-medium text-zinc-700 flex-1">{restaurant.phone}</p>
            <ChevronRight size={16} className="text-zinc-400" />
          </a>
        )}

        {/* Opening Hours - Card style */}
        {restaurant.openingHours && restaurant.openingHours.length > 0 && (
          <div className="w-full bg-white rounded-2xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Clock size={20} className="text-orange-500 flex-shrink-0" />
              <span className="text-base font-bold text-zinc-900">Opening Hours</span>
            </div>
            <div className="space-y-1.5 pl-8">
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
          </div>
        )}

        {/* Quick action buttons - Compact */}
        {!isStandalone && (
          <div className="flex gap-2">
            <a 
              href={restaurant.googleMapsUrl} 
              target="_blank" 
              onClick={() => {
                trackEvent({ 
                  eventType: 'directions_click',
                  restaurantId: restaurant.id 
                });
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
        )}

        {/* Share button */}
        <button
          onClick={async () => {
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

        {/* Payment info for QR code OR Disclaimer for app */}
        <div className="py-4 px-2 space-y-3">
          {isStandalone ? (
            <>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-zinc-900 mb-1">Payment</p>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Save your favorite dishes and show at the counter for payment.
                </p>
              </div>
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
