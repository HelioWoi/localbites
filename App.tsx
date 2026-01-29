
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Restaurant, UserLocation } from './types';
import SplashScreen from './screens/SplashScreen';
import LocationSelector from './screens/LocationSelector';
import RestaurantProfile from './screens/RestaurantProfile';
import AdminDashboard from './screens/AdminDashboard';
import MediaContainer from './components/MediaContainer';
import FloatingFilters from './components/FloatingFilters';
import { getNearbyRestaurants } from './services/geminiService';
import { CUISINES, PRICES } from './constants';
import { Store, Bookmark, Quote, ExternalLink, Info, Loader2, X, ArrowRight, Globe, MapPin, ChevronUp, Crown, PlayCircle, Heart } from 'lucide-react';

const App: React.FC = () => {
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
  const [showHeartAnimation, setShowHeartAnimation] = useState<string | null>(null);
  const [feedSwipeCount, setFeedSwipeCount] = useState(0);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  
  const feedRef = useRef<HTMLDivElement>(null);

  const isOverlayOpen = showDishInfo || !!showFilterModal || showSaved;
  const isExternalOverlayOpen = !!showFilterModal || showSaved;

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
        onBack={() => setState('FEED')} 
        isSaved={savedIds.has(selectedRestaurant.id)}
        onToggleSave={() => {
           const next = new Set(savedIds);
           if (next.has(selectedRestaurant.id)) next.delete(selectedRestaurant.id);
           else next.add(selectedRestaurant.id);
           setSavedIds(next);
        }}
      />
    );
  }

  return (
    <div className="relative h-screen w-screen bg-white overflow-hidden select-none">
      {isLoading && restaurants.length > 0 && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-lg flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-6" />
          <h2 className="text-xl font-black text-zinc-900 tracking-tight mb-2">Analysing the neighbourhood...</h2>
          <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-zinc-400">Finding the best bites for you</p>
        </div>
      )}

      {/* Fixed Header */}
      <div className={`fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/90 to-transparent z-40 pointer-events-none px-6 pt-10 transition-opacity ${showDishInfo ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setState('LOCATION_SELECTOR')} className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
               <span className="text-[10px] font-black text-white">LB</span>
            </button>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Near</span>
              <span className="text-sm font-bold text-zinc-900 leading-none">{location?.name || 'Your Area'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSaved(true)} className="w-10 h-10 bg-white/90 backdrop-blur-md border border-zinc-100 rounded-full flex items-center justify-center text-zinc-900 shadow-sm active:scale-90 transition-transform">
              <Bookmark size={18} fill={savedIds.size > 0 ? "black" : "none"} />
            </button>
            <button onClick={() => setState('ADMIN')} className="w-10 h-10 bg-white/90 backdrop-blur-md border border-zinc-100 rounded-full flex items-center justify-center text-zinc-900 shadow-sm active:scale-90 transition-transform">
              <Store size={18} />
            </button>
          </div>
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

      <div ref={feedRef} className={`snap-container no-scrollbar bg-white ${isExternalOverlayOpen ? 'pointer-events-none' : ''}`} onScroll={handleScroll}>
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
              <div className={`video-card shadow-none rounded-none md:rounded-[40px] border-none bg-zinc-50 transition-all duration-500 ease-out transform-gpu ${activeRestaurantIndex === i ? 'opacity-100 scale-100' : 'opacity-80 scale-[0.97]'}`}>
                <MediaContainer 
                  videoUrl={res.dishes[0]?.videoUrl} 
                  photoUrl={res.mainPhotoUrl}
                  isActive={activeRestaurantIndex === i && state === 'FEED' && !isLoading}
                  isSubscribed={res.isSubscribed}
                  onSwipeUp={() => feedRef.current?.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
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
                      if (res.isSubscribed) {
                        setSelectedRestaurant(res);
                        setState('PROFILE');
                      } else {
                        setShowDishInfo(!showDishInfo);
                      }
                    }
                  }, 300);
                }}>
                  
                  {/* PARTNER BADGE - only for subscribers */}
                  {res.isSubscribed && !showDishInfo && (
                    <div className="absolute top-6 right-6 z-20">
                      <div className="w-9 h-9 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg animate-fade-in-scale flex items-center justify-center">
                        <Crown size={16} fill="currentColor" />
                      </div>
                    </div>
                  )}

                  {/* QUOTE OVERLAY */}
                  {!showDishInfo && activeRestaurantIndex === i && (
                    <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
                      <div className="bg-white/30 backdrop-blur-md border border-white/20 p-10 rounded-[50px] text-center max-w-[320px] shadow-2xl animate-fade-in-scale">
                        <Quote size={24} className="text-orange-600 mb-4 mx-auto animate-float" fill="currentColor" />
                        <p className="text-xl font-bold text-zinc-900 leading-tight tracking-tight italic animate-fade-in-up animation-delay-200">
                          "{res.reviewSnippets?.[0]}"
                        </p>
                        {res.isSubscribed && (
                          <div className="mt-4 flex items-center justify-center gap-1.5 text-orange-600 animate-fade-in-up animation-delay-300">
                            <PlayCircle size={14} />
                            <span className="text-[10px] font-black uppercase tracking-wider">Watch menu videos</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* HEART ANIMATION on double-tap */}
                  {showHeartAnimation === res.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <Heart size={80} className="text-white fill-white animate-ping" />
                    </div>
                  )}

                  {/* INFO AT BOTTOM */}
                  <div className={`absolute bottom-32 left-8 right-8 transition-all duration-500 ${showDishInfo ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
                    <div className={`flex items-center gap-2 mb-3 flex-wrap ${activeRestaurantIndex === i ? 'animate-fade-in-up' : ''}`}>
                       <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-black uppercase tracking-wider shadow-sm">Open Now</span>
                       <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-zinc-900 rounded text-[9px] font-black uppercase tracking-wider shadow-sm">{res.distance}</span>
                       <span className="px-2 py-0.5 bg-white/70 backdrop-blur-sm text-zinc-700 rounded text-[9px] font-black uppercase tracking-wider shadow-sm">{res.cuisine}</span>
                       {res.isSubscribed && (
                         <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                           <PlayCircle size={10} /> Videos
                         </span>
                       )}
                    </div>
                    <h3 className={`text-4xl font-black text-white drop-shadow-lg mb-1 tracking-tighter leading-none ${activeRestaurantIndex === i ? 'animate-fade-in-up animation-delay-100' : ''}`}>{res.name}</h3>
                    <p className={`text-white/80 text-sm font-semibold drop-shadow-sm ${activeRestaurantIndex === i ? 'animate-fade-in-up animation-delay-200' : ''}`}>
                      {res.isSubscribed ? 'Tap to watch menu videos' : 'Tap to see details'} • Double-tap to save
                    </p>
                  </div>

                  {/* SWIPE HINT - shows on all cards except last */}
                  {i < restaurants.length - 1 && activeRestaurantIndex === i && !showDishInfo && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none animate-bounce">
                      <ChevronUp className="w-6 h-6 text-white/70" />
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Swipe for more</span>
                    </div>
                  )}
                  
                  {/* Last restaurant indicator */}
                  {i === restaurants.length - 1 && activeRestaurantIndex === i && !showDishInfo && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                      <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Last restaurant</span>
                    </div>
                  )}

                  {/* DETAILED MODAL */}
                  {showDishInfo && activeRestaurantIndex === i && (
                    <div className="absolute inset-0 flex flex-col justify-end p-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                      <div className="bg-white/50 backdrop-blur-md rounded-[40px] p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                          <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[9px] font-black uppercase tracking-widest">Google Data</span>
                          <button onClick={() => setShowDishInfo(false)} className="p-2 bg-zinc-100 rounded-xl text-zinc-400 active:scale-90 transition-transform"><X size={20}/></button>
                        </div>
                        
                        <h2 className="text-3xl font-black text-zinc-900 tracking-tighter mb-4 leading-none">{res.name}</h2>
                        
                        <div className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100 mb-8">
                           <p className="text-zinc-600 text-sm font-medium leading-relaxed italic mb-4">"{res.reviewSnippets?.[1] || res.reviewSnippets?.[0]}"</p>
                           <div className="flex flex-col gap-2">
                             <a href={res.googleMapsUrl} target="_blank" className="inline-flex items-center gap-1.5 text-orange-600 text-[10px] font-black uppercase tracking-widest font-bold hover:underline">
                               View on Google Maps <ExternalLink size={12}/>
                             </a>
                             {res.website && (
                               <a href={res.website} target="_blank" className="inline-flex items-center gap-1.5 text-zinc-500 text-[10px] font-black uppercase tracking-widest font-bold hover:underline">
                                 Visit Official Website <Globe size={12}/>
                               </a>
                             )}
                           </div>
                        </div>

                        <div className="flex gap-3">
                          <button onClick={() => { setSelectedRestaurant(res); setState('PROFILE'); }} className="flex-1 bg-zinc-900 text-white font-bold py-5 rounded-3xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                            See More Details <ArrowRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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

      {state === 'FEED' && !showDishInfo && !showFilterModal && restaurants.length > 0 && (
        <FloatingFilters onFilterClick={(type) => setShowFilterModal(type as any)} activeFilters={filters} />
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
