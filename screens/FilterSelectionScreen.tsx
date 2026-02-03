import React, { useState } from 'react';
import { Utensils, Coffee, Wine, Sparkles, Search, MapPin } from 'lucide-react';

interface FilterSelectionScreenProps {
  onSelect: (category: 'restaurants' | 'cafes' | 'bars' | 'all') => void;
  onSkip: () => void;
  onManualSearch?: (address: string) => void;
  onOpenAI?: () => void;
}

const FilterSelectionScreen: React.FC<FilterSelectionScreenProps> = ({ onSelect, onSkip, onManualSearch, onOpenAI }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Popular cuisines and restaurant types for suggestions
  const popularSearches = [
    'Pizza', 'Sushi', 'Italian', 'Chinese', 'Thai', 'Mexican', 'Indian', 'Japanese',
    'Burger', 'Cafe', 'Coffee', 'Breakfast', 'Brunch', 'Seafood', 'Steak', 'BBQ',
    'Vegetarian', 'Vegan', 'Dessert', 'Bakery', 'Bar', 'Pub', 'Wine Bar', 'Cocktails'
  ];
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim().length > 0) {
      const filtered = popularSearches.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onManualSearch) {
      onManualSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    if (onManualSearch) {
      onManualSearch(suggestion);
    }
  };
  
  const categories = [
    {
      id: 'restaurants' as const,
      icon: Utensils,
      title: 'Restaurants',
      subtitle: 'Pizza, Sushi, Italian...',
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-500/10',
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
      id: 'bars' as const,
      icon: Wine,
      title: 'Bars & Drinks',
      subtitle: 'Cocktails, Pubs, Nightlife',
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-500/10',
    },
    {
      id: 'ai' as const,
      icon: Sparkles,
      title: 'Ask Bites',
      subtitle: 'AI will help you choose',
      gradient: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-start pt-12 px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">LocalBites</h2>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-zinc-900 mb-3 tracking-tight">
              Find your
              <br />
              next bite
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
                onFocus={() => searchQuery.trim() && setSuggestions(popularSearches.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5))}
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
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-zinc-200 overflow-hidden z-20">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left text-sm text-zinc-900 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-zinc-100 last:border-0"
                    >
                      <Search size={16} className="text-zinc-400" />
                      <span className="font-medium">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <MapPin size={14} className="text-zinc-400" />
              <span className="text-xs text-zinc-400 font-medium">Search radius: 10km</span>
            </div>
          </form>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    console.log('[FilterSelection] Button clicked:', category.id, 'onOpenAI exists:', !!onOpenAI);
                    if (category.id === 'ai' && onOpenAI) {
                      console.log('[FilterSelection] Opening AI modal');
                      onOpenAI();
                    } else if (category.id !== 'ai') {
                      console.log('[FilterSelection] Selecting category:', category.id);
                      onSelect(category.id as 'restaurants' | 'cafes' | 'bars' | 'all');
                    }
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
        <div className="w-full max-w-md mx-auto bg-zinc-50 rounded-2xl p-6">
          <div className="text-center space-y-3 opacity-70">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              LocalBites is a discovery platform that supports local businesses. We do not take responsibility for products, services, pricing, or customer experiences provided by listed venues.
            </p>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Contact us at{' '}
              <a href="mailto:contact@localbites.com.au" className="text-orange-500 hover:text-orange-600 transition-colors font-medium">
                contact@localbites.com.au
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSelectionScreen;
