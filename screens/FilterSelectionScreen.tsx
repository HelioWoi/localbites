import React, { useState, useRef } from 'react';
import { Utensils, Coffee, Wine, IceCreamCone, Pizza, Fish, Search, MapPin, Loader2 } from 'lucide-react';
import DesktopBanner from '../components/DesktopBanner';
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
  const autocompleteRef = useRef<NodeJS.Timeout | null>(null);
  
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
      subtitle: 'Cocktails, Pubs, Nightlife',
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-500/10',
    },
    {
      id: 'cafes' as const,
      icon: Coffee,
      title: 'Cafes & Bakery',
      subtitle: 'Coffee, Breakfast, Pastries',
      gradient: 'from-amber-500 to-yellow-500',
      iconBg: 'bg-amber-500/10',
    },
    {
      id: 'desserts' as const,
      icon: IceCreamCone,
      title: 'Desserts',
      subtitle: 'Ice Cream, Cakes, Sweets',
      gradient: 'from-pink-400 to-rose-500',
      iconBg: 'bg-pink-500/10',
    },
    {
      id: 'pizza' as const,
      icon: Pizza,
      title: 'Pizza',
      subtitle: 'Pizzerias, Italian, Slices',
      gradient: 'from-red-500 to-orange-500',
      iconBg: 'bg-red-500/10',
    },
    {
      id: 'restaurants' as const,
      icon: Utensils,
      title: 'Restaurants',
      subtitle: 'Sushi, Thai, Mexican...',
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-500/10',
    },
    {
      id: 'seafood' as const,
      icon: Fish,
      title: 'Sea Food',
      subtitle: 'Fish, Prawns, Oysters',
      gradient: 'from-cyan-500 to-blue-500',
      iconBg: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Desktop Banner - Only visible on desktop */}
      <DesktopBanner />
      
      <div className="flex-1 flex flex-col items-center justify-start pt-12 px-6 lg:pt-20">
        <div className="w-full max-w-md lg:max-w-4xl">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight gilroy-bold">MenuLove</h2>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-zinc-900 mb-3 tracking-tight">
              Find Your
              <br />
              Next Yum
            </h1>
            <p className="text-zinc-400 text-base">
              Choose a category to explore
            </p>
          </div>

          {/* Manual Search Box */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 z-10" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim().length >= 2 && suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search restaurants, cuisines..."
                className="w-full pl-12 pr-24 py-4 bg-zinc-50 border border-zinc-200 rounded-full text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-orange-500 text-white text-sm font-bold rounded-full hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10"
              >
                Go
              </button>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-zinc-200 overflow-hidden z-20">
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
            <div className="flex items-center justify-center gap-2 mt-3">
              <MapPin size={14} className="text-zinc-400" />
              <span className="text-xs text-zinc-400 font-medium">Search radius: 5km</span>
            </div>
          </form>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    console.log('[FilterSelection] Button clicked:', category.id, 'onOpenAI exists:', !!onOpenAI);
                    console.log('[FilterSelection] Selecting category:', category.id);
                    onSelect(category.id as 'restaurants' | 'cafes' | 'bars' | 'desserts' | 'pizza' | 'seafood' | 'all');
                  }}
                  className="aspect-square bg-zinc-50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-zinc-100 active:scale-95 transition-all duration-200 group border border-zinc-100"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${category.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon size={32} className="text-white" strokeWidth={2} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base font-bold text-zinc-900">
                      {category.title}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>

          {/* See All Button */}
          <button
            onClick={onSkip}
            className="w-full text-orange-500 text-sm font-bold py-4 hover:text-orange-600 transition-colors"
          >
            See All Nearby →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full px-6 pb-8 mt-auto">
        <div className="w-full max-w-md lg:max-w-4xl mx-auto bg-zinc-50 rounded-2xl p-6">
          <div className="text-center space-y-3 opacity-70">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              MenuLove is currently in Beta. We connect you with local businesses and help you discover what's around you. All products, services, pricing, and customer experiences are provided directly by each listed venue. Please visit our{' '}
              <a href="/policy" className="text-orange-500 hover:text-orange-600 transition-colors font-medium">
                Policy
              </a>{' '}
              page for more details.
            </p>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Contact us for any questions -{' '}
              <a href="/contact" className="text-orange-500 hover:text-orange-600 transition-colors font-medium underline">
                Click here
              </a>
            </p>
            <div className="mt-4 pt-3 border-t border-zinc-200">
              <a 
                href="/partner" 
                className="text-[10px] text-zinc-400 hover:text-orange-500 transition-colors font-medium"
              >
                Partner Login
              </a>
              <span className="text-zinc-400"> | </span>
              <a 
                href="/terms" 
                className="text-[10px] text-zinc-400 hover:text-orange-500 transition-colors font-medium"
              >
                Terms
              </a>
              <span className="text-zinc-400"> | </span>
              <a 
                href="/content-moderation" 
                className="text-[10px] text-zinc-400 hover:text-orange-500 transition-colors font-medium"
              >
                Content Moderation
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSelectionScreen;
