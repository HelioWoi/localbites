
import React, { useState, useEffect } from 'react';
import { Search, Navigation, MapPin, ChevronRight, Utensils, Loader2 } from 'lucide-react';
import { UserLocation } from '../types';
import { getPartnerRestaurants } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

interface LocationSelectorProps {
  onLocationSelect: (loc: UserLocation) => void;
}

interface NearbyRegion {
  name: string;
  lat: number;
  lng: number;
  img: string;
  distance?: string;
  distanceKm?: number;
}

// Default beach/location images for dynamic regions (4 images for 4 directions)
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&q=80&w=400',
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

// Generate nearby points in different directions from user location
const generateNearbyPoints = (lat: number, lng: number): { lat: number; lng: number; direction: string }[] => {
  const offset = 0.03; // ~3km offset
  return [
    { lat: lat + offset, lng: lng, direction: 'North' },
    { lat: lat - offset, lng: lng, direction: 'South' },
    { lat: lat, lng: lng + offset, direction: 'East' },
    { lat: lat, lng: lng - offset, direction: 'West' },
    { lat: lat + offset, lng: lng + offset, direction: 'Northeast' },
    { lat: lat - offset, lng: lng - offset, direction: 'Southwest' },
  ];
};

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const selectedRadius = 5; // Fixed at 5km for cost optimization
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyRegions, setNearbyRegions] = useState<NearbyRegion[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);

  // Get user's location on mount and fetch nearby regions
  useEffect(() => {
    const defaultLat = -26.6811;
    const defaultLng = 153.1214;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          
          // Fetch nearby regions using reverse geocoding
          await fetchNearbyRegions(lat, lng);
        },
        async (error) => {
          // Silently use default location (Mooloolaba) if geolocation fails
          console.log('Geolocation not available, using default location');
          setUserLat(defaultLat);
          setUserLng(defaultLng);
          await fetchNearbyRegions(defaultLat, defaultLng);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    } else {
      // Fallback if geolocation not available
      setUserLat(defaultLat);
      setUserLng(defaultLng);
      fetchNearbyRegions(defaultLat, defaultLng);
    }
  }, []);

  // Fetch nearby regions using Google Places API via Edge Function
  const fetchNearbyRegions = async (lat: number, lng: number) => {
    setLoadingRegions(true);
    const nearbyPoints = generateNearbyPoints(lat, lng);
    
    try {
      const regions: NearbyRegion[] = [];
      const seenNames = new Set<string>();

      // Try to use Supabase Edge Function to get place names
      try {
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: {
            action: 'getNearbyLocalities',
            lat,
            lng,
            points: nearbyPoints
          }
        });

        if (!error && data?.localities && data.localities.length > 0) {
          data.localities.forEach((locality: any, index: number) => {
            if (!seenNames.has(locality.name) && regions.length < 4) {
              seenNames.add(locality.name);
              const distKm = calculateDistance(lat, lng, locality.lat, locality.lng);
              regions.push({
                name: locality.name,
                lat: locality.lat,
                lng: locality.lng,
                img: DEFAULT_IMAGES[index % DEFAULT_IMAGES.length],
                distanceKm: distKm,
                distance: distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${Math.round(distKm)}km`
              });
            }
          });
        } else if (error) {
          console.log('Edge Function not available, using generic regions');
        }
      } catch (edgeFunctionError) {
        console.log('Edge Function error, using generic regions');
      }

      // Always ensure we have 4 regions (fill with generic ones if needed)
      if (regions.length < 4) {
        nearbyPoints.slice(0, 4 - regions.length).forEach((point, index) => {
          const distKm = calculateDistance(lat, lng, point.lat, point.lng);
          regions.push({
            name: `${point.direction} Area`,
            lat: point.lat,
            lng: point.lng,
            img: DEFAULT_IMAGES[(regions.length + index) % DEFAULT_IMAGES.length],
            distanceKm: distKm,
            distance: `${Math.round(distKm)}km`
          });
        });
      }

      setNearbyRegions(regions);
    } catch (error) {
      console.log('Fallback: Using generic nearby regions');
      // Guaranteed fallback to generic regions
      setNearbyRegions(nearbyPoints.slice(0, 4).map((point, index) => ({
        name: `${point.direction} Area`,
        lat: point.lat,
        lng: point.lng,
        img: DEFAULT_IMAGES[index],
        distanceKm: 3,
        distance: '3km'
      })));
    } finally {
      setLoadingRegions(false);
    }
  };

  const suggestions = nearbyRegions;

  // Load all restaurants on mount
  useEffect(() => {
    const loadRestaurants = async () => {
      const restaurants = await getPartnerRestaurants();
      setAllRestaurants(restaurants);
    };
    loadRestaurants();
  }, []);

  // Filter restaurants as user types with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length > 0) {
        const lowerQuery = query.toLowerCase();
        const filtered = allRestaurants.filter(r => 
          r.name?.toLowerCase().includes(lowerQuery) ||
          r.cuisine?.toLowerCase().includes(lowerQuery) ||
          r.address?.toLowerCase().includes(lowerQuery)
        );
        setSearchResults(filtered.slice(0, 10)); // Limit results
      } else {
        setSearchResults([]);
      }
    }, 150); // 150ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [query, allRestaurants]);

  const handleUseCurrent = () => {
    if (navigator.geolocation) {
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Show animation for 5 seconds before navigating
          setTimeout(() => {
            onLocationSelect({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              name: 'Current Location',
              radius: selectedRadius * 1000
            });
          }, 5000);
        },
        () => {
          // If geolocation fails, use saved location or default (Mooloolaba)
          const lat = userLat || -26.6811;
          const lng = userLng || 153.1214;
          setTimeout(() => {
            onLocationSelect({
              lat,
              lng,
              name: 'Current Location',
              radius: selectedRadius * 1000
            });
          }, 5000);
        }
      );
    } else {
      // Fallback if geolocation not available
      setIsSearching(true);
      const lat = userLat || -26.6811;
      const lng = userLng || 153.1214;
      setTimeout(() => {
        onLocationSelect({
          lat,
          lng,
          name: 'Current Location',
          radius: selectedRadius * 1000
        });
      }, 5000);
    }
  };

  const handleRegionSelect = (loc: { lat: number; lng: number; name: string }) => {
    setIsSearching(true);
    // Show animation for 5 seconds before navigating
    setTimeout(() => {
      onLocationSelect({
        ...loc,
        radius: selectedRadius * 1000
      });
    }, 5000);
  };

  // GPS Animation Overlay - Same as SplashScreen intro animation
  if (isSearching) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 text-zinc-900 overflow-hidden">
        <div className="flex flex-col items-center justify-center">
          {/* GPS Pin with pulse animation - Same as SplashScreen */}
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
          
          {/* Animated dots - Same as SplashScreen */}
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
          <p className="text-lg font-bold text-zinc-900">Local Bites</p>
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
      
      {/* Search radius indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-xs text-zinc-400">Search radius: <span className="text-orange-500 font-semibold">5 km</span></span>
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
          ABN 33 234 268 637 • © 2026 Local Bites Australia. All rights reserved.
        </p>
        <a 
          href="mailto:contact@localbites.com.au" 
          className="text-[10px] text-zinc-400/50 hover:text-orange-500 transition-colors mt-1 inline-block"
        >
          contact@localbites.com.au
        </a>
      </div>
    </div>
  );
};

export default LocationSelector;
