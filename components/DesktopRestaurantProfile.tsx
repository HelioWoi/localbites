import React, { useState } from 'react';
import { ChevronLeft, Heart, Bookmark, Share2, Phone, MapPin, Star, Clock, Video, ChevronRight, Instagram, Facebook, Globe } from 'lucide-react';
import { Restaurant } from '../types';
import FullMenuModal from './FullMenuModal';

interface DesktopRestaurantProfileProps {
  restaurant: Restaurant;
  isSaved: boolean;
  isLiked?: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  onToggleLike?: () => void;
  onOpenFullMenu?: () => void;
  onSelectVideo?: (videoId: string) => void;
  isQRRoute?: boolean;
}

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Desserts'];

const DesktopRestaurantProfile: React.FC<DesktopRestaurantProfileProps> = ({
  restaurant,
  isSaved,
  isLiked = false,
  onClose,
  onToggleSave,
  onToggleLike,
  onOpenFullMenu,
  onSelectVideo,
  isQRRoute = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAllHours, setShowAllHours] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [savedVideos, setSavedVideos] = useState<Set<string>>(() => {
    // Load saved dishes from localStorage (synced with FullMenuModal)
    const saved = localStorage.getItem(`saved_dishes_${restaurant.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Sync with localStorage changes (when FullMenuModal saves/removes dishes)
  React.useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(`saved_dishes_${restaurant.id}`);
      if (saved) {
        setSavedVideos(new Set(JSON.parse(saved)));
      } else {
        setSavedVideos(new Set());
      }
    };

    // Listen for custom event from FullMenuModal
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('savedDishesChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('savedDishesChanged', handleStorageChange);
    };
  }, [restaurant.id]);

  const hasVideos = restaurant.dishes && restaurant.dishes.length > 0;

  // Filter to show ONLY videos (not photos) in Video Menus section
  const videoDishes = restaurant.dishes?.filter(d => d.videoUrl && d.videoUrl.length > 0) || [];
  
  // Get unique categories from video dishes only
  const videoCategories = ['All', ...new Set(videoDishes.map(d => d.category).filter(Boolean))] as string[];

  // Filter dishes by category - only show partner's uploaded videos
  const categoryFiltered = selectedCategory === 'All' 
    ? videoDishes 
    : videoDishes.filter(d => d.category === selectedCategory);

  const filteredDishes = categoryFiltered;

  // Get saved videos count
  const savedCount = savedVideos.size;

  const handleShare = () => {
    // Create shareable URL with restaurant ID
    const shareUrl = `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(restaurant.id)}`;
    
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Check out ${restaurant.name} on MenuLove!`,
        url: shareUrl,
      }).catch(() => {});
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={isQRRoute ? undefined : onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center justify-between border-b border-zinc-100">
          <div className="flex items-center gap-3">
            {!isQRRoute && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={20} className="text-zinc-700" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{restaurant.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-orange-500 fill-orange-500" />
                  {restaurant.rating || 4.8}
                </span>
                <span>•</span>
                <span>Various</span>
                <span>•</span>
                <span className="text-orange-500">{restaurant.totalReviews || 544} reviews</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isQRRoute && (
              <>
                <button
                  onClick={onToggleLike}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isLiked ? 'bg-red-50' : 'bg-zinc-100 hover:bg-zinc-200'
                  }`}
                  title="Like"
                >
                  <Heart size={18} className={isLiked ? 'text-red-500 fill-red-500' : 'text-zinc-600'} />
                </button>
                <button
                  onClick={onToggleSave}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isSaved ? 'bg-orange-500 hover:bg-orange-600' : 'bg-zinc-100 hover:bg-zinc-200'
                  }`}
                  title="Save"
                >
                  <Bookmark size={18} className={isSaved ? 'text-white' : 'text-zinc-600'} />
                </button>
              </>
            )}
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors"
            >
              <Share2 size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Hero Photo */}
        {restaurant.mainPhotoUrl && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={restaurant.mainPhotoUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-6">
              <h2 className="text-2xl font-bold text-white">{restaurant.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-white/90">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span>{restaurant.rating || 4.8}</span>
                <span>•</span>
                <span>Various</span>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="px-6 py-4 bg-white border-b border-zinc-100">
          <div className="flex items-start justify-between gap-8">
            {/* Left Side: Distance, Address, Website, Opening Hours */}
            <div className="flex-1 space-y-3">
              {/* Distance and Address Row */}
              <div className="flex items-center gap-4">
                {restaurant.distance && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 rounded-full">
                    <MapPin size={16} className="text-orange-500" />
                    <span className="font-semibold text-sm text-zinc-900">{restaurant.distance}</span>
                  </div>
                )}
                {restaurant.address && (
                  <div className="flex items-center gap-2 text-sm flex-1">
                    <MapPin size={16} className="text-zinc-400 flex-shrink-0" />
                    <span className="text-zinc-600">{restaurant.address}</span>
                  </div>
                )}
              </div>

              {/* Website */}
              {restaurant.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={16} className="text-orange-500" />
                  <a href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {restaurant.website.replace('https://', '').replace('http://', '').replace('www.', '')}
                  </a>
                </div>
              )}

              {/* Social Media Icons */}
              {(restaurant.instagramUrl || restaurant.facebookUrl || restaurant.tiktokUrl) && (
                <div className="flex items-center gap-3">
                  {restaurant.instagramUrl && (
                    <a
                      href={restaurant.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-70 transition-opacity"
                    >
                      <img 
                        src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/insta.png" 
                        alt="Instagram"
                        className="w-6 h-6 grayscale"
                      />
                    </a>
                  )}
                  {restaurant.facebookUrl && (
                    <a
                      href={restaurant.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-70 transition-opacity"
                    >
                      <img 
                        src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/facebook.png" 
                        alt="Facebook"
                        className="w-6 h-6 grayscale"
                      />
                    </a>
                  )}
                  {restaurant.tiktokUrl && (
                    <a
                      href={restaurant.tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-70 transition-opacity"
                    >
                      <img 
                        src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/tik-tok.png" 
                        alt="TikTok"
                        className="w-6 h-6 grayscale"
                      />
                    </a>
                  )}
                </div>
              )}

              {/* Opening Hours - Collapsible */}
              <div>
                <button
                  onClick={() => setShowAllHours(!showAllHours)}
                  className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <Clock size={16} className="text-orange-500" />
                  <span className="text-sm font-bold text-zinc-900">Opening Hours</span>
                  <ChevronRight size={14} className={`text-zinc-400 transition-transform ${showAllHours ? 'rotate-90' : ''}`} />
                </button>
                {showAllHours && restaurant.openingHours && restaurant.openingHours.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {restaurant.openingHours.map((hours, idx) => {
                      // Google returns array starting with Sunday (0), Monday (1), etc.
                      const todayIndex = new Date().getDay();
                      const isToday = idx === todayIndex;
                      
                      // Parse the day and hours
                      const parts = hours.split(': ');
                      const dayName = parts[0];
                      const hoursText = parts[1] || 'Closed';
                      
                      return (
                        <div key={idx} className={`text-sm flex justify-between ${isToday ? 'text-orange-500 font-bold' : 'text-zinc-600'}`}>
                          <span className="font-medium">{dayName}</span>
                          <span>{hoursText}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showAllHours && (!restaurant.openingHours || restaurant.openingHours.length === 0) && (
                  <p className="text-sm text-zinc-400 mt-2">Hours not available</p>
                )}
              </div>
            </div>

            {/* Right Side: Action Buttons - HORIZONTAL */}
            <div className="flex flex-row gap-2 items-start">
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Phone size={16} />
                  Call
                </a>
              )}
              {restaurant.googleMapsUrl && (
                <a
                  href={restaurant.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-2xl transition-colors text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <MapPin size={16} />
                  Directions
                </a>
              )}
              <button
                onClick={handleShare}
                className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-2xl transition-colors text-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Video Menus Section */}
        {hasVideos && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Video size={18} className="text-orange-500" />
              <h3 className="text-lg font-bold text-zinc-900">Video Menus</h3>
            </div>

            {/* Category Filters + Full Menu + Your Picks */}
            <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {videoCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={() => setShowFullMenu(true)}
                className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all flex items-center gap-1"
              >
                Full Menu
                <ChevronRight size={14} />
              </button>

              {/* Your Picks Button - Opens Full Menu with saved filter */}
              {savedCount > 0 && (
                <button
                  onClick={() => {
                    setShowFullMenu(true);
                    // Signal to FullMenuModal to show saved only
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('openYourPicks'));
                    }, 100);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-zinc-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all whitespace-nowrap flex-shrink-0"
                >
                  <Bookmark size={16} className="text-orange-500 fill-orange-500" />
                  <span className="font-bold text-sm text-zinc-900">
                    Your Picks
                  </span>
                  <span className="text-sm text-orange-500">({savedCount})</span>
                </button>
              )}
            </div>

            {/* Video Grid - Scrollable */}
            <div className="max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-4 gap-4">
                {filteredDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden group"
                >
                  {/* Video */}
                  <div 
                    onClick={() => {
                      setSelectedDishId(dish.id);
                      setShowFullMenu(true);
                    }}
                    className="w-full h-full cursor-pointer"
                  >
                    {dish.videoUrl ? (
                      <video
                        src={dish.videoUrl}
                        className="w-full h-full object-cover bg-zinc-900"
                        playsInline
                        loop
                        preload="auto"
                        onLoadedData={(e) => {
                          e.currentTarget.currentTime = 0.1;
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.currentTime = 0;
                          e.currentTarget.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0.1;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
                        <Video size={24} className="text-zinc-400" />
                      </div>
                    )}
                  </div>

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Dish info */}
                  <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                    <p className="text-white text-sm font-bold line-clamp-2">
                      {dish.name.length > 40 ? `${dish.name.substring(0, 40)}...` : dish.name}
                    </p>
                    {dish.price && (
                      <p className="text-white text-xs mt-1 font-semibold">${dish.price}</p>
                    )}
                  </div>

                  {/* Action buttons - Mobile style */}
                  <div className="absolute right-3 bottom-20 flex flex-col gap-3">
                    {/* Like button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLikedVideos(prev => {
                          const next = new Set(prev);
                          if (next.has(dish.id)) {
                            next.delete(dish.id);
                          } else {
                            next.add(dish.id);
                          }
                          return next;
                        });
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-800/30 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/30 transition-colors">
                        <Heart 
                          size={16} 
                          className={likedVideos.has(dish.id) ? 'text-red-500 fill-red-500' : 'text-white'}
                        />
                      </div>
                    </button>

                    {/* Save button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSavedVideos(prev => {
                          const next = new Set(prev);
                          if (next.has(dish.id)) {
                            next.delete(dish.id);
                          } else {
                            next.add(dish.id);
                          }
                          // Sync with localStorage (shared with FullMenuModal)
                          localStorage.setItem(`saved_dishes_${restaurant.id}`, JSON.stringify([...next]));
                          
                          // Dispatch custom event to sync with FullMenuModal
                          window.dispatchEvent(new Event('savedDishesChanged'));
                          
                          return next;
                        });
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-800/30 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/30 transition-colors">
                        <Bookmark 
                          size={16} 
                          className={savedVideos.has(dish.id) ? 'text-orange-500 fill-orange-500' : 'text-white'}
                        />
                      </div>
                    </button>

                    {/* Share button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-800/30 backdrop-blur-sm flex items-center justify-center hover:bg-zinc-700/30 transition-colors">
                        <Share2 size={16} className="text-white" />
                      </div>
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        {/* No footer disclaimer for partners */}
      </div>

      {/* Full Menu Modal */}
      {showFullMenu && (
        <FullMenuModal
          restaurant={restaurant}
          isSaved={isSaved}
          selectedDishId={selectedDishId}
          onClose={() => {
            setShowFullMenu(false);
            setSelectedDishId(null);
          }}
          onToggleSave={onToggleSave}
          onSelectItem={(itemId) => {
            setShowFullMenu(false);
            setSelectedDishId(null);
            onSelectVideo?.(itemId);
          }}
          isQRRoute={isQRRoute}
        />
      )}
    </div>
  );
};

export default DesktopRestaurantProfile;
