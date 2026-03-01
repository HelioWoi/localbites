import React, { useState, useEffect } from 'react';
import { X, Search, ChevronDown, ChevronUp, Video, Image as ImageIcon, Bookmark, Share2, Utensils, Coffee, Wine, IceCream, Pizza, Fish } from 'lucide-react';
import { Restaurant, Dish } from '../types';

interface FullMenuModalProps {
  restaurant: Restaurant;
  isSaved: boolean;
  selectedDishId?: string | null;
  onClose: () => void;
  onToggleSave: () => void;
  onSelectItem: (itemId: string) => void;
  isQRRoute?: boolean;
}

const FullMenuModal: React.FC<FullMenuModalProps> = ({
  restaurant,
  isSaved,
  selectedDishId,
  onClose,
  onToggleSave,
  onSelectItem,
  isQRRoute = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [savedDishes, setSavedDishes] = useState<Set<string>>(() => {
    // Load saved dishes from localStorage
    const saved = localStorage.getItem(`saved_dishes_${restaurant.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; name: string } | null>(null);

  // Toggle saved dish
  const toggleSaveDish = (dishId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = new Set(savedDishes);
    if (newSaved.has(dishId)) {
      newSaved.delete(dishId);
    } else {
      newSaved.add(dishId);
    }
    setSavedDishes(newSaved);
    localStorage.setItem(`saved_dishes_${restaurant.id}`, JSON.stringify([...newSaved]));
    
    // Dispatch custom event to sync with DesktopRestaurantProfile
    window.dispatchEvent(new Event('savedDishesChanged'));
  };

  // Group dishes by category
  const allDishes = restaurant.dishes || [];
  const dishesToShow = showSavedOnly ? allDishes.filter(d => savedDishes.has(d.id)) : allDishes;
  
  const dishesByCategory = dishesToShow.reduce((acc, dish) => {
    const category = dish.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(dish);
    return acc;
  }, {} as Record<string, Dish[]>);

  const categories = Object.keys(dishesByCategory).sort();

  // Expand first category by default on mount
  useEffect(() => {
    if (categories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set([categories[0]]));
    }
  }, [categories.length]);

  // Listen for "Your Picks" event from DesktopRestaurantProfile
  useEffect(() => {
    const handleOpenYourPicks = () => {
      setShowSavedOnly(true);
    };

    window.addEventListener('openYourPicks', handleOpenYourPicks);
    return () => {
      window.removeEventListener('openYourPicks', handleOpenYourPicks);
    };
  }, []);

  // Debug: Log dishes to check thumbnailUrl
  useEffect(() => {
    console.log('[FullMenuModal] Dishes:', restaurant.dishes?.map(d => ({
      name: d.name,
      hasVideo: !!d.videoUrl,
      hasPhoto: !!d.photoUrl,
      thumbnailUrl: d.thumbnailUrl,
      category: d.category
    })));
  }, [restaurant.dishes]);

  // Auto-scroll to selected dish
  useEffect(() => {
    if (selectedDishId) {
      // Find category of selected dish
      const selectedDish = restaurant.dishes?.find(d => d.id === selectedDishId);
      if (selectedDish?.category) {
        // Expand the category
        setExpandedCategories(new Set([selectedDish.category]));
        
        // Scroll to dish after a short delay to ensure DOM is ready
        setTimeout(() => {
          const element = document.getElementById(`dish-${selectedDishId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [selectedDishId, restaurant.dishes]);

  // Filter dishes by search query
  const filteredCategories: Record<string, Dish[]> = searchQuery
    ? categories.reduce((acc, category) => {
        const filtered = dishesByCategory[category].filter(dish =>
          dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dish.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
        return acc;
      }, {} as Record<string, Dish[]>)
    : dishesByCategory;

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setExpandedCategories(next);
  };

  // Determine if item is video or photo based on videoUrl
  const isVideo = (dish: Dish) => {
    return !!(dish.videoUrl && dish.videoUrl.length > 0);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-zinc-900">{restaurant.name}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleSave}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isSaved ? 'bg-orange-500 hover:bg-orange-600' : 'bg-zinc-100 hover:bg-zinc-200'
                }`}
                title="Save"
              >
                <Bookmark size={18} className={isSaved ? 'text-white' : 'text-zinc-600'} />
              </button>
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}${window.location.pathname}?restaurant=${encodeURIComponent(restaurant.id)}`;
                  if (navigator.share) {
                    navigator.share({
                      title: restaurant.name,
                      text: `Check out the menu at ${restaurant.name}!`,
                      url: shareUrl,
                    }).catch(() => {});
                  }
                }}
                className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors"
                title="Share"
              >
                <Share2 size={18} className="text-white" />
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-zinc-700" />
              </button>
            </div>
          </div>

          {/* Search Bar & Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            {/* Your Picks Toggle */}
            {savedDishes.size > 0 && (
              <button
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className="w-full px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Bookmark size={16} className="fill-white" />
                Your Picks ({savedDishes.size})
              </button>
            )}
          </div>
        </div>

        {/* Menu Items - Scrollable */}
        <div className={`flex-1 overflow-y-auto px-6 py-4 ${showSavedOnly ? 'bg-orange-50/30' : ''}`}>
          {Object.keys(filteredCategories).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400">No items found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(filteredCategories)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, dishes]) => (
                <div key={category} className="border border-zinc-200 rounded-2xl overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-5 py-4 bg-zinc-50 hover:bg-zinc-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {category === 'Breakfast' && <Coffee size={20} className="text-zinc-600" />}
                      {category === 'Lunch' && <Utensils size={20} className="text-zinc-600" />}
                      {category === 'Dinner' && <Utensils size={20} className="text-zinc-600" />}
                      {category === 'Drinks' && <Wine size={20} className="text-zinc-600" />}
                      {category === 'Desserts' && <IceCream size={20} className="text-zinc-600" />}
                      {category === 'Pizza' && <Pizza size={20} className="text-zinc-600" />}
                      {category === 'Seafood' && <Fish size={20} className="text-zinc-600" />}
                      {!['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Desserts', 'Pizza', 'Seafood'].includes(category) && <Utensils size={20} className="text-zinc-600" />}
                      <h3 className="text-lg font-bold text-zinc-900">{category}</h3>
                      <span className="text-sm text-zinc-500">({dishes.length})</span>
                    </div>
                    {expandedCategories.has(category) ? (
                      <ChevronUp size={20} className="text-zinc-400" />
                    ) : (
                      <ChevronDown size={20} className="text-zinc-400" />
                    )}
                  </button>

                  {/* Category Items */}
                  {expandedCategories.has(category) && (
                    <div className="divide-y divide-zinc-100">
                      {dishes.map((dish) => (
                        <div
                          key={dish.id}
                          id={`dish-${dish.id}`}
                          className={`w-full px-5 py-4 hover:bg-zinc-50 transition-colors flex items-center gap-4 ${
                            selectedDishId === dish.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                          }`}
                        >
                          {/* Thumbnail */}
                          <div 
                            className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 cursor-pointer"
                            onClick={() => {
                              if (isVideo(dish)) {
                                // Video: open video modal
                                onSelectItem(dish.id);
                              } else if (dish.photoUrl) {
                                // Photo: open lightbox
                                setEnlargedPhoto({ url: dish.photoUrl, name: dish.name });
                              }
                            }}
                          >
                            {isVideo(dish) && dish.videoUrl ? (
                              <>
                                <video
                                  src={dish.videoUrl}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                  onLoadedData={(e) => {
                                    e.currentTarget.currentTime = 0.1;
                                  }}
                                />
                                {/* Video play icon overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                    <Video size={16} className="text-zinc-900" />
                                  </div>
                                </div>
                              </>
                            ) : dish.photoUrl ? (
                              <img
                                src={dish.photoUrl}
                                alt={dish.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'w-full h-full flex items-center justify-center';
                                    placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                    parent.appendChild(placeholder);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon size={24} className="text-zinc-400" />
                              </div>
                            )}
                            {/* Video/Photo Badge */}
                            <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1">
                              {isVideo(dish) ? (
                                <Video size={12} className="text-white" />
                              ) : (
                                <ImageIcon size={12} className="text-white" />
                              )}
                            </div>
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-zinc-900 truncate">{dish.name}</h4>
                            {dish.description && (
                              <p className="text-sm text-zinc-500 line-clamp-2 mt-0.5">{dish.description}</p>
                            )}
                          </div>

                          {/* Price & Bookmark */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {dish.price && (
                              <div className="text-lg font-bold text-orange-500">
                                ${dish.price}
                              </div>
                            )}
                            
                            {/* Bookmark Button - Hidden for QR routes */}
                            {!isQRRoute && (
                              <button
                                onClick={(e) => toggleSaveDish(dish.id, e)}
                                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors group"
                                title={savedDishes.has(dish.id) ? 'Remove from Your Picks' : 'Save to Your Picks'}
                              >
                                <Bookmark
                                  size={20}
                                  className={savedDishes.has(dish.id) ? 'text-orange-500 fill-orange-500' : 'text-zinc-400 group-hover:text-orange-500'}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {enlargedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setEnlargedPhoto(null);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEnlargedPhoto(null);
            }}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <X size={24} className="text-white" />
          </button>
          
          <div 
            className="max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedPhoto.url}
              alt={enlargedPhoto.name}
              className="w-full h-full object-contain rounded-2xl"
            />
            <p className="text-white text-center mt-4 text-lg font-semibold">
              {enlargedPhoto.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullMenuModal;
