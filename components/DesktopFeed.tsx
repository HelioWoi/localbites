import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Star, Heart, Bookmark, Share2, ChevronRight, Play, Filter, Sparkles, Video, UtensilsCrossed, Coffee, Wine, IceCream, Pizza, Fish, Loader2, Navigation, Crown, Clock, Phone, Globe, ExternalLink, X, ChevronLeft } from 'lucide-react';
import { Restaurant } from '../types';
import { calculateIsOpenNow } from '../utils/filterHelpers';
import { supabase } from '../lib/supabase';

interface DesktopFeedProps {
  restaurants: Restaurant[];
  allRestaurants?: Restaurant[]; // All restaurants without category filter for search
  isLoading: boolean;
  savedIds: Set<string>;
  likedIds: Set<string>;
  likesCounts: Map<string, number>;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onClearAllSaves: () => void;
  onSearch: () => void;
  onFilter: () => void;
  onBitesAI: () => void;
  showOpenOnly: boolean;
  onToggleOpenNow: () => void;
  onCategoryChange: (category: string) => void;
  onLocationSearch: (query: string) => void;
  selectedCategory: string;
  locationName?: string;
  isLoadingLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

const HERO_VIDEO_URL = 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/hero_desktop.mp4';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: UtensilsCrossed },
  { id: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'cafes', label: 'Cafes', icon: Coffee },
  { id: 'bars', label: 'Bars', icon: Wine },
  { id: 'desserts', label: 'Desserts', icon: IceCream },
  { id: 'pizza', label: 'Pizza', icon: Pizza },
  { id: 'seafood', label: 'Seafood', icon: Fish },
];

