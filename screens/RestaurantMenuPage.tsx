import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, ChevronUp, Star, MapPin, Globe, Navigation } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  videoUrl: string;
  price?: number;
}

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  address: string;
  rating: number;
  totalReviews: number;
  logoUrl?: string;
  coverPhotoUrl?: string;
  googleMapsUrl?: string;
  website?: string;
  menuItems: MenuItem[];
  categories: string[];
}

interface RestaurantMenuPageProps {
  restaurant: RestaurantData;
}

const RestaurantMenuPage: React.FC<RestaurantMenuPageProps> = ({ restaurant }) => {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter items by category
  const filteredItems = activeCategory 
    ? restaurant.menuItems.filter(item => item.category === activeCategory)
    : restaurant.menuItems;

  // Handle scroll to update active video
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    const itemHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    if (newIndex !== activeVideoIndex && newIndex >= 0 && newIndex < filteredItems.length) {
      setActiveVideoIndex(newIndex);
    }
  };

  // Play/pause videos based on active index
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === activeVideoIndex && isPlaying) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        video.muted = isMuted;
      }
    });
  }, [activeVideoIndex, isMuted, isPlaying, filteredItems]);

  // Reset video index when category changes
  useEffect(() => {
    setActiveVideoIndex(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeCategory]);

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      {/* Header - Restaurant Info */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6 pt-12">
        <div className="flex items-center gap-4">
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt={restaurant.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{restaurant.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg leading-tight">{restaurant.name}</h1>
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <span>{restaurant.cuisine}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Star size={10} className="text-amber-400" fill="currentColor" />
                <span>{restaurant.rating}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        {restaurant.categories.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === null 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              All
            </button>
            {restaurant.categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === category 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Feed - Vertical Scroll */}
      <div 
        ref={scrollRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >
        {filteredItems.map((item, index) => (
          <div key={item.id} className="h-screen w-full snap-start relative">
            {/* Video */}
            <video
              ref={el => videoRefs.current[index] = el}
              src={item.videoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            {/* Item Info */}
            <div className="absolute bottom-32 left-0 right-0 p-6">
              <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">{item.category}</span>
              <h2 className="text-white text-2xl font-black mt-1">{item.name}</h2>
              {item.description && (
                <p className="text-white/70 text-sm mt-2 line-clamp-2">{item.description}</p>
              )}
              {item.price && (
                <p className="text-white font-bold text-lg mt-2">${item.price.toFixed(2)}</p>
              )}
            </div>

            {/* Right side controls */}
            <div className="absolute right-4 bottom-40 flex flex-col items-center gap-4">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>

            {/* Swipe indicator */}
            {index < filteredItems.length - 1 && index === activeVideoIndex && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                <ChevronUp className="w-6 h-6 text-white/50 animate-bounce" />
              </div>
            )}
          </div>
        ))}

        {/* End card */}
        {filteredItems.length > 0 && (
          <div className="h-screen w-full snap-start flex flex-col items-center justify-center p-8 bg-gradient-to-b from-black to-zinc-900">
            <div className="text-center">
              {restaurant.logoUrl ? (
                <img src={restaurant.logoUrl} alt={restaurant.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-6 border-2 border-white/20" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-6">
                  <span className="text-white font-bold text-3xl">{restaurant.name.charAt(0)}</span>
                </div>
              )}
              <h2 className="text-white text-2xl font-black mb-2">{restaurant.name}</h2>
              <p className="text-white/60 text-sm mb-8">Thanks for watching our menu!</p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                {restaurant.googleMapsUrl && (
                  <a 
                    href={restaurant.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-white text-black font-bold py-4 px-6 rounded-2xl"
                  >
                    <Navigation size={18} />
                    Get Directions
                  </a>
                )}
                {restaurant.website && (
                  <a 
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 px-6 rounded-2xl"
                  >
                    <Globe size={18} />
                    Visit Website
                  </a>
                )}
              </div>

              <p className="text-white/40 text-xs mt-8">
                Powered by LocalBites
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video counter */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-2">
          <span className="text-white text-xs font-bold">
            {activeVideoIndex + 1} / {filteredItems.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantMenuPage;
