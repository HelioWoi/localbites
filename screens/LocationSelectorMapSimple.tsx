
import React, { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, ChevronRight } from 'lucide-react';
import { UserLocation } from '../types';
import { supabase } from '../lib/supabase';

interface LocationSelectorMapSimpleProps {
  onLocationSelect: (loc: UserLocation) => void;
}

interface RegionData {
  name: string;
  lat: number;
  lng: number;
  restaurantCount: number;
}

const LocationSelectorMapSimple: React.FC<LocationSelectorMapSimpleProps> = ({ onLocationSelect }) => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLat, setUserLat] = useState<number>(-26.6811);
  const [userLng, setUserLng] = useState<number>(153.1214);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const selectedRadius = 5;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          fetchNearbyRegions(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          fetchNearbyRegions(-26.6811, 153.1214);
        }
      );
    } else {
      fetchNearbyRegions(-26.6811, 153.1214);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'map' && mapContainerRef.current && !mapRef.current) {
      initializeMap();
    }
  }, [viewMode, userLat, userLng, regions]);

  const initializeMap = () => {
    if (typeof window === 'undefined' || !(window as any).L) {
      console.error('Leaflet not loaded');
      return;
    }

    const L = (window as any).L;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map(mapContainerRef.current).setView([userLat, userLng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // User location marker (blue dot)
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div style="width: 20px; height: 20px; background: #4A90E2; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(74, 144, 226, 0.5);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker([userLat, userLng], { icon: userIcon })
      .addTo(map)
      .bindPopup('Your Location');

    // Radius circle
    L.circle([userLat, userLng], {
      color: '#FF6B35',
      fillColor: '#FF6B35',
      fillOpacity: 0.1,
      radius: selectedRadius * 1000
    }).addTo(map);

    // Region markers
    regions.forEach(region => {
      const size = region.restaurantCount > 99 ? 70 : region.restaurantCount > 9 ? 60 : 50;
      const fontSize = region.restaurantCount > 99 ? '18px' : region.restaurantCount > 9 ? '20px' : '24px';
      
      const regionIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${fontSize};
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
            border: 3px solid white;
            cursor: pointer;
          ">
            ${region.restaurantCount}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      L.marker([region.lat, region.lng], { icon: regionIcon })
        .addTo(map)
        .bindPopup(`<div style="text-align: center;"><strong>${region.name}</strong><br>${region.restaurantCount} restaurants</div>`)
        .on('click', () => handleRegionClick(region));
    });

    mapRef.current = map;
  };

  const fetchNearbyRegions = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const nearbyPoints = generateNearbyPoints(lat, lng);
      
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: {
          action: 'getNearbyLocalities',
          lat,
          lng,
          points: nearbyPoints
        }
      });

      if (!error && data?.localities) {
        const regionsWithCounts = await Promise.all(
          data.localities.map(async (locality: any) => {
            const count = await getRestaurantCount(locality.lat, locality.lng);
            return {
              name: locality.name,
              lat: locality.lat,
              lng: locality.lng,
              restaurantCount: count
            };
          })
        );
        
        setRegions(regionsWithCounts.filter(r => r.restaurantCount > 0));
      } else {
        const fallbackRegions = [
          { name: 'Mooloolaba', lat: -26.6811, lng: 153.1214, restaurantCount: 15 },
          { name: 'Maroochydore', lat: -26.6563, lng: 153.0896, restaurantCount: 23 },
          { name: 'Caloundra', lat: -26.7989, lng: 153.1289, restaurantCount: 18 },
          { name: 'Noosa', lat: -26.3906, lng: 153.0927, restaurantCount: 12 },
        ];
        setRegions(fallbackRegions);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
      const fallbackRegions = [
        { name: 'Mooloolaba', lat: -26.6811, lng: 153.1214, restaurantCount: 15 },
        { name: 'Maroochydore', lat: -26.6563, lng: 153.0896, restaurantCount: 23 },
        { name: 'Caloundra', lat: -26.7989, lng: 153.1289, restaurantCount: 18 },
      ];
      setRegions(fallbackRegions);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNearbyPoints = (lat: number, lng: number) => {
    const offset = 0.05;
    return [
      { lat: lat + offset, lng: lng, direction: 'North' },
      { lat: lat - offset, lng: lng, direction: 'South' },
      { lat: lat, lng: lng + offset, direction: 'East' },
      { lat: lat, lng: lng - offset, direction: 'West' },
    ];
  };

  const getRestaurantCount = async (lat: number, lng: number): Promise<number> => {
    // Return 0 for now - will be updated with real count when implemented
    return 0;
  };

  const handleUseCurrentLocation = () => {
    onLocationSelect({
      lat: userLat,
      lng: userLng,
      name: 'Current Location',
      radius: selectedRadius * 1000
    });
  };

  const handleRegionClick = (region: RegionData) => {
    onLocationSelect({
      lat: region.lat,
      lng: region.lng,
      name: region.name,
      radius: selectedRadius * 1000
    });
  };

  return (
    <div className="h-full w-full bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <MapPin className="text-white" size={20} />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Find Food Near You</h2>
        </div>
        
        <div className="flex gap-2 bg-zinc-100 rounded-full p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'map'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Map View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' ? (
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 z-50">
              <div className="flex flex-col items-center gap-3">
                <Navigation className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-zinc-600 font-medium">Loading map...</p>
              </div>
            </div>
          ) : (
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
          )}
          
          {/* Bottom controls card */}
          <div className="absolute bottom-6 left-4 right-4 z-[1000]">
            <div className="bg-white rounded-3xl shadow-xl p-4">
              <button
                onClick={handleUseCurrentLocation}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <MapPin size={20} />
                Use Current Location
              </button>
              
              <div className="flex items-center justify-center mt-3">
                <span className="text-sm text-zinc-600">{selectedRadius} km radius</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
              Nearby Regions
            </h3>
            <div className="space-y-3">
              {regions.map((region, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRegionClick(region)}
                  className="w-full bg-zinc-50 hover:bg-zinc-100 rounded-2xl p-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {region.restaurantCount}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-zinc-900">{region.name}</p>
                      <p className="text-sm text-zinc-500">{region.restaurantCount} restaurants</p>
                    </div>
                  </div>
                  <ChevronRight className="text-zinc-400" size={20} />
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleUseCurrentLocation}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <MapPin size={20} />
            Use Current Location
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationSelectorMapSimple;
