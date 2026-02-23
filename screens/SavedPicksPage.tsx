import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Bookmark, X } from 'lucide-react';

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

interface SavedPicksPageProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    cuisine: string;
    menuItems: MenuItem[];
  };
}

const SavedPicksPage: React.FC<SavedPicksPageProps> = ({ restaurant }) => {
  const [savedItems, setSavedItems] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(`saved_dishes_${restaurant.id}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; name: string } | null>(null);

  const toggleSave = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      localStorage.setItem(`saved_dishes_${restaurant.id}`, JSON.stringify([...next]));
      return next;
    });
  };

  const handleBack = () => {
    window.location.href = `/r/${restaurant.slug}`;
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.videoUrl && item.videoUrl !== '') {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get('from');
      const fromQuery = fromParam === 'profile' ? 'from=profile' : 'from=saved';
      window.location.href = `/r/${restaurant.slug}/menu?${fromQuery}&dish=${item.id}`;
    } else if (item.photoUrl) {
      setLightboxPhoto({ url: item.photoUrl, name: item.name });
    }
  };

  // Filter to only show items that are still saved
  const displayItems = restaurant.menuItems.filter(item => savedItems.has(item.id));

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
            <h1 className="text-lg font-bold text-zinc-900">Your Picks</h1>
            <p className="text-xs text-zinc-500">{restaurant.name} • {displayItems.length} saved items</p>
          </div>
        </div>
      </div>

      {/* Saved Items */}
      <div className="pb-20">
        {displayItems.length > 0 ? (
          <div className="divide-y divide-zinc-100">
            {displayItems.map(item => (
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
                  {item.videoUrl && item.videoUrl !== '' && (
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

                {/* Price & Unsave */}
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
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <span className="text-4xl mb-4">📌</span>
            <h3 className="text-lg font-bold text-zinc-900 mb-1">No saved items yet</h3>
            <p className="text-sm text-zinc-500 mb-6">Save items from the full menu to see them here</p>
            <a
              href={`/r/${restaurant.slug}/full-menu`}
              className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Browse Full Menu
            </a>
          </div>
        )}
      </div>

      {/* Bottom Bar - Back to Full Menu */}
      {displayItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-4 py-3 z-30">
          <a
            href={`/r/${restaurant.slug}/full-menu`}
            className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Browse Full Menu
          </a>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button 
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-10"
          >
            <X size={24} />
          </button>
          <div className="relative max-w-lg w-full">
            <img 
              src={lightboxPhoto.url} 
              alt={lightboxPhoto.name}
              className="w-full rounded-2xl object-contain max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center font-semibold mt-4 text-lg">{lightboxPhoto.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedPicksPage;
