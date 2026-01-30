
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Restaurant, UserLocation } from './types';
import SplashScreen from './screens/SplashScreen';
import LocationSelector from './screens/LocationSelector';
import RestaurantProfile from './screens/RestaurantProfile';
import AdminDashboard from './screens/AdminDashboard';
import PartnerPortal from './screens/partner/PartnerPortal';
import RestaurantMenuLoader from './components/RestaurantMenuLoader';
import MediaContainer from './components/MediaContainer';
import FloatingFilters from './components/FloatingFilters';
import { getNearbyRestaurants } from './services/geminiService';
import { likeRestaurant, unlikeRestaurant, saveRestaurant, unsaveRestaurant, getUserLikes, getUserSaves, getAllLikesCounts } from './services/interactionService';
import { CUISINES, PRICES } from './constants';
import { Home, Search, MessageSquare, Filter, Bookmark, ExternalLink, Info, Loader2, X, ArrowRight, Globe, MapPin, ChevronUp, Crown, PlayCircle, Heart, Star, Clock } from 'lucide-react';

// Check if we're on the partner route
const isPartnerRoute = window.location.pathname === '/partner' || window.location.pathname.startsWith('/partner');

// Check if we're on a restaurant menu route (QR Code)
const isMenuRoute = window.location.pathname.startsWith('/r/');
const menuSlug = isMenuRoute ? window.location.pathname.replace('/r/', '') : null;