const DesktopFeed: React.FC<DesktopFeedProps> = ({
  restaurants,
  allRestaurants,
  isLoading,
  savedIds,
  likedIds,
  likesCounts,
  onSelectRestaurant,
  onToggleSave,
  onToggleLike,
  onClearAllSaves,
  onSearch,
  onFilter,
  onBitesAI,
  showOpenOnly,
  onToggleOpenNow,
  onCategoryChange,
  onLocationSearch,
  selectedCategory,
  locationName,
  isLoadingLocation,
  userLocation,
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [itemsToShow, setItemsToShow] = useState(20);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [suggestions, setSuggestions] = useState<{ placeId?: string; name: string; address?: string; photoUrl?: string }[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedNonPartner, setSelectedNonPartner] = useState<Restaurant | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const resultsRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 20;

  // No longer auto-populate — locationName shows as placeholder instead

  // Play video on hover
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      if (id === hoveredCard) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [hoveredCard]);

  // Google Places autocomplete (same as mobile)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (autocompleteRef.current) clearTimeout(autocompleteRef.current);
    
    if (value.trim().length >= 2) {
      setIsLoadingSuggestions(true);
      setShowAutocomplete(true);
      autocompleteRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('google-places', {
            body: {
              action: 'autocomplete',
              query: value.trim(),
              lat: userLocation?.lat,
              lng: userLocation?.lng,
            }
          });
          
          console.log('[DesktopFeed] Autocomplete response:', { data, error, query: value.trim() });
          
          if (Array.isArray(data) && data.length > 0) {
            console.log('[DesktopFeed] Setting suggestions:', data);
            setSuggestions(data);
          } else {
            console.log('[DesktopFeed] No suggestions or error');
            setSuggestions([]);
          }
        } catch (err) {
          console.error('[Autocomplete] Error:', err);
          setSuggestions([]);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 300);
    } else {
      setShowAutocomplete(false);
      setSuggestions([]);
      setIsLoadingSuggestions(false);
    }
  };

  // When searching, use allRestaurants to ignore category filter
  // When not searching, use filtered restaurants from category
  const filteredRestaurants = searchQuery.trim()
    ? (allRestaurants || restaurants).filter(r => {
        const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
        const combined = `${r.name.toLowerCase()} ${r.cuisine.toLowerCase()}`;
        return queryWords.every(qw => combined.includes(qw));
      })
    : restaurants;

  // Separate subscribed (with video) and non-subscribed
  const subscribedRestaurants = filteredRestaurants.filter(r => r.isSubscribed);
  const otherRestaurants = filteredRestaurants.filter(r => !r.isSubscribed);
  const displayedOtherRestaurants = otherRestaurants.slice(0, itemsToShow);
  const hasMore = otherRestaurants.length > itemsToShow;

  // Reset items to show when filters change
  useEffect(() => {
    setItemsToShow(20);
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-50 relative">
      {/* ===== HERO SECTION ===== */}
      <section className="relative h-[85vh]">
        {/* Background Video */}
        <div className="absolute inset-0 overflow-hidden">
          <video
            src={HERO_VIDEO_URL}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
        </div>

        {/* Top Nav */}
        <nav className="relative z-10 flex items-center justify-between px-12 py-6">
          <div className="flex items-center gap-3">
            <img
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png"
              alt="MenuLove"
              className="w-10 h-10 rounded-xl shadow-lg"
            />
            <span className="text-2xl font-extrabold text-white tracking-tight">MenuLove</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      onLocationSearch(`${position.coords.latitude},${position.coords.longitude}`);
                    },
                    (error) => console.error('Geolocation error:', error),
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }
                locationInputRef.current?.focus();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-full text-white text-sm font-bold transition-all"
            >
              <MapPin size={14} />
              {locationName || 'Current Location'}
            </button>
            <a
              href="/partner"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-bold hover:bg-white/20 transition-all"
            >
              Partner Portal
            </a>
          </div>
        </nav>

        {/* Hero Content */}
        <div className={`relative flex flex-col items-center justify-center h-[calc(100%-80px)] text-center px-8 ${showAutocomplete && searchQuery.trim() && suggestions.length > 0 ? 'z-50' : 'z-[5]'}`}>
          <h1 className="text-6xl xl:text-7xl font-extrabold text-white tracking-tight leading-[1.05] mb-6 max-w-4xl">
            Discover Local
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"> Flavors</span>
          </h1>
          <p className="text-xl text-white/80 font-medium mb-4 max-w-2xl">
            Discover restaurants, cafes and bars near you, within a 5km radius.
          </p>
          
          {/* Partner CTA */}
          <div className="mb-10">
            <a
              href="/become-a-partner"
              className="inline-flex items-center gap-2 text-lg text-white/90 font-medium hover:text-white transition-colors group"
            >
              <Crown size={20} className="text-orange-400 group-hover:text-orange-300 transition-colors" />
              <span>Own a restaurant? Join as a partner and showcase your menu with video</span>
              <ChevronRight size={18} className="text-orange-400 group-hover:text-orange-300 group-hover:translate-x-1 transition-all" />
            </a>
          </div>

          {/* Search Bar */}
          <div className="w-full max-w-2xl relative z-[9999]">
            <div className={`relative flex items-center bg-white shadow-2xl shadow-black/20 ${
              showAutocomplete && searchQuery.trim() && suggestions.length > 0
                ? 'rounded-t-2xl'
                : 'rounded-2xl'
            }`}>
              {/* Location Input */}
              <div className="flex items-center gap-2 pl-5 pr-3 border-r border-zinc-100 min-w-[200px]">
                {isLoadingLocation ? (
                  <Loader2 size={18} className="text-orange-500 animate-spin flex-shrink-0" />
                ) : (
                  <MapPin size={18} className="text-orange-500 flex-shrink-0" />
                )}
                <input
                  ref={locationInputRef}
                  type="text"
                  placeholder={locationName || 'City or postal code...'}
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && locationInput.trim()) {
                      onLocationSearch(locationInput.trim());
                      setLocationInput('');
                      locationInputRef.current?.blur();
                      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 600);
                    }
                  }}
                  className="w-full py-5 text-sm font-medium text-zinc-700 placeholder:text-zinc-400 focus:outline-none bg-transparent"
                />
              </div>
              {/* Restaurant Search Input */}
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search restaurants, cuisines, dishes..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowAutocomplete(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowAutocomplete(false); setSuggestions([]); }
                  if (e.key === 'Enter') {
                    setShowAutocomplete(false);
                    setSuggestions([]);
                    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }
                }}
                className="flex-1 px-6 py-5 text-zinc-900 placeholder:text-zinc-400 focus:outline-none text-base"
              />
              <button
                onClick={() => {
                  if (locationInput.trim()) {
                    onLocationSearch(locationInput.trim());
                    setLocationInput('');
                    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 600);
                  }
                }}
                className="m-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors flex-shrink-0"
              >
                Search
              </button>
            </div>

            {/* Autocomplete Dropdown - Connected to search bar */}
            {showAutocomplete && searchQuery.trim() && (suggestions.length > 0 || isLoadingSuggestions) && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-b-2xl shadow-2xl shadow-black/20 border-t border-zinc-100 overflow-hidden">
                {isLoadingSuggestions && suggestions.length === 0 ? (
                  <div className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Loader2 size={16} className="text-orange-500 animate-spin" />
                      <span className="text-sm text-zinc-500">Searching...</span>
                    </div>
                  </div>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.placeId || index}
                      onClick={() => {
                        setSearchQuery(suggestion.name);
                        setShowAutocomplete(false);
                        setSuggestions([]);
                        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                      className="w-full px-6 py-3 flex items-center gap-4 hover:bg-zinc-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                        {suggestion.photoUrl ? (
                          <img src={suggestion.photoUrl} alt={suggestion.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-orange-50">
                            <MapPin size={14} className="text-orange-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 truncate text-sm">{suggestion.name}</p>
                        {suggestion.address && (
                          <p className="text-xs text-zinc-500 truncate">{suggestion.address}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-8 mt-8 text-white/70 text-sm">
            <button
              onClick={() => {
                const resultsSection = document.querySelector('.max-w-7xl.mx-auto.px-8.py-10');
                if (resultsSection) {
                  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>{restaurants.length} restaurants nearby</span>
            </button>
            <div className="flex items-center gap-2">
              <Video size={14} />
              <span>{subscribedRestaurants.length} with video menus</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce" style={{ animationDuration: '2s' }}>
          <span className="text-white/50 text-xs font-medium">Explore</span>
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ===== CATEGORIES BAR ===== */}
      <div ref={resultsRef} />
      <section className={`sticky top-0 bg-white border-b border-zinc-100 shadow-sm ${showAutocomplete && searchQuery.trim() && suggestions.length > 0 ? 'z-0' : 'z-40'}`}>
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onCategoryChange(cat.id);
                    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <Icon size={16} />
                  {cat.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={onToggleOpenNow}
            className="flex items-center gap-3 text-sm font-bold text-zinc-700 transition-colors"
          >
            <span>Open</span>
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              showOpenOnly ? 'bg-green-500' : 'bg-zinc-300'
            }`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                showOpenOnly ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </button>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-8 py-10">

        {/* Featured / Video Menu Section */}
        {subscribedRestaurants.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                  <Crown size={24} className="inline-block mr-2 text-orange-500" />
                  Video Menus
                </h2>
                <p className="text-sm text-zinc-500 mt-1">See the food in action with video menus</p>
              </div>
              <button className="flex items-center gap-1 text-orange-500 font-bold text-sm hover:text-orange-600 transition-colors">
                View all <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
              {subscribedRestaurants.slice(0, 6).map(res => (
                <RestaurantCard
                  key={res.id}
                  restaurant={res}
                  isHovered={hoveredCard === res.id}
                  isSaved={savedIds.has(res.id)}
                  isLiked={likedIds.has(res.id)}
                  likesCount={likesCounts.get(res.id) || 0}
                  onHover={() => setHoveredCard(res.id)}
                  onLeave={() => setHoveredCard(null)}
                  onSelect={() => res.isSubscribed ? onSelectRestaurant(res) : setSelectedNonPartner(res)}
                  onToggleSave={() => onToggleSave(res.id)}
                  onToggleLike={() => onToggleLike(res.id)}
                  onShare={() => {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(res.id)}`;
                    if (navigator.share) {
                      navigator.share({
                        title: res.name,
                        text: `Check out ${res.name} on MenuLove!`,
                        url: shareUrl,
                      }).catch(() => {});
                    }
                  }}
                  videoRef={(el) => {
                    if (el) videoRefs.current.set(res.id, el);
                    else videoRefs.current.delete(res.id);
                  }}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        {/* All Restaurants Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                Near You
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                {locationName ? `Restaurants in ${locationName}` : 'Discover what\'s around you'}
              </p>
            </div>
            <span className="text-sm text-zinc-400 font-medium">{filteredRestaurants.length} results</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-zinc-100">
                  <div className="aspect-[4/3] bg-zinc-100 animate-shimmer" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-3/4 bg-zinc-100 rounded-lg animate-pulse" />
                    <div className="h-4 w-1/2 bg-zinc-100 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
              {(subscribedRestaurants.length > 0 ? displayedOtherRestaurants : filteredRestaurants.slice(0, itemsToShow)).map(res => (
                <RestaurantCard
                  key={res.id}
                  restaurant={res}
                  isHovered={hoveredCard === res.id}
                  isSaved={savedIds.has(res.id)}
                  isLiked={likedIds.has(res.id)}
                  likesCount={likesCounts.get(res.id) || 0}
                  onHover={() => setHoveredCard(res.id)}
                  onLeave={() => setHoveredCard(null)}
                  onSelect={() => res.isSubscribed ? onSelectRestaurant(res) : setSelectedNonPartner(res)}
                  onToggleSave={() => onToggleSave(res.id)}
                  onToggleLike={() => onToggleLike(res.id)}
                  onShare={() => {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(res.id)}`;
                    if (navigator.share) {
                      navigator.share({
                        title: res.name,
                        text: `Check out ${res.name} on MenuLove!`,
                        url: shareUrl,
                      }).catch(() => {});
                    }
                  }}
                  videoRef={(el) => {
                    if (el) videoRefs.current.set(res.id, el);
                    else videoRefs.current.delete(res.id);
                  }}
                />
              ))}
            </div>
          )}

          {!isLoading && filteredRestaurants.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                <Search size={32} className="text-zinc-300" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">No restaurants found</h3>
              <p className="text-zinc-500 mb-6">Try adjusting your search or filters</p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Load More Button */}
          {!isLoading && hasMore && (
            <div className="flex flex-col items-center justify-center gap-3 mt-12">
              <p className="text-sm text-zinc-500">
                Showing {displayedOtherRestaurants.length} of {otherRestaurants.length} restaurants
              </p>
              <button
                onClick={() => setItemsToShow(prev => prev + 20)}
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                Load More Restaurants
                <ChevronRight size={18} className="-rotate-90" />
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ===== NON-PARTNER RESTAURANT MODAL ===== */}
      {selectedNonPartner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setSelectedNonPartner(null)}>
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header Image */}
            <div className="relative h-64">
              {selectedNonPartner.mainPhotoUrl ? (
                <img src={selectedNonPartner.mainPhotoUrl} className="w-full h-full object-cover" alt={selectedNonPartner.name} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
              
              {/* Close button */}
              <button
                onClick={() => setSelectedNonPartner(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-white" />
              </button>

              {/* Closed badge */}
              {!calculateIsOpenNow(selectedNonPartner.openingHours) && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-500 px-3 py-1.5 rounded-full">
                  <span className="text-sm font-bold text-white">Closed</span>
                </div>
              )}

              {/* Restaurant info overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-3xl font-extrabold text-white mb-2">{selectedNonPartner.name}</h2>
                <div className="flex items-center gap-3 text-white/90">
                  <span className="text-sm font-medium">{selectedNonPartner.cuisine}</span>
                  {selectedNonPartner.rating && (
                    <>
                      <span className="text-white/40">•</span>
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold">{selectedNonPartner.rating}</span>
                      </div>
                    </>
                  )}
                  {selectedNonPartner.totalReviews > 0 && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="text-sm">{selectedNonPartner.totalReviews} reviews</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-256px)] space-y-4">
              {/* Rating Section */}
              {selectedNonPartner.rating && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star size={20} className="text-amber-400 fill-amber-400" />
                      <div>
                        <span className="text-2xl font-bold text-zinc-900">{selectedNonPartner.rating}</span>
                        <span className="text-zinc-500 text-xs ml-2">({selectedNonPartner.totalReviews} reviews)</span>
                      </div>
                    </div>
                    {selectedNonPartner.googleMapsUrl && (
                      <a
                        href={`${selectedNonPartner.googleMapsUrl}&review=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-500 font-bold text-sm hover:text-orange-600 transition-colors flex items-center gap-1"
                      >
                        See more
                        <ChevronRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Opening Hours */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={18} className="text-orange-500" />
                  <h3 className="font-bold text-zinc-900">Opening Hours</h3>
                </div>
                {selectedNonPartner.openingHours && selectedNonPartner.openingHours.length > 0 ? (
                  <div className="space-y-1">
                    {selectedNonPartner.openingHours.map((hourString, index) => {
                      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                      const isToday = hourString.startsWith(today);
                      return (
                        <div key={index} className={`text-sm ${isToday ? 'text-orange-500 font-bold' : 'text-zinc-600'}`}>
                          {hourString}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">Hours not available</p>
                )}
              </div>

              {/* Directions & Share Buttons */}
              <div className="space-y-2">
                {selectedNonPartner.googleMapsUrl && (
                  <a
                    href={selectedNonPartner.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl transition-colors text-sm"
                  >
                    <Navigation size={16} />
                    Directions
                  </a>
                )}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: selectedNonPartner.name,
                        text: `Check out ${selectedNonPartner.name} on MenuLove!`,
                        url: selectedNonPartner.googleMapsUrl || window.location.href,
                      }).catch(() => {});
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-2xl transition-colors text-sm"
                >
                  <Share2 size={16} />
                  Share
                </button>
              </div>

              {/* Partner CTA Banner */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Crown size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-zinc-900 mb-1 text-sm">Own this restaurant?</h3>
                    <p className="text-zinc-600 text-xs mb-3">Add videos and attract more customers.</p>
                    <a
                      href="/become-a-partner"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-xs"
                    >
                      BECOME A PARTNER
                      <ChevronRight size={14} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Disclaimer Text */}
              <div className="space-y-3 text-center text-zinc-400 text-[10px] leading-relaxed">
                <p>
                  The information displayed is publicly available data provided by Google Maps. MenuLove is an independent discovery platform. We do not represent, endorse, or guarantee any establishment. Please verify details directly with the business.
                </p>
                <p>
                  If you are the owner of this business and wish to update or remove your listing from our platform,{' '}
                  <a href="/partner" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">
                    click here to request removal
                  </a>.
                </p>
                <p className="text-zinc-300">
                  Powered by <span className="font-bold">Google</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PARTNER CTA SECTION ===== */}
      <section className="mt-16 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-7xl mx-auto px-8 py-20 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Turn Your Menu Into
            <br />
            <span className="text-yellow-300">Viral Content</span>
          </h2>
          <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto font-medium leading-relaxed">
            Join MenuLove and showcase your dishes with TikTok-style videos. 
            Get discovered by customers within 5km through smart location search.
          </p>
          <p className="text-white/90 text-base font-semibold mb-10">
            ✨ Beta Launch Special: $29.90/month • 14-day free trial • No credit card required
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a
              href="/become-a-partner"
              className="group px-8 py-4 bg-white text-orange-600 font-black text-lg rounded-2xl hover:bg-yellow-300 hover:text-orange-700 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-2"
            >
              Start Free Trial
              <ChevronRight className="group-hover:translate-x-1 transition-transform" size={24} />
            </a>
            <a
              href="/become-a-partner"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-all border-2 border-white/30"
            >
              See How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-orange-600 mb-2">50+</div>
                <div className="text-zinc-600 font-medium text-sm">Partner Restaurants</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-orange-600 mb-2">10K+</div>
                <div className="text-zinc-600 font-medium text-sm">Monthly Views</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-orange-600 mb-2">Beta</div>
                <div className="text-zinc-600 font-medium text-sm">Early Access</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-orange-600 mb-2">65%</div>
                <div className="text-zinc-600 font-medium text-sm">Decision Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="grid grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png"
                  alt="MenuLove"
                  className="w-10 h-10 rounded-xl"
                />
                <span className="text-xl font-extrabold">MenuLove</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Discover restaurants near you with video menus.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-400 mb-4">Platform</h4>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li><a href="/become-a-partner" className="hover:text-white transition-colors">For Restaurants</a></li>
                <li><a href="/partner" className="hover:text-white transition-colors">Partner Portal</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-400 mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li><a href="/policy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-400 mb-4">Acesso Mobile</h4>
              <p className="text-sm text-zinc-400 mb-4">Best experience on mobile</p>
              <div className="bg-white p-3 rounded-xl inline-block">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://menulove.com.au&color=f97316&bgcolor=ffffff"
                  alt="QR Code"
                  className="w-24 h-24"
                />
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800 mt-12 pt-8">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <p className="text-zinc-400 text-sm leading-relaxed">
                <span className="text-orange-500 font-bold">Beta Version:</span> MenuLove is currently in beta testing. 
                We're working hard to deliver the best experience for Australian restaurants. 
                Your feedback helps us improve and build the perfect platform for showcasing your culinary creations. 
                Join us in revolutionizing how restaurants connect with customers through video menus.
              </p>
              <p className="text-zinc-500 text-sm">
                If you have any questions, feel free to <a href="/contact" className="text-orange-400 hover:text-orange-300 transition-colors">contact us here</a>.
              </p>
            </div>
            <div className="text-center pt-6 border-t border-zinc-800 mt-6">
              <p className="text-zinc-400 text-sm mb-2">
                © 2026 MenuLove Australia. All rights reserved.
              </p>
              <p className="text-zinc-500 text-sm">
                Made with ❤️ in Australia | <a href="mailto:contact@menulove.com.au" className="text-orange-500 hover:text-orange-400 transition-colors">contact@menulove.com.au</a>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Saved Badge */}
      {savedIds.size > 0 && (
        <button
          onClick={() => setShowSavedModal(true)}
          className="fixed bottom-6 right-6 z-40 group"
        >
          <div className="relative">
            <div className="w-14 h-14 bg-orange-500 rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 transition-all hover:scale-110">
              <Bookmark size={24} className="text-white fill-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-bold">{savedIds.size}</span>
            </div>
          </div>
        </button>
      )}

      {/* Saved Restaurants Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setShowSavedModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 border-b border-zinc-100 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-zinc-900">Saved Restaurants</h2>
                <p className="text-zinc-500 text-sm mt-1">{savedIds.size} {savedIds.size === 1 ? 'restaurant' : 'restaurants'} saved</p>
              </div>
              <div className="flex items-center gap-3">
                {savedIds.size > 0 && (
                  <>
                    <button
                      onClick={() => {
                        const savedRestaurants = restaurants.filter(r => savedIds.has(r.id));
                        const restaurantIds = savedRestaurants.map(r => r.id).join(',');
                        const shareUrl = `${window.location.origin}${window.location.pathname}?saved=${encodeURIComponent(restaurantIds)}`;
                        
                        if (navigator.share) {
                          navigator.share({
                            title: 'My Saved Restaurants',
                            text: `Check out my ${savedIds.size} saved restaurants on MenuLove!`,
                            url: shareUrl,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(shareUrl);
                          alert('Link copied to clipboard!');
                        }
                      }}
                      className="px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Share2 size={16} />
                      Share List
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Clear all ${savedIds.size} saved restaurants?`)) {
                          onClearAllSaves();
                        }
                      }}
                      className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowSavedModal(false)}
                  className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors"
                >
                  <ChevronRight size={20} className="text-zinc-600 rotate-90" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-100px)] px-8 py-6">
              {savedIds.size === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                    <Bookmark size={32} className="text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">No saved restaurants yet</h3>
                  <p className="text-zinc-500 mb-6">Start saving restaurants to see them here</p>
                  <button
                    onClick={() => setShowSavedModal(false)}
                    className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors"
                  >
                    Explore Restaurants
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                  {restaurants.filter(r => savedIds.has(r.id)).map(res => (
                    <RestaurantCard
                      key={res.id}
                      restaurant={res}
                      isHovered={hoveredCard === res.id}
                      isSaved={savedIds.has(res.id)}
                      isLiked={likedIds.has(res.id)}
                      likesCount={likesCounts.get(res.id) || 0}
                      onHover={() => setHoveredCard(res.id)}
                      onLeave={() => setHoveredCard(null)}
                      onSelect={() => {
                        setShowSavedModal(false);
                        onSelectRestaurant(res);
                      }}
                      onToggleSave={() => onToggleSave(res.id)}
                      onToggleLike={() => onToggleLike(res.id)}
                      onShare={() => {
                        const shareUrl = `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(res.id)}`;
                        if (navigator.share) {
                          navigator.share({
                            title: res.name,
                            text: `Check out ${res.name} on MenuLove!`,
                            url: shareUrl,
                          }).catch(() => {});
                        }
                      }}
                      videoRef={(el) => {
                        if (el) videoRefs.current.set(res.id, el);
                        else videoRefs.current.delete(res.id);
                      }}
                      featured={res.isSubscribed}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== RESTAURANT CARD COMPONENT =====
interface RestaurantCardProps {
  restaurant: Restaurant;
  isHovered: boolean;
  isSaved: boolean;
  isLiked: boolean;
  likesCount: number;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
  onToggleSave: () => void;
  onToggleLike: () => void;
  onShare: () => void;
  videoRef: (el: HTMLVideoElement | null) => void;
  featured?: boolean;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isHovered,
  isSaved,
  isLiked,
  likesCount,
  onHover,
  onLeave,
  onSelect,
  onToggleSave,
  onToggleLike,
  onShare,
  videoRef,
  featured = false,
}) => {
  const hasVideo = restaurant.isSubscribed && restaurant.dishes[0]?.videoUrl;

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:border-zinc-200 hover:shadow-xl transition-all duration-300 cursor-pointer ${
        featured ? 'row-span-1' : ''
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onSelect}
    >
      {/* Media */}
      <div className={`relative overflow-hidden ${featured ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
        {hasVideo ? (
          <>
            {/* Thumbnail (shows when not hovered) */}
            <img
              src={restaurant.mainPhotoUrl}
              alt={restaurant.name}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                isHovered ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {/* Video (plays on hover) */}
            <video
              ref={videoRef}
              src={restaurant.dishes[0]?.videoUrl}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
              muted
              loop
              playsInline
              preload="none"
            />
            {/* Video badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
              <Play size={12} className="text-white fill-white" />
              <span className="text-white text-xs font-bold">Video Menu</span>
            </div>
          </>
        ) : (
          <img
            src={restaurant.mainPhotoUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Partner Crown Badge (always visible for partners) */}
        {restaurant.isSubscribed && (
          <div className="absolute top-3 right-3 z-20">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown size={14} className="text-white fill-white" />
            </div>
          </div>
        )}

        {/* Action buttons (top right, below crown on hover) */}
        <div className={`absolute ${restaurant.isSubscribed ? 'top-14' : 'top-3'} right-3 flex flex-col gap-2 z-30 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${
              isLiked ? 'bg-red-500' : 'bg-white/95 hover:bg-white'
            }`}
          >
            <Heart size={14} className={isLiked ? 'text-white fill-white' : 'text-zinc-600'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${
              isSaved ? 'bg-orange-500' : 'bg-white/95 hover:bg-white'
            }`}
          >
            <Bookmark size={14} className={isSaved ? 'text-white fill-white' : 'text-zinc-600'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="w-8 h-8 rounded-full bg-white/95 hover:bg-white flex items-center justify-center transition-all shadow-md"
          >
            <Share2 size={14} className="text-zinc-600" />
          </button>
        </div>


        {/* Closed badge (top-left) */}
        {!calculateIsOpenNow(restaurant.openingHours) && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 px-2.5 py-1 rounded-full z-10">
            <span className="text-xs font-bold text-white">Closed</span>
          </div>
        )}

        {/* Distance badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full z-10">
          <MapPin size={12} className="text-orange-500" />
          <span className="text-xs font-bold text-zinc-700">{restaurant.distance}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className={`font-bold text-zinc-900 leading-tight line-clamp-1 ${featured ? 'text-lg' : 'text-base'}`}>
            {restaurant.name}
          </h3>
          {restaurant.rating && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-zinc-700">{restaurant.rating}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span>{restaurant.cuisine}</span>
          {restaurant.totalReviews > 0 && (
            <>
              <span className="text-zinc-300">•</span>
              <span>{restaurant.totalReviews} reviews</span>
            </>
          )}
        </div>
        {featured && hasVideo && (
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full flex items-center gap-1">
              <Video size={12} /> Video Menu
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopFeed;
