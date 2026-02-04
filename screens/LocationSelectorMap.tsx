
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Navigation, MapPin, List, Map as MapIcon, ChevronRight } from 'lucide-react';
import { UserLocation } from '../types';
import { supabase } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';

interface LocationSelectorMapProps {
  onLocationSelect: (loc: UserLocation) => void;
}

interface RegionData {
  name: string;
  lat: number;
  lng: number;
  restaurantCount: number;
}

// Custom orange pin marker
const createCustomIcon = (count: number) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${count > 99 ? '70px' : count > 9 ? '60px' : '50px'};
        height: ${count > 99 ? '70px' : count > 9 ? '60px' : '50px'};
        background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${count > 99 ? '18px' : count > 9 ? '20px' : '24px'};
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
        border: 3px solid white;
      ">
        ${count}
      </div>
    `,
    iconSize: [count > 99 ? 70 : count > 9 ? 60 : 50, count > 99 ? 70 : count > 9 ? 60 : 50],
    iconAnchor: [count > 99 ? 35 : count > 9 ? 30 : 25, count > 99 ? 35 : count > 9 ? 30 : 25],
  });
};

// User location marker (blue dot)
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #4A90E2;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.5);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Component to update map view when user location changes
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const LocationSelectorMap: React.FC<LocationSelectorMapProps> = ({ onLocationSelect }) => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLat, setUserLat] = useState<number>(-26.6811); // Default: Mooloolaba
  const [userLng, setUserLng] = useState<number>(153.1214);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapZoom, setMapZoom] = useState(12);
  const selectedRadius = 5; // 5km radius

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          fetchNearbyRegions(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Use default location if geolocation fails
          fetchNearbyRegions(-26.6811, 153.1214);
        }
      );
    } else {
      fetchNearbyRegions(-26.6811, 153.1214);
    }
  }, []);

  // Fetch nearby regions with restaurant counts
  const fetchNearbyRegions = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      // Generate points around user location
      const nearbyPoints = generateNearbyPoints(lat, lng);
      
      // Try to get place names from Edge Function
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: {
          action: 'getNearbyLocalities',
          lat,
          lng,
          points: nearbyPoints
        }
      });

      if (!error && data?.localities) {
        // Get restaurant counts for each locality
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
        // Fallback to generic regions
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
    } finally {
      setIsLoading(false);
    }
  };

  // Generate nearby points
  const generateNearbyPoints = (lat: number, lng: number) => {
    const offset = 0.05; // ~5km offset
    return [
      { lat: lat + offset, lng: lng, direction: 'North' },
      { lat: lat - offset, lng: lng, direction: 'South' },
      { lat: lat, lng: lng + offset, direction: 'East' },
      { lat: lat, lng: lng - offset, direction: 'West' },
    ];
  };

  // Get restaurant count for a location (using partner restaurants from Supabase)
  const getRestaurantCount = async (lat: number, lng: number): Promise<number> => {
    try {
      // Get partner restaurants near this location
      const { data: partners, error } = await supabase
        .from('partners')
        .select('id, latitude, longitude')
        .eq('subscription_status', 'active');
      
      if (error || !partners) return 0;
      
      // Count restaurants within 5km radius
      const radius = 5; // 5km
      const count = partners.filter(p => {
        if (!p.latitude || !p.longitude) return false;
        const distance = calculateDistance(lat, lng, p.latitude, p.longitude);
        return distance <= radius;
      }).length;
      
      // Return actual count of partner restaurants
      return count;
    } catch (error) {
      console.error('Error counting restaurants:', error);
      return 0;
    }
  };
  
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

  const mapCenter: [number, number] = useMemo(() => [userLat, userLng], [userLat, userLng]);

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
        
        {/* Toggle Map/List */}
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
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              
              <MapController center={mapCenter} zoom={mapZoom} />
              
              {/* User location marker */}
              <Marker position={mapCenter} icon={createUserLocationIcon()}>
                <Popup>Your Location</Popup>
              </Marker>
              
              {/* Radius circle */}
              <Circle
                center={mapCenter}
                radius={selectedRadius * 1000}
                pathOptions={{
                  color: '#FF6B35',
                  fillColor: '#FF6B35',
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
              
              {/* Region markers with clustering */}
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50}
              >
                {regions.map((region, idx) => (
                  <Marker
                    key={idx}
                    position={[region.lat, region.lng]}
                    icon={createCustomIcon(region.restaurantCount)}
                    eventHandlers={{
                      click: () => handleRegionClick(region)
                    }}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-bold text-zinc-900">{region.name}</p>
                        <p className="text-sm text-zinc-600">{region.restaurantCount} restaurants</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
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
              
              <div className="flex items-center justify-between mt-3 px-2">
                <span className="text-sm text-zinc-600">{selectedRadius} km radius</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMapZoom(z => Math.min(z + 1, 18))}
                    className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-700 hover:bg-zinc-200 transition-colors"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setMapZoom(z => Math.max(z - 1, 8))}
                    className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-700 hover:bg-zinc-200 transition-colors"
                  >
                    −
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View - Original design */
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

export default LocationSelectorMap;
