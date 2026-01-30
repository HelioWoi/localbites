
import React, { useState, useEffect } from 'react';
import { Search, Navigation, MapPin, ChevronRight, Utensils, Loader2 } from 'lucide-react';
import { UserLocation } from '../types';
import { getPartnerRestaurants } from '../services/supabaseService';

interface LocationSelectorProps {
  onLocationSelect: (loc: UserLocation) => void;
}

// All Sunshine Coast regions with coordinates and images
const ALL_REGIONS = [
  { name: 'Mooloolaba', lat: -26.6811, lng: 153.1214, img: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=80&w=400' },
  { name: 'Alexandra Headland', lat: -26.6667, lng: 153.1000, img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400' },
  { name: 'Maroochydore', lat: -26.6500, lng: 153.0833, img: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&q=80&w=400' },
  { name: 'Caloundra', lat: -26.7986, lng: 153.1283, img: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&q=80&w=400' },
  { name: 'Noosa', lat: -26.3917, lng: 153.0833, img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=400' },
  { name: 'Coolum Beach', lat: -26.5333, lng: 153.0833, img: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&q=80&w=400' },
  { name: 'Buderim', lat: -26.6833, lng: 153.0500, img: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=400' },
  { name: 'Nambour', lat: -26.6269, lng: 152.9594, img: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&q=80&w=400' },
];

// Calculate distance between two points in km
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [selectedRadius, setSelectedRadius] = useState<5 | 10>(5);
  const [userLat, setUserLat] = useState<number>(-26.6811); // Default to Mooloolaba
  const [userLng, setUserLng] = useState<number>(153.1214);
  const [isSearching, setIsSearching] = useState(false);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        () => {} // Silently fail, use default
      );
    }
  }, []);

  // Calculate nearby regions based on user location (show 3 closest)
  const suggestions = ALL_REGIONS
    .map(region => ({
      ...region,
      distanceKm: calculateDistance(userLat, userLng, region.lat, region.lng)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3)
    .map(region => ({
      ...region,
      distance: region.distanceKm < 1 
        ? `${Math.round(region.distanceKm * 1000)}m` 
        : `${Math.round(region.distanceKm)}km`
    }));

  // Load all restaurants on mount
  useEffect(() => {
    const loadRestaurants = async () => {
      const restaurants = await getPartnerRestaurants();
      setAllRestaurants(restaurants);
    };
    loadRestaurants();
  }, []);

  // Filter restaurants as user types
  useEffect(() => {
    if (query.trim().length > 0) {
      const filtered = allRestaurants.filter(r => 
        r.name?.toLowerCase().includes(query.toLowerCase()) ||
        r.cuisine?.toLowerCase().includes(query.toLowerCase()) ||
        r.address?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [query, allRestaurants]);

  const handleUseCurrent = () => {
    if (navigator.geolocation) {
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Show animation for 3 seconds before navigating
          setTimeout(() => {
            onLocationSelect({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              name: 'Current Location',
              radius: selectedRadius * 1000
            });
          }, 3000);
        },
        () => {
          setIsSearching(false);
          alert("Please enable location permissions");
        }
      );
    }
  };

  const handleRegionSelect = (loc: { lat: number; lng: number; name: string }) => {
    setIsSearching(true);
    // Show animation for 3 seconds before navigating
    setTimeout(() => {
      onLocationSelect({
        ...loc,
        radius: selectedRadius * 1000
      });
    }, 3000);
  };

  // GPS Animation Overlay - Same as SplashScreen
  if (isSearching) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 text-zinc-900 overflow-hidden">
        <div className="flex flex-col items-center justify-center">
          {/* GPS Pin with pulse animation */}
          <div className="relative">
            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-orange-500/10 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-orange-500/20 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-orange-500/30 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.6s' }} />
            </div>
            
            {/* Center pin */}
            <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/40">
              <MapPin className="w-8 h-8 text-white animate-bounce" style={{ animationDuration: '1s' }} />
            </div>
          </div>
          
          <h2 className="mt-8 text-xl font-bold text-zinc-800 animate-pulse">
            Finding your location...
          </h2>
          
          <p className="mt-2 text-zinc-400 text-sm font-medium">
            Searching for the best bites nearby
          </p>
          
          {/* Animated dots */}
          <div className="mt-6 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-orange-500 animate-spin" style={{ animationDuration: '2s' }} />
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white p-6 flex flex-col pt-10">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
          <Utensils className="text-white" size={24} />
        </div>
        <div>
          <p className="text-lg font-bold text-zinc-900">LocalBites</p>
          <p className="text-xs text-zinc-500">Discover local flavors</p>
        </div>
      </div>

      <header className="mb-6">
        <h2 className="text-4xl font-black tracking-tighter text-zinc-900 mb-2">Find Food Near You</h2>
        <p className="text-zinc-500 font-medium">Where are you exploring today?</p>
      </header>
      
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input 
          type="text"
          placeholder="Search restaurants, cuisines..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-100 border-none rounded-2xl py-5 pl-12 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
          {searchResults.map((restaurant) => (
            <button
              key={restaurant.id}
              onClick={() => onLocationSelect({ lat: -26.6811, lng: 153.1214, name: restaurant.name })}
              className="w-full flex items-center gap-3 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {restaurant.name?.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() || 'R'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{restaurant.name}</p>
                <p className="text-xs text-zinc-500">{restaurant.cuisine} • {restaurant.address || 'Partner Restaurant'}</p>
              </div>
              <ChevronRight size={18} className="text-orange-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {query && searchResults.length === 0 && (
        <div className="mb-4 p-4 bg-zinc-50 rounded-xl text-center">
          <p className="text-sm text-zinc-500">No restaurants found for "{query}"</p>
        </div>
      )}

      <button 
        onClick={handleUseCurrent}
        className="flex items-center justify-center gap-3 w-full bg-zinc-900 text-white font-bold py-5 px-6 rounded-2xl mb-3 shadow-xl shadow-zinc-900/20 active:scale-[0.98] transition-all"
      >
        <Navigation size={18} fill="currentColor" />
        Use Current Location
      </button>
      
      {/* Radius Toggle */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-xs text-zinc-400">Search radius:</span>
        <div className="flex bg-zinc-100 rounded-full p-1">
          <button
            onClick={() => setSelectedRadius(5)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedRadius === 5
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            5 km
          </button>
          <button
            onClick={() => setSelectedRadius(10)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedRadius === 10
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            10 km
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Nearby Regions</p>
        <div className="space-y-4">
          {suggestions.map((loc) => (
            <button
              key={loc.name}
              onClick={() => handleRegionSelect({ lat: loc.lat, lng: loc.lng, name: loc.name })}
              className="w-full relative h-24 rounded-2xl overflow-hidden group active:scale-[0.98] transition-all"
            >
              <img src={loc.img} className="absolute inset-0 w-full h-full object-cover brightness-75 group-hover:scale-110 transition-transform duration-700" alt={loc.name} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-4 flex flex-col justify-center items-start">
                <span className="text-white font-bold text-lg">{loc.name}</span>
                <span className="text-white/70 text-xs font-medium">{loc.distance} away</span>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                <ChevronRight size={18} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
        <p className="text-[10px] text-zinc-400">
          ABN 33 234 268 637 • © 2026 LocalBites Australia. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LocationSelector;
