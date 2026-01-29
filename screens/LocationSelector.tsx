
import React, { useState } from 'react';
import { Search, Navigation, MapPin, ChevronRight } from 'lucide-react';
import { UserLocation } from '../types';

interface LocationSelectorProps {
  onLocationSelect: (loc: UserLocation) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');

  const suggestions = [
    { name: 'Mooloolaba', distance: '3km', lat: -26.6811, lng: 153.1214, img: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=80&w=400' },
    { name: 'Alexandra Headland', distance: '4km', lat: -26.6667, lng: 153.1000, img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400' },
    { name: 'Noosa', distance: '18km', lat: -26.3917, lng: 153.0833, img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=400' },
  ];

  const handleUseCurrent = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onLocationSelect({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'Current Location'
          });
        },
        () => alert("Please enable location permissions")
      );
    }
  };

  return (
    <div className="h-full w-full bg-white p-6 flex flex-col pt-20">
      <header className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter text-zinc-900 mb-2">Find Food Near You</h2>
        <p className="text-zinc-500 font-medium">Where are you exploring today?</p>
      </header>
      
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input 
          type="text"
          placeholder="Search city or area..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-100 border-none rounded-2xl py-5 pl-12 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
        />
      </div>

      <button 
        onClick={handleUseCurrent}
        className="flex items-center justify-center gap-3 w-full bg-zinc-900 text-white font-bold py-5 px-6 rounded-2xl mb-10 shadow-xl shadow-zinc-900/20 active:scale-[0.98] transition-all"
      >
        <Navigation size={18} fill="currentColor" />
        Use Current Location
      </button>

      <div className="flex-1 overflow-y-auto">
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Nearby Regions</p>
        <div className="space-y-4">
          {suggestions.map((loc) => (
            <button
              key={loc.name}
              onClick={() => onLocationSelect({ lat: loc.lat, lng: loc.lng, name: loc.name })}
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
    </div>
  );
};

export default LocationSelector;