const App: React.FC = () => {
  // If on partner route, render Partner Portal
  if (isPartnerRoute) {
    return <PartnerPortal />;
  }

  // If on restaurant menu route (QR Code), render isolated menu page
  if (isMenuRoute && menuSlug) {
    return <RestaurantMenuLoader slug={menuSlug} />;
  }

  const [state, setState] = useState<AppState>('SPLASH');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeRestaurantIndex, setActiveRestaurantIndex] = useState(0);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ cuisine: 'All', price: '', openNow: true });
  const [showDishInfo, setShowDishInfo] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState<'cuisine' | 'price' | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showHeartAnimation, setShowHeartAnimation] = useState<string | null>(null);
  const [feedSwipeCount, setFeedSwipeCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showReviewsFeed, setShowReviewsFeed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openProfileReviews, setOpenProfileReviews] = useState(false);
  const [likesCounts, setLikesCounts] = useState<Map<string, number>>(new Map());
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  
  const feedRef = useRef<HTMLDivElement>(null);

  const isOverlayOpen = showDishInfo || !!showFilterModal || showSaved;
  const isExternalOverlayOpen = !!showFilterModal || showSaved;

  // Load user likes and saves from Supabase on mount
  useEffect(() => {
    const loadUserInteractions = async () => {
      const [likes, saves] = await Promise.all([getUserLikes(), getUserSaves()]);
      setLikedIds(likes);
      setSavedIds(saves);
    };
    loadUserInteractions();
  }, []);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.style.overflowY = isOverlayOpen ? 'hidden' : 'scroll';
  }, [isOverlayOpen]);

  // Auto-scroll feed after 5 animations (3s each)
  useEffect(() => {
    if (state !== 'FEED' || isLoading || restaurants.length === 0 || showDishInfo || isOverlayOpen) return;
    
    const hasMoreRestaurants = activeRestaurantIndex < restaurants.length - 1;
    if (!hasMoreRestaurants) return;

    const timeout = setTimeout(() => {
      // After 3s, auto-scroll to next restaurant
      if (feedRef.current) {
        const nextTop = (activeRestaurantIndex + 1) * window.innerHeight;
        feedRef.current.scrollTo({ top: nextTop, behavior: 'smooth' });
      }
    }, 5000); // 5s then switch
    
    return () => clearTimeout(timeout);
  }, [state, isLoading, restaurants.length, activeRestaurantIndex, showDishInfo, isOverlayOpen]);

  // Reset swipe count when changing restaurants
  useEffect(() => {
    setFeedSwipeCount(0);
  }, [activeRestaurantIndex]);

  const fetchRestaurants = useCallback(async (loc: UserLocation, f = filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getNearbyRestaurants(loc, f);
      setRestaurants(data);
      setActiveRestaurantIndex(0);
      if (feedRef.current) feedRef.current.scrollTo({ top: 0 });
      
      // Load likes counts for all restaurants
      if (data.length > 0) {
        const ids = data.map(r => r.id);
        const counts = await getAllLikesCounts(ids);
        setLikesCounts(counts);
      }
    } catch (e: any) {
      const message = typeof e?.message === 'string' && e.message.trim().length > 0
        ? e.message
        : 'Failed to load restaurants. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (location) fetchRestaurants(location);
  }, [location, fetchRestaurants]);

  const handleLocationSelect = (loc: UserLocation) => {
    setLocation(loc);
    setShowSaved(false);
    setState('FEED');
  };

  const handleFilterUpdate = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    if (location) fetchRestaurants(location, updated);
    setShowFilterModal(null);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    const itemHeight = window.innerHeight;
    const index = Math.round(scrollPos / itemHeight);
    if (index !== activeRestaurantIndex) {
      setActiveRestaurantIndex(index);
      setShowDishInfo(false);
    }
  };

  if (state === 'SPLASH') return <SplashScreen onFinish={() => setState('LOCATION_SELECTOR')} />;
  if (state === 'LOCATION_SELECTOR') return <LocationSelector onLocationSelect={handleLocationSelect} />;
  if (state === 'ADMIN') return <AdminDashboard onClose={() => setState('FEED')} />;
  
  if (state === 'PROFILE' && selectedRestaurant) {
    return (
      <RestaurantProfile 
        restaurant={selectedRestaurant} 
        onBack={() => {
          setState('FEED');
          setOpenProfileReviews(false);
        }} 
        isSaved={savedIds.has(selectedRestaurant.id)}
        onToggleSave={() => {
           const next = new Set(savedIds);
           if (next.has(selectedRestaurant.id)) next.delete(selectedRestaurant.id);
           else next.add(selectedRestaurant.id);
           setSavedIds(next);
        }}
        openReviews={openProfileReviews}
        onNavigateToPartner={() => setState('ADMIN')}
      />
    );
  }

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden select-none">
      {isLoading && restaurants.length > 0 && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-lg flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-6" />
          <h2 className="text-xl font-black text-zinc-900 tracking-tight mb-2">Analysing the neighbourhood...</h2>
          <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-zinc-400">Finding the best bites for you</p>
        </div>
      )}

      {/* Fixed Header - Top */}
      <div className={`fixed top-0 left-0 right-0 z-40 pointer-events-none px-5 pt-12 transition-opacity ${showDishInfo ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setState('LOCATION_SELECTOR')} className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
               <span className="text-[10px] font-black text-white">LB</span>
            </button>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Within 5km</span>
              <span className="text-sm font-bold text-white leading-none">{location?.name || 'Your Area'}</span>
            </div>
          </div>
          {/* Premium badge for subscribed restaurants */}
          {restaurants[activeRestaurantIndex]?.isSubscribed && (
            <div className="w-9 h-9 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg flex items-center justify-center">
              <Crown size={16} fill="currentColor" />
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-t border-white/10 px-6 py-4 pb-8">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button onClick={() => setState('LOCATION_SELECTOR')} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <Home size={24} />
          </button>
          <button onClick={() => setShowSearch(true)} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <Search size={24} />
          </button>
          <button onClick={() => setShowReviewsFeed(true)} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <img src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon%20review.png" alt="Reviews" className="w-6 h-6 opacity-60 hover:opacity-100" />
          </button>
          <button onClick={() => setShowFilterModal('cuisine')} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <Filter size={24} />
          </button>
          <button 
            onClick={() => setFilters(f => ({ ...f, openNow: !f.openNow }))}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${filters.openNow ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'}`}
          >
            <Clock size={14} />
            OPEN
          </button>
        </div>
      </div>

      {/* Saved Overlay */}
      {showSaved && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowSaved(false)}>
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <h3 className="text-xl font-black tracking-tight">Saved</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{savedIds.size} spots</span>
              </div>
              <button onClick={() => setShowSaved(false)} className="p-2 bg-zinc-100 rounded-full"><X size={20} /></button>
            </div>

            {Array.from(savedIds).length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Bookmark className="text-zinc-300" size={26} />
                </div>
                <h4 className="text-lg font-black text-zinc-900 mb-2">No saved places yet</h4>
                <p className="text-zinc-500 font-medium">Save a spot from the feed to keep it here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto">
                {Array.from(savedIds)
                  .map((id) => restaurants.find(r => r.id === id))
                  .filter(Boolean)
                  .map((res) => (
                    <div key={res!.id} className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-zinc-50 border border-zinc-100">
                      <button
                        onClick={() => {
                          setSelectedRestaurant(res!);
                          setShowSaved(false);
                          setState('PROFILE');
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-black text-zinc-900 leading-tight">{res!.name}</div>
                        <div className="text-[11px] font-bold text-zinc-500">{res!.distance}</div>
                      </button>
                      <button
                        onClick={() => {
                          const next = new Set(savedIds);
                          next.delete(res!.id);
                          setSavedIds(next);
                        }}
                        className="p-3 bg-white rounded-2xl border border-zinc-100 text-zinc-400 active:scale-95 transition-transform"
                        aria-label="Remove from saved"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={feedRef} className={`snap-container no-scrollbar bg-black ${isExternalOverlayOpen ? 'pointer-events-none' : ''}`} onScroll={handleScroll}>
        {isLoading && restaurants.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="snap-item">
              <div className="video-card shadow-none rounded-none md:rounded-[40px] border-none bg-zinc-100 overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
                <div className="absolute bottom-32 left-8 right-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-16 rounded-full bg-zinc-200 animate-pulse" />
                    <div className="h-5 w-20 rounded-full bg-zinc-200 animate-pulse" />
                  </div>
                  <div className="h-10 w-2/3 rounded-2xl bg-zinc-200 animate-pulse mb-2" />
                  <div className="h-5 w-48 rounded-xl bg-zinc-200/80 animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : restaurants.length > 0 ? (
          restaurants.map((res, i) => (
            <div key={res.id} className="snap-item">
              <div className={`video-card shadow-none rounded-none border-none bg-black transition-all duration-500 ease-out transform-gpu ${activeRestaurantIndex === i ? 'opacity-100 scale-100' : 'opacity-80 scale-[0.97]'}`}>
                <MediaContainer 
                  videoUrl={res.dishes[0]?.videoUrl} 
                  photoUrl={res.mainPhotoUrl}
                  isActive={activeRestaurantIndex === i && state === 'FEED' && !isLoading}
                  isSubscribed={res.isSubscribed}
                  onSwipeUp={() => feedRef.current?.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
                  onPartialSwipeUp={() => {
                    setSelectedRestaurant(res);
                    setState('PROFILE');
                  }}
                />
                
                <div className="absolute inset-0 cursor-pointer" onClick={() => {
                  const now = Date.now();
                  const lastTap = lastTapRef.current;
                  
                  // Double-tap to save
                  if (lastTap && lastTap.id === res.id && now - lastTap.time < 300) {
                    const next = new Set(savedIds);
                    if (!next.has(res.id)) {
                      next.add(res.id);
                      setSavedIds(next);
                      setShowHeartAnimation(res.id);
                      setTimeout(() => setShowHeartAnimation(null), 1000);
                    }
                    lastTapRef.current = null;
                    return;
                  }
                  
                  lastTapRef.current = { id: res.id, time: now };
                  
                  // Single tap - delayed to check for double tap
                  setTimeout(() => {
                    if (lastTapRef.current?.id === res.id && Date.now() - lastTapRef.current.time >= 280) {
                      setSelectedRestaurant(res);
                      setState('PROFILE');
                    }
                  }, 300);
                }}>
                  
                  {/* HEART ANIMATION on double-tap */}
                  {showHeartAnimation === res.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <Heart size={80} className="text-white fill-white animate-ping" />
                    </div>
                  )}

                  {/* RIGHT SIDE ACTION BUTTONS - Like Instagram Reels */}
                  <div className={`absolute right-4 bottom-40 flex flex-col items-center gap-5 z-20 transition-opacity ${showDishInfo ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Like button with count */}
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const next = new Set(likedIds);
                        const newCounts = new Map(likesCounts);
                        const currentCount = newCounts.get(res.id) || 0;
                        
                        if (next.has(res.id)) {
                          next.delete(res.id);
                          setLikedIds(next);
                          newCounts.set(res.id, Math.max(0, currentCount - 1));
                          setLikesCounts(newCounts);
                          await unlikeRestaurant(res.id);
                        } else {
                          next.add(res.id);
                          setLikedIds(next);
                          newCounts.set(res.id, currentCount + 1);
                          setLikesCounts(newCounts);
                          await likeRestaurant(res.id);
                        }
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <Heart size={28} className={likedIds.has(res.id) ? "text-red-500 fill-red-500" : "text-white"} />
                      <span className="text-white text-xs font-bold">{likesCounts.get(res.id) || 0}</span>
                    </button>
                    
                    {/* Reviews button with count - opens restaurant reviews */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRestaurant(res);
                        setOpenProfileReviews(true);
                        setState('PROFILE');
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <img src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon%20review.png" alt="Reviews" className="w-7 h-7" />
                      <span className="text-white text-xs font-bold">{res.totalReviews || 0}</span>
                    </button>
                    
                    {/* Save button */}
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const next = new Set(savedIds);
                        if (next.has(res.id)) {
                          next.delete(res.id);
                          setSavedIds(next);
                          await unsaveRestaurant(res.id);
                        } else {
                          next.add(res.id);
                          setSavedIds(next);
                          await saveRestaurant(res.id);
                        }
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <Bookmark size={26} className={savedIds.has(res.id) ? "text-white fill-white" : "text-white"} />
                    </button>
                  </div>

                  {/* INFO AT BOTTOM - Tap on name to see details */}
                  <div className={`absolute bottom-24 left-0 right-16 p-6 transition-all duration-500 ${showDishInfo ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-white/70 text-xs font-medium">{res.cuisine}</span>
                       <span className="text-white/40">•</span>
                       <span className="text-white/70 text-xs font-medium">{res.distance}</span>
                    </div>
                    <h3 
                      className="text-3xl font-black text-white drop-shadow-lg tracking-tight leading-none cursor-pointer active:opacity-70 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRestaurant(res);
                        setState('PROFILE');
                      }}
                    >
                      {res.name}
                    </h3>
                    
                    {/* Swipe for more indicator */}
                    <div className="flex flex-col items-center mt-4 animate-bounce" style={{ animationDuration: '2s' }}>
                      <ChevronUp size={18} className="text-white/60" />
                      <span className="text-white/60 text-xs font-medium">Swipe for more</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : !isLoading && error ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center bg-white">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
              <Info className="text-zinc-300" size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 mb-2">Couldn’t load results</h2>
            <p className="text-zinc-500 font-medium mb-8">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (location) fetchRestaurants(location);
                }}
                className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl active:scale-95 transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => setState('LOCATION_SELECTOR')}
                className="px-8 py-4 bg-zinc-100 text-zinc-900 font-bold rounded-2xl active:scale-95 transition-all"
              >
                Change Location
              </button>
            </div>
          </div>
        ) : !isLoading && (
          <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center bg-white">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
              <MapPin className="text-zinc-300" size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 mb-2">No bites found here</h2>
            <p className="text-zinc-500 font-medium mb-8">Try adjusting your filters or searching a different area.</p>
            <button 
              onClick={() => setState('LOCATION_SELECTOR')} 
              className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl active:scale-95 transition-all"
            >
              Try Another Location
            </button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-lg flex flex-col animate-in fade-in duration-300">
          <div className="p-6 pt-12">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setShowSearch(false)} className="p-2 text-white">
                <X size={24} />
              </button>
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search restaurants, cuisines, dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-orange-500"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {CUISINES.slice(0, 6).map(c => (
                <button 
                  key={c}
                  onClick={() => {
                    handleFilterUpdate({ cuisine: c });
                    setShowSearch(false);
                  }}
                  className="px-4 py-2 bg-white/10 rounded-full text-white text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
            
            {/* Search results */}
            {searchQuery && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {(() => {
                  const query = searchQuery.toLowerCase();
                  const filtered = restaurants.filter(r => 
                    r.name.toLowerCase().includes(query) ||
                    r.cuisine.toLowerCase().includes(query) ||
                    r.address?.toLowerCase().includes(query)
                  );
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-white/60 text-sm">No restaurants found for "{searchQuery}"</p>
                        <p className="text-white/40 text-xs mt-2">Try searching by name or cuisine type</p>
                      </div>
                    );
                  }
                  
                  return filtered.map(res => (
                    <button
                      key={res.id}
                      onClick={() => {
                        setSelectedRestaurant(res);
                        setShowSearch(false);
                        setState('PROFILE');
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-white/10 rounded-2xl text-left hover:bg-white/20 transition-colors"
                    >
                      <img src={res.mainPhotoUrl} className="w-16 h-16 rounded-xl object-cover" alt={res.name} />
                      <div>
                        <h4 className="text-white font-bold">{res.name}</h4>
                        <p className="text-white/60 text-sm">{res.cuisine} • {res.distance}</p>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews Feed Modal */}
      {showReviewsFeed && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="p-6 pt-12 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Top Reviews in {location?.name}</h2>
            <button onClick={() => setShowReviewsFeed(false)} className="p-2 text-white">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
            {restaurants
              .filter(r => r.reviews && r.reviews.length > 0)
              .flatMap(r => r.reviews?.map(review => ({ ...review, restaurantName: r.name, restaurantId: r.id })) || [])
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 15)
              .map((review, idx) => (
                <div key={idx} className="bg-white/10 rounded-2xl p-4">
                  {review.photoUrl && (
                    <img src={review.photoUrl} className="w-full h-48 object-cover rounded-xl mb-4" alt="Review" />
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < review.rating ? "text-amber-400" : "text-white/30"} fill="currentColor" />
                      ))}
                    </div>
                    <span className="text-white/60 text-xs">{review.relativeTimeDescription}</span>
                  </div>
                  <p className="text-white/80 text-sm mb-2">"{review.text}"</p>
                  <button 
                    onClick={() => {
                      const res = restaurants.find(r => r.id === review.restaurantId);
                      if (res) {
                        setSelectedRestaurant(res);
                        setShowReviewsFeed(false);
                        setState('PROFILE');
                      }
                    }}
                    className="text-orange-400 text-xs font-bold"
                  >
                    {review.restaurantName} →
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filter Modals */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowFilterModal(null)}>
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black tracking-tight capitalize">Select {showFilterModal}</h3>
              <button onClick={() => setShowFilterModal(null)} className="p-2 bg-zinc-100 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {showFilterModal === 'cuisine' ? CUISINES.map(c => (
                <button 
                  key={c}
                  onClick={() => handleFilterUpdate({ cuisine: c })}
                  className={`py-4 rounded-2xl font-bold transition-all ${filters.cuisine === c ? 'bg-orange-500 text-white' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100'}`}
                >
                  {c}
                </button>
              )) : PRICES.map(p => (
                <button 
                  key={p}
                  onClick={() => handleFilterUpdate({ price: p })}
                  className={`py-4 rounded-2xl font-bold transition-all ${filters.price === p ? 'bg-orange-500 text-white' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
