import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Search, Bookmark } from 'lucide-react';
import DesktopBanner from '../components/DesktopBanner';

// Component to generate a thumbnail from a video
const VideoThumbnail: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = src;

    const handleSeeked = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = video.videoWidth || 160;
      canvas.height = video.videoHeight || 160;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setReady(true);
      }
      video.removeEventListener('seeked', handleSeeked);
      video.src = '';
      video.load();
    };

    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('loadeddata', () => {
      video.currentTime = 0.5;
    });
    video.load();

    return () => {
      video.removeEventListener('seeked', handleSeeked);
      video.src = '';
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full object-cover ${ready ? '' : 'bg-zinc-200'}`}
      style={{ objectFit: 'cover' }}
    />
  );
};

interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  videoUrl?: string;
  photoUrl?: string;
}

interface FullMenuPageProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    cuisine: string;
    categories: string[];
    menuItems: MenuItem[];
  };
}

const FullMenuPage: React.FC<FullMenuPageProps> = ({ restaurant }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedItems, setSavedItems] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(`saved_dishes_${restaurant.id}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const toggleSave = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      localStorage.setItem(`saved_dishes_${restaurant.id}`, JSON.stringify([...next]));
      return next;
    });
  };

  const filteredItems = restaurant.menuItems.filter(item => {
    const matchesCategory = !activeCategory || item.category === activeCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group items by category
  const groupedItems: Record<string, MenuItem[]> = {};
  filteredItems.forEach(item => {
    const cat = item.category || 'Other';
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  const handleBack = () => {
    // Navigate to restaurant profile
    window.location.href = `/r/${restaurant.slug}`;
  };

  const handleVideoClick = (item: MenuItem) => {
    if (item.videoUrl) {
      window.location.href = `/r/${restaurant.slug}/menu?from=full-menu&dish=${item.id}`;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <DesktopBanner />
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-zinc-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-zinc-800" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-zinc-900">{restaurant.name}</h1>
            <p className="text-xs text-zinc-500">{restaurant.cuisine} • Full Menu</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder={`Search in ${restaurant.name}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
        </div>

        {/* Category Tabs */}
        {restaurant.categories.length > 1 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                !activeCategory
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              All
            </button>
            {restaurant.categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="pb-20">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            {/* Category Header */}
            {!activeCategory && (
              <div className="px-4 pt-6 pb-2">
                <h2 className="text-lg font-bold text-zinc-900">{category}</h2>
                <p className="text-xs text-zinc-400">{items.length} items</p>
              </div>
            )}

            {/* Items */}
            <div className="divide-y divide-zinc-100">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-4 px-4 py-4 hover:bg-zinc-50 transition-colors"
                  onClick={() => handleVideoClick(item)}
                >
                  {/* Photo / Video Thumbnail */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-100">
                    {item.photoUrl ? (
                      <img 
                        src={item.photoUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : item.videoUrl ? (
                      <VideoThumbnail src={item.videoUrl} alt={item.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    )}
                    {item.videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                          <Play size={14} className="text-orange-500 ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Name & Description */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-900 truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  {/* Price & Save */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {item.price > 0 && (
                      <span className="text-sm font-bold text-zinc-900">
                        ${item.price.toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={(e) => toggleSave(item.id, e)}
                      className="p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                    >
                      <Bookmark 
                        size={18} 
                        className={savedItems.has(item.id) ? 'text-orange-500' : 'text-zinc-300'}
                        fill={savedItems.has(item.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <span className="text-4xl mb-4">🔍</span>
            <h3 className="text-lg font-bold text-zinc-900 mb-1">No items found</h3>
            <p className="text-sm text-zinc-500">Try a different search or category</p>
          </div>
        )}
      </div>

      {/* Bottom Bar - Back to Video Menu */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-4 py-3 z-30">
        <button
          onClick={handleBack}
          className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <Play size={18} fill="currentColor" />
          Watch Video Menu
        </button>
      </div>
    </div>
  );
};

export default FullMenuPage;
