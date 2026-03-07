import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Search, Bookmark, X, ShoppingBag } from 'lucide-react';
import { trackEvent } from '../services/eventsService';

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
  dish_order_url?: string;
}

interface FullMenuPageProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    cuisine: string;
    categories: string[];
    menuItems: MenuItem[];
    ordering_url?: string;
    enable_ordering_button?: boolean;
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

  const handleOrderNow = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const orderUrl = item.dish_order_url || restaurant.ordering_url;
    if (!orderUrl) return;

    trackEvent({
      restaurantId: restaurant.id,
      eventType: 'order_button_click',
      eventValue: item.id,
    });

    window.location.href = orderUrl;
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
    const pathname = window.location.pathname;
    const isDemoRoute = pathname.startsWith('/demo/');
    const isQRRoute = pathname.startsWith('/r/');
    
    if (isDemoRoute) {
      // Demo route (/demo/:slug/full-menu) - go back to /demo/:slug
      window.location.href = `/demo/${restaurant.slug}`;
    } else if (isQRRoute) {
      // QR code route (/r/:slug/full-menu) - go back to /r/:slug
      window.location.href = `/r/${restaurant.slug}`;
    } else {
      // App feed route (/:slug/full-menu) - go back to /:slug
      window.location.href = `/${restaurant.slug}`;
    }
  };

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const handleItemClick = (item: MenuItem) => {
    // Track item view
    trackEvent({
      restaurantId: restaurant.id,
      eventType: 'item_view',
      eventValue: item.id,
    });

    if (item.videoUrl) {
      const pathname = window.location.pathname;
      const isDemoRoute = pathname.startsWith('/demo/');
      const isQRRoute = pathname.startsWith('/r/');
      const prefix = isDemoRoute ? '/demo/' : isQRRoute ? '/r/' : '/';
      window.location.href = `${prefix}${restaurant.slug}/menu?from=full-menu&dish=${item.id}`;
    } else {
      setSelectedItem(item);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-zinc-100" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
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
                  className="flex items-center gap-4 px-4 py-4 hover:bg-zinc-50 transition-colors cursor-pointer"
                  onClick={() => handleItemClick(item)}
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

                  {/* Price & Actions */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {item.price > 0 && (
                      <span className="text-sm font-bold text-zinc-900">
                        ${item.price.toFixed(2)}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {restaurant.enable_ordering_button && (item.dish_order_url || restaurant.ordering_url) && (
                        <button
                          onClick={(e) => handleOrderNow(item, e)}
                          className="p-1.5 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors"
                        >
                          <ShoppingBag size={18} className="text-white" />
                        </button>
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
          onClick={() => { 
            const pathname = window.location.pathname;
            const isAppFeedRoute = !pathname.startsWith('/r/');
            const prefix = isAppFeedRoute ? '/' : '/r/';
            window.location.href = `${prefix}${restaurant.slug}/menu?from=full-menu`;
          }}
          className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <Play size={18} fill="currentColor" />
          Watch Video Menu
        </button>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-zinc-600 hover:bg-white transition-colors shadow-sm"
            >
              <X size={20} />
            </button>

            {/* Photo */}
            {(selectedItem.photoUrl || selectedItem.videoUrl) && (
              <div className="relative w-full aspect-[4/3] bg-zinc-100">
                {selectedItem.photoUrl ? (
                  <img 
                    src={selectedItem.photoUrl} 
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : selectedItem.videoUrl ? (
                  <VideoThumbnail src={selectedItem.videoUrl} alt={selectedItem.name} />
                ) : null}
                {/* Name & Price overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <h2 className="text-xl font-bold text-white">{selectedItem.name}</h2>
                  {selectedItem.price > 0 && (
                    <p className="text-orange-400 font-bold text-lg">${selectedItem.price.toFixed(2)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="p-5 space-y-4">
              {/* No photo fallback header */}
              {!selectedItem.photoUrl && !selectedItem.videoUrl && (
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">{selectedItem.name}</h2>
                  {selectedItem.price > 0 && (
                    <p className="text-orange-500 font-bold text-lg">${selectedItem.price.toFixed(2)}</p>
                  )}
                </div>
              )}

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-zinc-700 leading-relaxed">{selectedItem.description}</p>
                </div>
              )}

              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Category</p>
                <span className="inline-block px-3 py-1 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-full">{selectedItem.category}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={(e) => { toggleSave(selectedItem.id, e); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    savedItems.has(selectedItem.id)
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  <Bookmark size={16} fill={savedItems.has(selectedItem.id) ? 'currentColor' : 'none'} />
                  {savedItems.has(selectedItem.id) ? 'Saved' : 'Save'}
                </button>
                
                {/* Order Button */}
                {restaurant.enable_ordering_button && (selectedItem.dish_order_url || restaurant.ordering_url) && (
                  <button
                    onClick={(e) => { handleOrderNow(selectedItem, e); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition-colors"
                  >
                    <ShoppingBag size={16} />
                    Order
                  </button>
                )}
                
                {selectedItem.videoUrl && (
                  <button
                    onClick={() => { 
                      const pathname = window.location.pathname;
                      const isAppFeedRoute = !pathname.startsWith('/r/');
                      const prefix = isAppFeedRoute ? '/' : '/r/';
                      window.location.href = `${prefix}${restaurant.slug}/menu?from=full-menu&dish=${selectedItem.id}`;
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors"
                  >
                    <Play size={16} fill="currentColor" />
                    Watch Video
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullMenuPage;
