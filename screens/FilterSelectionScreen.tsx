import React, { useState, useRef, useEffect } from 'react';
import { Utensils, Coffee, Wine, IceCreamCone, Pizza, Fish, Search, MapPin, Loader2, Crown, ChevronDown, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FilterSelectionScreenProps {
  onSelect: (category: 'restaurants' | 'cafes' | 'bars' | 'desserts' | 'pizza' | 'seafood' | 'all') => void;
  onSkip: () => void;
  onManualSearch?: (address: string) => void;
  onSelectPlace?: (placeId: string, name: string) => void;
  onOpenAI?: () => void;
}

const FilterSelectionScreen: React.FC<FilterSelectionScreenProps> = ({ onSelect, onSkip, onManualSearch, onSelectPlace, onOpenAI }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ placeId?: string; name: string; address?: string }[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const autocompleteRef = useRef<NodeJS.Timeout | null>(null);
  
  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (autocompleteRef.current) clearTimeout(autocompleteRef.current);
    
    if (value.trim().length >= 2) {
      setIsLoadingSuggestions(true);
      setShowSuggestions(true);
      autocompleteRef.current = setTimeout(async () => {
        try {
          // Get user location for biased results
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 3000, maximumAge: 60000 });
          }).catch(() => null);
          
          const { data, error } = await supabase.functions.invoke('google-places', {
            body: {
              action: 'autocomplete',
              query: value.trim(),
              lat: pos?.coords.latitude,
              lng: pos?.coords.longitude,
            }
          });
          
          console.log('[Autocomplete] Response:', { data, error, query: value.trim() });
          
          if (Array.isArray(data) && data.length > 0) {
            setSuggestions(data);
          } else {
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
      setShowSuggestions(false);
      setSuggestions([]);
      setIsLoadingSuggestions(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onManualSearch) {
      onManualSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };
  
  const handleSuggestionClick = (suggestion: { placeId?: string; name: string; address?: string }) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    if (suggestion.placeId && onSelectPlace) {
      onSelectPlace(suggestion.placeId, suggestion.name);
    } else if (onManualSearch) {
      onManualSearch(suggestion.name);
    }
  };
  
  const categories = [
    {
      id: 'bars' as const,
      icon: Wine,
      title: 'Bars & Drinks',
      bgColor: 'bg-purple-500',
    },
    {
      id: 'cafes' as const,
      icon: Coffee,
      title: 'Cafes & Bakery',
      bgColor: 'bg-amber-500',
    },
    {
      id: 'desserts' as const,
      icon: IceCreamCone,
      title: 'Desserts',
      bgColor: 'bg-pink-500',
    },
    {
      id: 'pizza' as const,
      icon: Pizza,
      title: 'Pizza',
      bgColor: 'bg-orange-600',
    },
    {
      id: 'restaurants' as const,
      icon: Utensils,
      title: 'Restaurants',
      bgColor: 'bg-orange-500',
    },
    {
      id: 'seafood' as const,
      icon: Fish,
      title: 'Sea Food',
      bgColor: 'bg-cyan-500',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      
      {/* Image Hero Section - Mobile Only */}
      <div className="lg:hidden relative min-h-screen overflow-hidden">
        <img
          src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/bkg.jpg"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/35" />
        
        {/* Hero Content */}
        <div className="relative h-full flex flex-col px-6 pt-16 pb-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/favcon.png"
                alt="MenuLove"
                className="w-12 h-12 rounded-2xl"
              />
              <h2 className="text-2xl font-black text-white tracking-tight">MenuLove</h2>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight leading-tight">
              Discover <span className="text-orange-500">Local Flavors</span>
            </h1>
            <p className="text-white/80 text-base leading-relaxed">
              Discover restaurants, cafes and bars near you,<br/>within a 5km radius.
            </p>
          </div>

          {/* Partner CTA */}
          <div className="text-center mb-7">
            <a
              href="/become-a-partner"
              className="inline-flex items-center gap-2 text-white/80 text-sm font-medium hover:text-white transition-colors group"
            >
              <Crown size={16} className="text-orange-400" />
              <span>Own a restaurant? Join as a partner and showcase your menu with video</span>
              <ChevronDown size={16} className="text-orange-400 rotate-[-90deg]" />
            </a>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                    <MapPin size={22} className="text-orange-500" />
                  </div>
                  <div className="h-8 w-px bg-zinc-200" />
                  <div className="flex items-center gap-2 flex-1">
                    <Search size={18} className="text-zinc-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => { if (searchQuery.trim().length >= 2 && suggestions.length > 0) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Search restaurants, cuisines..."
                      className="flex-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none bg-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!searchQuery.trim()}
                    className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Search size={18} className="text-white" />
                  </button>
                </div>
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden z-20">
                  {isLoadingSuggestions && suggestions.length === 0 ? (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Loader2 size={16} className="text-orange-500 animate-spin" />
                      <span className="text-sm text-zinc-400">Searching...</span>
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.placeId || index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-zinc-100 last:border-0"
                      >
                        <MapPin size={16} className="text-orange-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-zinc-900 block truncate">{suggestion.name}</span>
                          {suggestion.address && (
                            <span className="text-xs text-zinc-400 block truncate">{suggestion.address}</span>
                          )}
                        </div>
                      </button>
                    ))
                  ) : !isLoadingSuggestions && searchQuery.trim().length >= 2 ? (
                    <div className="px-4 py-3 text-sm text-zinc-400">No restaurants found</div>
                  ) : null}
                </div>
              )}
            </div>
          </form>

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 mb-7 text-white/70 text-xs">
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 hover:text-white transition-colors active:scale-95"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>6 restaurants nearby</span>
            </button>
            <div className="flex items-center gap-1.5">
              <Video size={14} className="text-orange-400" />
              <span>1 with video menus</span>
            </div>
          </div>

          {/* Category Cards Grid - 3x2 on Video */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    console.log('[FilterSelection] Selecting category:', category.id);
                    onSelect(category.id as 'restaurants' | 'cafes' | 'bars' | 'desserts' | 'pizza' | 'seafood' | 'all');
                  }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all duration-200 group animate-fade-in"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon size={24} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[10px] font-bold text-white text-center leading-tight">
                    {category.title}
                  </h3>
                </button>
              );
            })}
          </div>

          {/* Explore Button */}
          <div className="flex justify-center mb-12">
            <button
              onClick={onSkip}
              className="flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <span className="text-xs font-medium">Explore</span>
              <div className="w-10 h-10 border-2 border-white/40 rounded-full flex items-center justify-center">
                <ChevronDown size={18} className="animate-bounce" />
              </div>
            </button>
          </div>

          {/* Footer Disclaimer - On Video */}
          <div className="flex-1 flex items-end justify-center pb-8">
            <div className="text-center space-y-3 px-4">
              <p className="text-[10px] text-white/70 leading-relaxed">
                <span className="text-orange-400 font-bold">Beta Version:</span> MenuLove is currently in beta testing. We're working hard to deliver the best experience for Australian restaurants. Your feedback helps us improve and build the perfect platform for showcasing your culinary creations. Join us in revolutionizing how restaurants connect with customers through video menus.
              </p>
              <p className="text-[10px] text-white/70 leading-relaxed">
                If you have any questions, feel free to{' '}
                <a href="/contact" className="text-orange-400 hover:text-orange-300 transition-colors font-medium underline">
                  contact us here
                </a>.
              </p>
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div>
                  <a 
                    href="/partner" 
                    className="text-[10px] text-white/50 hover:text-orange-400 transition-colors font-medium"
                  >
                    Partner Portal
                  </a>
                  <span className="text-white/30"> | </span>
                  <a 
                    href="/terms" 
                    className="text-[10px] text-white/50 hover:text-orange-400 transition-colors font-medium"
                  >
                    Terms
                  </a>
                  <span className="text-white/30"> | </span>
                  <a 
                    href="/content-moderation" 
                    className="text-[10px] text-white/50 hover:text-orange-400 transition-colors font-medium"
                  >
                    Content Moderation
                  </a>
                </div>
                <p className="text-[10px] text-white/50">
                  Made with ❤️ in Australia | <a href="mailto:contact@menulove.com.au" className="text-orange-400 hover:text-orange-300 transition-colors">contact@menulove.com.au</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Hero - Only visible on desktop */}
      <div className="hidden lg:block pt-20 pb-10 text-center">
        <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-6">MenuLove</h2>
        <h1 className="text-5xl font-extrabold text-zinc-900 mb-4 tracking-tight leading-tight">
          Discover Local
          <span className="block bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Flavors</span>
        </h1>
        <p className="text-zinc-600 text-lg font-medium">
          Discover restaurants, cafes and bars near you
        </p>
      </div>
    </div>
  );
};

export default FilterSelectionScreen;
