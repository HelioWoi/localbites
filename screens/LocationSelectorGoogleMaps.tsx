
import React, { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, ChevronRight } from 'lucide-react';
import { UserLocation } from '../types';
import { supabase } from '../lib/supabase';

interface LocationSelectorGoogleMapsProps {
  onLocationSelect: (loc: UserLocation) => void;
}

interface RegionData {
  name: string;
  lat: number;
  lng: number;
  restaurantCount: number;
}

const LocationSelectorGoogleMaps: React.FC<LocationSelectorGoogleMapsProps> = ({ onLocationSelect }) => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLat, setUserLat] = useState<number>(-26.6811);
  const [userLng, setUserLng] = useState<number>(153.1214);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const selectedRadius = 5;

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        () => {
          console.log('Using default location');
        }
      );
    }
    
    // Load fallback regions
    setRegions([
      { name: 'Mooloolaba', lat: -26.6811, lng: 153.1214, restaurantCount: 15 },
      { name: 'Maroochydore', lat: -26.6563, lng: 153.0896, restaurantCount: 23 },
      { name: 'Caloundra', lat: -26.7989, lng: 153.1289, restaurantCount: 18 },
      { name: 'Noosa', lat: -26.3906, lng: 153.0927, restaurantCount: 12 },
    ]);
    setIsLoading(false);
  }, []);

  // Initialize map when container is ready and Google Maps is loaded
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current || mapRef.current) return;
    
    const initMap = () => {
      const w = window as any;
      if (!w.google || !w.google.maps) {
        setTimeout(initMap, 200);
        return;
      }
      
      const google = w.google;
      
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: userLat, lng: userLng },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      
      // User location marker
      new google.maps.Marker({
        position: { lat: userLat, lng: userLng },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4A90E2',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Your Location'
      });
      
      // Radius circle
      new google.maps.Circle({
        map: map,
        center: { lat: userLat, lng: userLng },
        radius: selectedRadius * 1000,
        fillColor: '#FF6B35',
        fillOpacity: 0.1,
        strokeColor: '#FF6B35',
        strokeWeight: 2,
      });
      
      // Region markers
      regions.forEach(region => {
        const marker = new google.maps.Marker({
          position: { lat: region.lat, lng: region.lng },
          map: map,
          label: {
            text: String(region.restaurantCount),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 25,
            fillColor: '#FF6B35',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          title: `${region.name} (${region.restaurantCount} restaurants)`
        });
        
        marker.addListener('click', () => {
          handleRegionClick(region);
        });
      });
      
      mapRef.current = map;
      setMapReady(true);
    };
    
    initMap();
  }, [viewMode, userLat, userLng, regions]);

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
        
        <div className="flex gap-1 bg-zinc-100 rounded-full p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'map' ? 'bg-orange-500 text-white' : 'text-zinc-600'
            }`}
          >
            Map View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-zinc-600'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'map' ? (
        <div className="flex-1 relative">
          {/* Google Maps Embed */}
          <iframe
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyBFuwVE7Omu6N3ZV4PHJvLORP0VqNlso3E&center=${userLat},${userLng}&zoom=12&maptype=roadmap`}
          />
          
          {/* Overlay with pins */}
          <div className="absolute inset-0 pointer-events-none">
            {regions.map((region, idx) => {
              // Calculate approximate position (simplified)
              const offsetLat = (region.lat - userLat) * -800;
              const offsetLng = (region.lng - userLng) * 800;
              return (
                <button
                  key={idx}
                  onClick={() => handleRegionClick(region)}
                  className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    top: `calc(50% + ${offsetLat}px)`,
                    left: `calc(50% + ${offsetLng}px)`,
                  }}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg border-3 border-white">
                    {region.restaurantCount}
                  </div>
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-lg shadow text-xs font-medium whitespace-nowrap">
                    {region.name}
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Bottom card */}
          <div className="absolute bottom-6 left-4 right-4 z-10">
            <div className="bg-white rounded-3xl shadow-xl p-4">
              <button
                onClick={handleUseCurrentLocation}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
              >
                <MapPin size={20} />
                Use Current Location
              </button>
              <p className="text-center text-sm text-zinc-500 mt-2">{selectedRadius} km radius</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-4">Nearby Regions</h3>
          <div className="space-y-3">
            {regions.map((region, idx) => (
              <button
                key={idx}
                onClick={() => handleRegionClick(region)}
                className="w-full bg-zinc-50 hover:bg-zinc-100 rounded-2xl p-4 flex items-center justify-between"
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
          
          <button
            onClick={handleUseCurrentLocation}
            className="w-full mt-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            <MapPin size={20} />
            Use Current Location
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationSelectorGoogleMaps;
