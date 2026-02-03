
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Restaurant, UserLocation, CategoryFilter } from './types';
import SplashScreen from './screens/SplashScreen';
import FilterSelectionScreen from './screens/FilterSelectionScreen';
import LocationSelector from './screens/LocationSelector';
import RestaurantProfile from './screens/RestaurantProfile';
import AdminDashboard from './screens/AdminDashboard';
import PartnerPortal from './screens/partner/PartnerPortal';
import RestaurantMenuLoader from './components/RestaurantMenuLoader';
import RestaurantProfileLoader from './components/RestaurantProfileLoader';
import MediaContainer from './components/MediaContainer';
import FloatingFilters from './components/FloatingFilters';
import BitesAI from './components/BitesAI';
import { getNearbyRestaurants, getRestaurantDetails, getRemainingSearches, searchRestaurantsByQuery } from './services/geminiService';
import { TriageData } from './services/aiAssistant';
import { likeRestaurant, unlikeRestaurant, saveRestaurant, unsaveRestaurant, getUserLikes, getUserSaves, getAllLikesCounts } from './services/interactionService';
import { CUISINES, PRICES, DIETARY_OPTIONS, AMBIANCE_OPTIONS } from './constants';
import { calculateIsOpenNow } from './utils/filterHelpers';
import { Home, Search, MessageSquare, Filter, Bookmark, ExternalLink, Info, Loader2, X, ArrowRight, Globe, MapPin, ChevronUp, Crown, PlayCircle, Heart, Star, Clock, Sparkles } from 'lucide-react';
import { useLazyLoading } from './hooks/useLazyLoading';

// Check if we're on the partner route
const isPartnerRoute = window.location.pathname === '/partner' || window.location.pathname.startsWith('/partner');

// Check if we're on a restaurant route
const isRestaurantRoute = window.location.pathname.startsWith('/r/');
const isMenuRoute = isRestaurantRoute && window.location.pathname.endsWith('/menu');
const isProfileRoute = isRestaurantRoute && !isMenuRoute;

// Extract slug from URL
let restaurantSlug = null;
if (isRestaurantRoute) {
  const pathParts = window.location.pathname.split('/');
  restaurantSlug = pathParts[2]; // /r/slug or /r/slug/menu
}

const App: React.FC = () => {
  // If on partner route, render Partner Portal
  if (isPartnerRoute) {
    return <PartnerPortal />;
  }

  // If on restaurant menu route, render menu page
  if (isMenuRoute && restaurantSlug) {
    return <RestaurantMenuLoader slug={restaurantSlug} />;
  }
  
  // If on restaurant profile route, render profile page
  if (isProfileRoute && restaurantSlug) {
    return <RestaurantProfileLoader slug={restaurantSlug} />;
  }

  const [state, setState] = useState<AppState>('SPLASH');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]); // Full list for pagination
  const [visibleCount, setVisibleCount] = useState(20); // Show 20 at a time
  const [activeRestaurantIndex, setActiveRestaurantIndex] = useState(0);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [filters, setFilters] = useState({ 
    cuisine: 'All', 
    price: '', 
    openNow: true, // Default to true - show only OPEN restaurants (user can disable to see all)
    dietary: 'All',
    ambiance: 'All',
    hasParking: false,
    hasOutdoorSeating: false
  });
  const [showDishInfo, setShowDishInfo] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState<'cuisine' | 'price' | 'dietary' | 'ambiance' | 'amenities' | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showHeartAnimation, setShowHeartAnimation] = useState<string | null>(null);
  const [feedSwipeCount, setFeedSwipeCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showReviewsFeed, setShowReviewsFeed] = useState(false);
  const [showBitesAI, setShowBitesAI] = useState(false);
  const [showRestaurantReviews, setShowRestaurantReviews] = useState<Restaurant | null>(null);
  const [modalReviews, setModalReviews] = useState<any[]>([]);
  const [loadingModalReviews, setLoadingModalReviews] = useState(false);
  const [feedReviews, setFeedReviews] = useState<any[]>([]);
  const [loadingFeedReviews, setLoadingFeedReviews] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openProfileReviews, setOpenProfileReviews] = useState(false);
  const [likesCounts, setLikesCounts] = useState<Map<string, number>>(new Map());
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  
  // Bites Buddy: Banner showing what assistant decided
  const [buddyDecision, setBuddyDecision] = useState<{
    keyword?: string;
    category?: string;
    openNow?: boolean;
    radiusKm?: number;
  } | null>(null);
  
  const feedRef = useRef<HTMLDivElement>(null);

  const isOverlayOpen = showDishInfo || !!showFilterModal || showSaved;
  const isExternalOverlayOpen = !!showFilterModal || showSaved;

  // Load reviews when Reviews Feed opens
  useEffect(() => {
    if (showReviewsFeed && feedReviews.length === 0) {
      loadTopReviews();
    }
  }, [showReviewsFeed]);

  const loadTopReviews = async () => {
    setLoadingFeedReviews(true);
    try {
      console.log('[ReviewsFeed] Loading reviews for', restaurants.length, 'restaurants');
      
      // Get reviews from all restaurants
      const allReviewsPromises = restaurants
        .filter(r => r.id && !r.isSubscribed) // Only Google restaurants have place IDs
        .slice(0, 10) // Limit to first 10 restaurants to avoid too many API calls
        .map(async (restaurant) => {
          try {
            const details = await getRestaurantDetails(restaurant.id);
            if (details && details.reviews && details.reviews.length > 0) {
              return details.reviews.map(review => ({
                ...review,
                restaurantName: restaurant.name,
                restaurantId: restaurant.id,
                restaurantPhoto: restaurant.mainPhotoUrl,
                restaurantRating: restaurant.rating,
                restaurantTotalReviews: restaurant.totalReviews,
                restaurantGoogleMapsUrl: restaurant.googleMapsUrl
              }));
            }
            return [];
          } catch (error) {
            console.error('[ReviewsFeed] Error loading reviews for', restaurant.name, error);
            return [];
          }
        });

      const reviewsArrays = await Promise.all(allReviewsPromises);
      const allReviews = reviewsArrays
        .flat()
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);

      console.log('[ReviewsFeed] Loaded', allReviews.length, 'reviews');
      setFeedReviews(allReviews);
    } catch (error) {
      console.error('[ReviewsFeed] Error loading reviews:', error);
    } finally {
      setLoadingFeedReviews(false);
    }
  };

  // Load user likes and saves from Supabase on mount
  useEffect(() => {
    const loadUserInteractions = async () => {
      const [likes, saves] = await Promise.all([getUserLikes(), getUserSaves()]);
      setLikedIds(likes);
      setSavedIds(saves);
    };
    loadUserInteractions();
  }, []);

  // Handle hash navigation for restaurant profiles
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#profile-')) {
        const restaurantId = hash.replace('#profile-', '');
        // Find restaurant in current list
        let restaurant = allRestaurants.find(r => r.id === restaurantId);
        
        // If not found in allRestaurants, try sessionStorage (from menu page)
        if (!restaurant) {
          const storedData = sessionStorage.getItem('restaurant_profile_data');
          if (storedData) {
            try {
              const parsedData = JSON.parse(storedData);
              if (parsedData.id === restaurantId) {
                restaurant = parsedData;
                sessionStorage.removeItem('restaurant_profile_data'); // Clean up
              }
            } catch (e) {
              console.error('Failed to parse restaurant data from sessionStorage:', e);
            }
          }
        }
        
        if (restaurant) {
          setSelectedRestaurant(restaurant);
          setState('PROFILE');
        }
      }
    };

    // Check on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [allRestaurants]);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.style.overflowY = isOverlayOpen ? 'hidden' : 'scroll';
  }, [isOverlayOpen]);

  // Auto-scroll feed after 5 animations (3s each)
  useEffect(() => {
    if (state !== 'FEED' || isLoading || restaurants.length === 0 || showDishInfo || isOverlayOpen) return;
    
    const hasMoreRestaurants = activeRestaurantIndex < restaurants.length - 1;
    if (!hasMoreRestaurants) return;

    const timeout = setTimeout(() => {
      // After 3s, auto-scroll to next restaurant
      if (feedRef.current) {
        const nextTop = (activeRestaurantIndex + 1) * window.innerHeight;
        feedRef.current.scrollTo({ top: nextTop, behavior: 'smooth' });
      }
    }, 5000); // 5s then switch
    
    return () => clearTimeout(timeout);
  }, [state, isLoading, restaurants.length, activeRestaurantIndex, showDishInfo, isOverlayOpen]);

  // Reset swipe count when changing restaurants
  useEffect(() => {
    setFeedSwipeCount(0);
  }, [activeRestaurantIndex]);

  const fetchRestaurants = useCallback(async (loc: UserLocation, f = filters, page = 1) => {
    console.log('[App] 🔄 fetchRestaurants called - page:', page, 'location:', loc.name, 'category:', selectedCategory);
    setIsLoading(true);
    setError(null);
    try {
      const data = await getNearbyRestaurants(loc, f, selectedCategory);
      console.log('[App] ✅ Total restaurants from getNearbyRestaurants:', data.length);
      
      if (data.length === 0) {
        console.error('[App] ❌ NO RESTAURANTS RETURNED');
        setError('No restaurants found in this area');
      }
      
      setAllRestaurants(data);
      const initialCount = Math.min(20, data.length);
      setRestaurants(data.slice(0, initialCount));
      setVisibleCount(initialCount);
      setCurrentPage(1);
      setTotalAvailable(data.length);
      setHasMorePages(data.length > initialCount);
      setActiveRestaurantIndex(0);
      if (feedRef.current) feedRef.current.scrollTo({ top: 0 });
      
      console.log('[App] ✅ Loaded page 1:', initialCount, 'restaurants, total available:', data.length);
      console.log('[App] 📊 hasMorePages:', data.length > initialCount);
      
      // Load likes counts
      if (data.length > 0) {
        const ids = data.slice(0, 20).map(r => r.id);
        const counts = await getAllLikesCounts(ids);
        setLikesCounts(counts);
      }
    } catch (e: any) {
      const message = typeof e?.message === 'string' && e.message.trim().length > 0
        ? e.message
        : 'Failed to load restaurants. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, selectedCategory]);

  // Load more restaurants (lazy loading)
  const loadMoreRestaurants = useCallback(async () => {
    if (isLoadingMore || !hasMorePages || !location) return;
    
    console.log('[LazyLoading] 📥 Loading more restaurants... page:', currentPage + 1);
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      const maxPages = 3; // Limit to 3 pages (60 restaurants total)
      
      if (nextPage > maxPages) {
        console.log('[LazyLoading] ⚠️ Reached max pages (3)');
        setHasMorePages(false);
        setIsLoadingMore(false);
        return;
      }
      
      // Calculate new range
      const newCount = nextPage * 20;
      const newRestaurants = allRestaurants.slice(0, newCount);
      
      if (newRestaurants.length <= restaurants.length) {
        console.log('[LazyLoading] ⚠️ No more restaurants available');
        setHasMorePages(false);
        setIsLoadingMore(false);
        return;
      }
      
      setRestaurants(newRestaurants);
      setCurrentPage(nextPage);
      setHasMorePages(newRestaurants.length < allRestaurants.length && nextPage < maxPages);
      
      console.log('[LazyLoading] ✅ Loaded page', nextPage, '- now showing', newRestaurants.length, 'restaurants');
      
      // Load likes for new restaurants
      const newIds = allRestaurants.slice(restaurants.length, newCount).map(r => r.id);
      if (newIds.length > 0) {
        const newCounts = await getAllLikesCounts(newIds);
        setLikesCounts(prev => new Map([...prev, ...newCounts]));
      }
    } catch (error) {
      console.error('[LazyLoading] ❌ Error loading more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMorePages, location, currentPage, allRestaurants, restaurants.length]);

  // Lazy loading hook - automatically loads more when scrolling to bottom
  useLazyLoading({
    feedRef,
    isLoading,
    isLoadingMore,
    hasMorePages,
    onLoadMore: loadMoreRestaurants,
  });

  useEffect(() => {
    if (location) fetchRestaurants(location);
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch reviews when restaurant reviews modal opens
  useEffect(() => {
    // Only run when showRestaurantReviews changes to a truthy value
    if (!showRestaurantReviews) {
      setModalReviews([]);
      return;
    }
    
    const fetchModalReviews = async () => {
      // Check if it's a Google restaurant (ID starts with ChIJ or places/)
      const isGoogleRestaurant = 
        showRestaurantReviews.id.startsWith('places/') || showRestaurantReviews.id.startsWith('ChIJ');
      
      if (isGoogleRestaurant) {
        // Check if restaurant already has reviews
        if (showRestaurantReviews.reviews && showRestaurantReviews.reviews.length > 0) {
          setModalReviews(showRestaurantReviews.reviews);
          return;
        }
        
        setLoadingModalReviews(true);
        try {
          const details = await getRestaurantDetails(showRestaurantReviews.id);
          if (details?.reviews && details.reviews.length > 0) {
            setModalReviews(details.reviews);
          } else {
            setModalReviews([]);
          }
        } catch (error) {
          console.error('Error fetching modal reviews:', error);
          setModalReviews([]);
        } finally {
          setLoadingModalReviews(false);
        }
      } else {
        // Non-Google restaurant - use existing reviews
        setModalReviews(showRestaurantReviews.reviews || []);
      }
    };
    fetchModalReviews();
  }, [showRestaurantReviews?.id]); // Only re-run when restaurant ID changes

  const handleLocationSelect = (loc: UserLocation) => {
    setLocation(loc);
    setShowSaved(false);
    // Clear hash to prevent hashchange from interfering
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setState('FEED');
  };

  // Bites Buddy: Apply filters from chat intent and update feed
  const applyFiltersFromBuddy = useCallback(async (intent: {
    keyword?: string;
    vibe?: 'quick' | 'sitdown' | 'drinks' | 'explore' | 'surprise';
    category?: 'restaurants' | 'cafes' | 'bars' | 'all';
    openNow?: boolean;
    radiusKm?: number;
  }) => {
    console.log('[Buddy->Feed] Applying filters from intent:', intent);
    
    // Map vibe to category if not explicitly set
    let targetCategory: CategoryFilter = 'all';
    if (intent.category) {
      targetCategory = intent.category as CategoryFilter;
    } else if (intent.vibe) {
      // Vibe mapping
      switch (intent.vibe) {
        case 'quick':
          targetCategory = 'cafes';
          break;
        case 'sitdown':
          targetCategory = 'restaurants';
          break;
        case 'drinks':
          targetCategory = 'bars';
          break;
        case 'explore':
        case 'surprise':
          targetCategory = 'all';
          break;
      }
    }
    
    // Update category
    setSelectedCategory(targetCategory);
    
    // Update filters
    setFilters(prev => ({
      ...prev,
      openNow: intent.openNow || false, // Never default to true
      cuisine: intent.keyword || 'All', // Use keyword as cuisine filter
    }));
    
    // Set banner to show what was decided
    setBuddyDecision({
      keyword: intent.keyword,
      category: targetCategory,
      openNow: intent.openNow || false,
      radiusKm: intent.radiusKm || 10,
    });
    
    // If keyword exists, trigger text search
    if (intent.keyword && location) {
      setIsLoading(true);
      try {
        const results = await searchRestaurantsByQuery(location, intent.keyword);
        setAllRestaurants(results);
        setRestaurants(results.slice(0, 20));
        setVisibleCount(20);
        setTotalAvailable(results.length);
        setHasMorePages(results.length > 20);
        setActiveRestaurantIndex(0);
        if (feedRef.current) feedRef.current.scrollTo({ top: 0 });
      } catch (error) {
        console.error('[Buddy->Feed] Error searching:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (location) {
      // No keyword - just refresh with category
      await fetchRestaurants(location);
    }
    
    // Close AI modal
    setShowBitesAI(false);
  }, [location, fetchRestaurants]);

  const handleFilterUpdate = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    if (location) fetchRestaurants(location, updated);
    setShowFilterModal(null);
  };

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Throttle scroll handler to prevent excessive state updates
    if (scrollTimeoutRef.current) return;
    
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
    }, 100);
    
    const scrollPos = e.currentTarget.scrollTop;
    const itemHeight = window.innerHeight;
    const index = Math.round(scrollPos / itemHeight);
    
    // Check if user reached the end of feed
    if (index >= restaurants.length - 1 && restaurants.length > 0 && !showBitesAI) {
      // Open AI Assistant when reaching the last restaurant
      setTimeout(() => {
        setShowBitesAI(true);
      }, 500);
    }
    
    if (index !== activeRestaurantIndex && index >= 0 && index < restaurants.length) {
      setActiveRestaurantIndex(index);
      setShowDishInfo(false);
    }
  };

  if (state === 'SPLASH') return <SplashScreen onFinish={() => {
    // After splash, show filter selection screen
    setState('FILTER_SELECTION');
  }} />;

  if (state === 'FILTER_SELECTION') return (
    <>
      <FilterSelectionScreen
        onOpenAI={() => {
          console.log('[App] onOpenAI called, setting showBitesAI to true');
          setShowBitesAI(true);
        }}
        onSelect={(category) => {
        setSelectedCategory(category);
        
        // GEOLOCATION STRATEGY:
        // 1. Try real GPS first (production priority)
        // 2. On error code 2 (common in dev with device emulation), use fallback
        // 3. Never block user with hard errors
        //
        // WHY ERROR CODE 2 HAPPENS IN DEV:
        // - Chrome DevTools device emulation doesn't provide real GPS
        // - macOS CoreLocation returns kCLErrorLocationUnknown
        // - This is environmental, not a code bug
        // - Production devices with real GPS work fine
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            // SUCCESS: Real GPS coordinates
            (position) => {
              const loc: UserLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                name: 'Current Location'
              };
              setLocation(loc);
              setState('FEED');
              console.log('[Geolocation] ✓ Real GPS acquired:', loc);
            },
            // ERROR: Graceful fallback
            (error) => {
              console.log('[Geolocation] Error code:', error.code, '- Using fallback');
              
              // Error code 2 = Position unavailable (common in dev/emulation)
              // Use dev-friendly fallback instead of blocking user
              const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              
              if (isLocalhost && error.code === 2) {
                // DEV FALLBACK: Sunshine Coast, Australia
                // This allows development and testing without real GPS
                const devLoc: UserLocation = {
                  lat: -26.68,
                  lng: 153.12,
                  name: 'Sunshine Coast (Dev Mode)'
                };
                setLocation(devLoc);
                setState('FEED');
                console.log('[Geolocation] ⚠️ Using dev fallback:', devLoc);
              } else {
                // PRODUCTION: Show friendly message, stay on selection screen
                // User can try again or contact support
                console.error('[Geolocation] Production error:', error);
                alert('Unable to detect your location. Please check your device location settings and try again.');
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          // Browser doesn't support geolocation at all
          alert('Your browser does not support location services.');
        }
      }}
      onSkip={() => {
        setSelectedCategory('all');
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc: UserLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                name: 'Current Location'
              };
              setLocation(loc);
              setState('FEED');
              console.log('[Geolocation] ✓ Real GPS acquired (skip):', loc);
            },
            (error) => {
              console.log('[Geolocation] Error on skip:', error.code);
              const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              
              if (isLocalhost && error.code === 2) {
                const devLoc: UserLocation = {
                  lat: -26.68,
                  lng: 153.12,
                  name: 'Sunshine Coast (Dev Mode)'
                };
                setLocation(devLoc);
                console.log('[Geolocation] ⚠️ Using dev fallback (skip):', devLoc);
              }
              setState('FEED');
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          setState('FEED');
        }
      }}
      onManualSearch={async (searchQuery) => {
        // Use Text Search API to search by query (pizza, sushi, etc.)
        console.log('[ManualSearch] Text search for:', searchQuery);
        setFilters(prev => ({ ...prev, cuisine: 'All' }));
        setSelectedCategory('all');
        setIsLoading(true);
        setState('FEED');
        
        const doTextSearch = async (loc: UserLocation) => {
          try {
            const results = await searchRestaurantsByQuery(loc, searchQuery);
            console.log('[ManualSearch] Found', results.length, 'restaurants for:', searchQuery);
            
            if (results.length === 0) {
              setError(`No restaurants found for "${searchQuery}"`);
            } else {
              setError(null);
            }
            
            setAllRestaurants(results);
            setRestaurants(results.slice(0, 20));
            setVisibleCount(Math.min(20, results.length));
            setTotalAvailable(results.length);
            setHasMorePages(results.length > 20);
            setActiveRestaurantIndex(0);
          } catch (err) {
            console.error('[ManualSearch] Error:', err);
            setError(`Failed to search for "${searchQuery}"`);
          } finally {
            setIsLoading(false);
          }
        };
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc: UserLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                name: 'Current Location'
              };
              setLocation(loc);
              doTextSearch(loc);
            },
            (error) => {
              console.log('[Geolocation] Error on manual search:', error.code);
              const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              
              if (isLocalhost && error.code === 2) {
                const devLoc: UserLocation = {
                  lat: -26.68,
                  lng: 153.12,
                  name: 'Sunshine Coast (Dev Mode)'
                };
                setLocation(devLoc);
                doTextSearch(devLoc);
              } else {
                setIsLoading(false);
                alert('Unable to detect your location. Please check your device location settings.');
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          setIsLoading(false);
          alert('Your browser does not support location services.');
        }
      }}
    />
    
    {/* Bites AI Modal - Available in FilterSelection */}
    {showBitesAI && (
      <BitesAI
        mode="voice"
        onClose={() => {
          console.log('[App] Closing BitesAI modal');
          setShowBitesAI(false);
        }}
        onSearchTrigger={(triageData: TriageData) => {
          console.log('[App] AI Search triggered with:', triageData);
          // Map category
          const categoryMap: { [key: string]: CategoryFilter } = {
            'restaurants': 'restaurants',
            'cafes': 'cafes',
            'bars': 'bars',
            'all': 'all',
          };
          
          if (triageData.category) {
            setSelectedCategory(categoryMap[triageData.category] || 'all');
          }
          
          // NOTE: We intentionally do NOT apply cuisine filter from AI
          // The category already filters by establishment type (restaurants, cafes, bars)
          // Applying cuisine would cause 0 results because AI values don't match API values
          
          // Apply budget filter if provided
          if (triageData.budget) {
            setFilters(prev => ({ ...prev, price: triageData.budget || '' }));
          }
          
          // Reset cuisine filter to show all results for the category
          setFilters(prev => ({ ...prev, cuisine: '' }));
          
          // Close modal and get GPS
          setShowBitesAI(false);
          
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const loc: UserLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  name: 'Current Location'
                };
                setLocation(loc);
                setState('FEED');
                console.log('[Geolocation] ✓ Real GPS acquired (AI search):', loc);
              },
              (error) => {
                console.log('[Geolocation] Error on AI search:', error.code);
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                
                if (isLocalhost && error.code === 2) {
                  const devLoc: UserLocation = {
                    lat: -26.68,
                    lng: 153.12,
                    name: 'Sunshine Coast (Dev Mode)'
                  };
                  setLocation(devLoc);
                  setState('FEED');
                  console.log('[Geolocation] ⚠️ Using dev fallback (AI search):', devLoc);
                } else {
                  alert('Unable to detect your location. Please check your device location settings.');
                }
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            );
          }
        }}
      />
    )}
    </>
  );
  if (state === 'LOCATION_SELECTOR') return <LocationSelector onLocationSelect={handleLocationSelect} />;
  if (state === 'ADMIN') return <AdminDashboard onClose={() => setState('FEED')} />;
  
  if (state === 'PROFILE' && selectedRestaurant) {
    console.log('[Profile] Rendering profile for:', selectedRestaurant.name);
    
    return (
      <>
        <RestaurantProfile 
          restaurant={selectedRestaurant} 
          onBack={() => {
            setState('FEED');
            setOpenProfileReviews(false);
          }} 
          isSaved={savedIds.has(selectedRestaurant.id)}
          onToggleSave={() => {
             const next = new Set(savedIds);
             if (next.has(selectedRestaurant.id)) next.delete(selectedRestaurant.id);
             else next.add(selectedRestaurant.id);
             setSavedIds(next);
          }}
          openReviews={openProfileReviews}
          onNavigateToPartner={() => setState('ADMIN')}
          onOpenAI={() => setShowBitesAI(true)}
          onOpenSearch={() => setShowSearch(true)}
          onOpenFilter={() => setShowFilterModal('cuisine')}
          isStandalone={false}
        />
        
        {/* Search Modal */}
        {showSearch && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowSearch(false)}>
            <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-12" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-black mb-6">Search</h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search restaurants..."
                className="w-full px-4 py-3 border-2 border-zinc-200 rounded-2xl focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Bites AI Modal */}
        {showBitesAI && (
          <BitesAI
            mode="chat"
            onClose={() => setShowBitesAI(false)}
            onApplyIntent={applyFiltersFromBuddy}
            onSearchTrigger={(triageData: TriageData) => {
              // Legacy support - keep existing behavior
              const categoryMap: { [key: string]: CategoryFilter } = {
                'restaurants': 'restaurants',
                'cafes': 'cafes',
                'bars': 'bars',
                'all': 'all',
              };
              
              if (triageData.category) {
                setSelectedCategory(categoryMap[triageData.category] || 'all');
              }
              
              // NOTE: Do NOT apply cuisine filter from AI - causes 0 results
              // Category already filters by establishment type
              
              if (triageData.budget) {
                setFilters(prev => ({ ...prev, price: triageData.budget || '' }));
              }
              
              // Reset cuisine filter to show all results
              setFilters(prev => ({ ...prev, cuisine: '' }));
              
              setShowBitesAI(false);
              setState('FEED');
            }}
          />
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowFilterModal(null)}>
            <div className="bg-white w-full max-w-md rounded-t-[40px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-8 pb-4 border-b border-zinc-100">
                <h3 className="text-2xl font-black">Filters</h3>
                <button onClick={() => setShowFilterModal(null)} className="p-2 bg-zinc-100 rounded-full">
                  <X size={20}/>
                </button>
              </div>
              <div className="p-8">
                <button 
                  onClick={() => setShowFilterModal(null)}
                  className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden select-none">
      {isLoading && restaurants.length > 0 && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-lg flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-6" />
          <h2 className="text-xl font-black text-zinc-900 tracking-tight mb-2">Analysing the neighbourhood...</h2>
          <p className="font-bold uppercase tracking-[0.2em] text-[10px] text-zinc-400">Finding the best bites for you</p>
        </div>
      )}

      {/* Fixed Header - Top */}
      <div className={`fixed top-0 left-0 right-0 z-40 pointer-events-none px-5 pt-12 transition-opacity ${showDishInfo ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setState('FILTER_SELECTION')} className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
               <span className="text-[10px] font-black text-white">LB</span>
            </button>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Within 5km</span>
              <span className="text-sm font-bold text-white leading-none">{location?.name || 'Your Area'}</span>
            </div>
          </div>
          {/* Premium badge for subscribed restaurants */}
          {restaurants[activeRestaurantIndex]?.isSubscribed && (
            <div className="w-9 h-9 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg flex items-center justify-center">
              <Crown size={16} fill="currentColor" />
            </div>
          )}
        </div>
      </div>

      {/* Bites Buddy Decision Banner */}
      {buddyDecision && (
        <div className="fixed top-24 left-4 right-4 z-40 bg-gradient-to-r from-orange-500/90 to-orange-600/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg animate-fade-in-up">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <Sparkles size={16} className="flex-shrink-0" />
              <span>
                Showing: {buddyDecision.keyword || 'Nearby places'}
                {buddyDecision.category && buddyDecision.category !== 'all' && ` • ${buddyDecision.category}`}
                {buddyDecision.openNow && ' • Open now'}
                {` • ${buddyDecision.radiusKm}km`}
              </span>
            </div>
            <button 
              onClick={() => setBuddyDecision(null)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-t border-white/10 px-6 py-4 pb-8">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button onClick={() => setState('FILTER_SELECTION')} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <Home size={24} />
          </button>
          <button onClick={() => setShowSearch(true)} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <Search size={24} />
          </button>
          <button onClick={() => setShowBitesAI(true)} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
            <Sparkles size={24} />
          </button>
          <button onClick={() => setShowFilterModal('cuisine')} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors relative">
            <Filter size={24} />
            <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></div>
          </button>
          <button 
            onClick={async () => {
              const newOpenNowValue = !filters.openNow;
              console.log('[OPEN Button] Clicked! Refreshing feed with openNow:', newOpenNowValue);
              
              // Create new filters object with updated openNow value
              const newFilters = { ...filters, openNow: newOpenNowValue };
              
              // Update filter state
              setFilters(newFilters);
              
              // Clear current restaurants and reload with new filter
              setRestaurants([]);
              setActiveRestaurantIndex(0);
              setCurrentPage(1);
              setHasMorePages(true);
              
              // Reload restaurants with NEW filters (pass directly to avoid race condition)
              if (location) {
                await fetchRestaurants(location, newFilters);
              }
              
              // Scroll to top
              feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${filters.openNow ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'}`}
          >
            <Clock size={14} />
            OPEN
          </button>
        </div>
      </div>

      {/* Saved Overlay */}
      {showSaved && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowSaved(false)}>
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <h3 className="text-xl font-black tracking-tight">Saved</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{savedIds.size} spots</span>
              </div>
              <button onClick={() => setShowSaved(false)} className="p-2 bg-zinc-100 rounded-full"><X size={20} /></button>
            </div>

            {Array.from(savedIds).length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Bookmark className="text-zinc-300" size={26} />
                </div>
                <h4 className="text-lg font-black text-zinc-900 mb-2">No saved places yet</h4>
                <p className="text-zinc-500 font-medium">Save a spot from the feed to keep it here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto">
                {Array.from(savedIds)
                  .map((id) => restaurants.find(r => r.id === id))
                  .filter(Boolean)
                  .map((res) => (
                    <div key={res!.id} className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-zinc-50 border border-zinc-100">
                      <button
                        onClick={() => {
                          setSelectedRestaurant(res!);
                          setShowSaved(false);
                          setState('PROFILE');
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-black text-zinc-900 leading-tight">{res!.name}</div>
                        <div className="text-[11px] font-bold text-zinc-500">{res!.distance}</div>
                      </button>
                      <button
                        onClick={() => {
                          const next = new Set(savedIds);
                          next.delete(res!.id);
                          setSavedIds(next);
                        }}
                        className="p-3 bg-white rounded-2xl border border-zinc-100 text-zinc-400 active:scale-95 transition-transform"
                        aria-label="Remove from saved"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={feedRef} className={`snap-container no-scrollbar bg-black ${isExternalOverlayOpen ? 'pointer-events-none' : ''}`} onScroll={handleScroll}>
        {/* TODO: Re-enable after testing - Info banner when search limit reached
        {!isLoading && restaurants.length > 0 && getRemainingSearches() === 0 && (
          <div className="fixed top-20 left-4 right-4 z-50 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-4 shadow-lg animate-slide-down">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-white flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-semibold text-sm mb-1">
                  Showing Premium Partners
                </p>
                <p className="text-white/90 text-xs leading-relaxed">
                  Daily search limit reached. Discover more restaurants tomorrow or explore our premium partners!
                </p>
              </div>
              <button 
                onClick={() => {
                  const banner = document.querySelector('.animate-slide-down');
                  if (banner) banner.remove();
                }}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        */}
        
        {/* Apply openNow filter in real-time using actual opening hours */}
        {(() => {
          const displayedRestaurants = filters.openNow 
            ? restaurants.filter(r => calculateIsOpenNow(r.openingHours))
            : restaurants;
          
          return isLoading && restaurants.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="snap-item">
              <div className="video-card shadow-none rounded-none md:rounded-[40px] border-none bg-zinc-100 overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
                <div className="absolute bottom-32 left-8 right-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-16 rounded-full bg-zinc-200 animate-pulse" />
                    <div className="h-5 w-20 rounded-full bg-zinc-200 animate-pulse" />
                  </div>
                  <div className="h-10 w-2/3 rounded-2xl bg-zinc-200 animate-pulse mb-2" />
                  <div className="h-5 w-48 rounded-xl bg-zinc-200/80 animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : displayedRestaurants.length > 0 ? (
          displayedRestaurants.map((res, i) => (
            <div key={res.id} className="snap-item">
              <div className={`video-card shadow-none rounded-none border-none bg-black transition-all duration-500 ease-out transform-gpu ${activeRestaurantIndex === i ? 'opacity-100 scale-100' : 'opacity-80 scale-[0.97]'}`}>
                <MediaContainer 
                  videoUrl={res.dishes[0]?.videoUrl} 
                  photoUrl={res.mainPhotoUrl}
                  isActive={activeRestaurantIndex === i && state === 'FEED' && !isLoading}
                  isSubscribed={res.isSubscribed}
                  onSwipeUp={() => feedRef.current?.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
                  onPartialSwipeUp={() => {
                    setSelectedRestaurant(res);
                    setState('PROFILE');
                  }}
                />
                
                <div className="absolute inset-0 cursor-pointer" onClick={() => {
                  const now = Date.now();
                  const lastTap = lastTapRef.current;
                  
                  // Double-tap to save
                  if (lastTap && lastTap.id === res.id && now - lastTap.time < 300) {
                    const next = new Set(savedIds);
                    if (!next.has(res.id)) {
                      next.add(res.id);
                      setSavedIds(next);
                      setShowHeartAnimation(res.id);
                      setTimeout(() => setShowHeartAnimation(null), 1000);
                    }
                    lastTapRef.current = null;
                    return;
                  }
                  
                  lastTapRef.current = { id: res.id, time: now };
                  
                  // Single tap - delayed to check for double tap
                  setTimeout(() => {
                    if (lastTapRef.current?.id === res.id && Date.now() - lastTapRef.current.time >= 280) {
                      setSelectedRestaurant(res);
                      setState('PROFILE');
                    }
                  }, 300);
                }}>
                  
                  {/* HEART ANIMATION on double-tap */}
                  {showHeartAnimation === res.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <Heart size={80} className="text-white fill-white animate-ping" />
                    </div>
                  )}

                  {/* RIGHT SIDE ACTION BUTTONS - Standardized with circles */}
                  <div className={`absolute right-4 bottom-40 flex flex-col items-center gap-4 z-20 transition-opacity ${showDishInfo ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Like button */}
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const next = new Set(likedIds);
                        if (next.has(res.id)) {
                          next.delete(res.id);
                          await unlikeRestaurant(res.id);
                          const currentCount = likesCounts.get(res.id) || 0;
                          const newCounts = new Map(likesCounts);
                          newCounts.set(res.id, Math.max(0, currentCount - 1));
                          setLikesCounts(newCounts);
                        } else {
                          next.add(res.id);
                          await likeRestaurant(res.id);
                          const currentCount = likesCounts.get(res.id) || 0;
                          const newCounts = new Map(likesCounts);
                          newCounts.set(res.id, currentCount + 1);
                          setLikesCounts(newCounts);
                        }
                        setLikedIds(next);
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        likedIds.has(res.id) 
                          ? 'bg-red-500' 
                          : 'bg-white/20 backdrop-blur-md'
                      }`}>
                        <Heart 
                          size={24} 
                          className={likedIds.has(res.id) ? 'text-white fill-white' : 'text-white'} 
                        />
                      </div>
                      <span className="text-white text-[10px] font-medium">
                        {likesCounts.get(res.id) || 0}
                      </span>
                    </button>
                    
                    {/* Reviews button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('[REVIEW ICON] Clicked on review icon for restaurant:', res.name, res.id);
                        console.log('[REVIEW ICON] Setting showRestaurantReviews to:', res);
                        setShowRestaurantReviews(res);
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                        <MessageSquare size={24} className="text-white" />
                      </div>
                      <span className="text-white text-[10px] font-medium">{res.totalReviews || 0}</span>
                    </button>
                    
                    {/* Save button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = new Set(savedIds);
                        if (next.has(res.id)) {
                          next.delete(res.id);
                        } else {
                          next.add(res.id);
                        }
                        setSavedIds(next);
                      }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        savedIds.has(res.id) 
                          ? 'bg-orange-500' 
                          : 'bg-white/20 backdrop-blur-md'
                      }`}>
                        <Bookmark 
                          size={24} 
                          className={savedIds.has(res.id) ? 'text-white fill-white' : 'text-white'} 
                        />
                      </div>
                      <span className="text-white text-[10px] font-medium">
                        {savedIds.has(res.id) ? 'Saved' : 'Save'}
                      </span>
                    </button>
                  </div>

                  {/* INFO AT BOTTOM - Tap on name to see details */}
                  <div className={`absolute bottom-24 left-0 right-16 p-6 transition-all duration-500 ${showDishInfo ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-white/70 text-xs font-medium">{res.cuisine}</span>
                       <span className="text-white/40">•</span>
                       <span className="text-white/70 text-xs font-medium">{res.distance}</span>
                    </div>
                    <h3 
                      className="text-3xl font-black text-white drop-shadow-lg tracking-tight leading-none cursor-pointer active:opacity-70 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRestaurant(res);
                        setState('PROFILE');
                      }}
                    >
                      {res.name}
                    </h3>
                    
                    </div>
                  
                  {/* Swipe for more indicator - centered */}
                  <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center animate-bounce pointer-events-none" style={{ animationDuration: '2s' }}>
                    <ChevronUp size={18} className="text-white/60" />
                    <span className="text-white/60 text-xs font-medium">Swipe for more</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : null;
        })()}
        
        {/* Loading indicator when lazy loading more restaurants */}
        {isLoadingMore && (
          <div className="snap-item">
            <div className="video-card shadow-none rounded-none border-none bg-black flex items-center justify-center">
              <div className="text-center p-8">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-white/60 text-sm">Loading more restaurants...</p>
              </div>
            </div>
          </div>
        )}
        
        {/* End of results indicator */}
        {!isLoading && !isLoadingMore && restaurants.length > 0 && !hasMorePages && (
          <div className="snap-item">
            <div className="video-card shadow-none rounded-none border-none bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star size={32} className="text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  That's all for now!
                </h3>
                <p className="text-white/60 text-sm max-w-xs mx-auto">
                  You've seen all {restaurants.length} restaurants in your area
                </p>
                <p className="text-white/40 text-xs mt-4">
                  Try adjusting your filters to see more options
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && error ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center bg-white">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
              <Info className="text-zinc-300" size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 mb-2">Couldn’t load results</h2>
            <p className="text-zinc-500 font-medium mb-8">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (location) fetchRestaurants(location);
                }}
                className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl active:scale-95 transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => setState('FILTER_SELECTION')}
                className="px-8 py-4 bg-zinc-100 text-zinc-900 font-bold rounded-2xl active:scale-95 transition-all"
              >
                Change Filters
              </button>
            </div>
          </div>
        ) : !isLoading && (
          <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center bg-white">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
              <MapPin className="text-zinc-300" size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 mb-2">No bites found here</h2>
            <p className="text-zinc-500 font-medium mb-8">Try adjusting your filters or searching a different area.</p>
            <button 
              onClick={() => setState('FILTER_SELECTION')} 
              className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl active:scale-95 transition-all"
            >
              Change Filters
            </button>
          </div>
        )}
      </div>

      
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-lg flex flex-col animate-in fade-in duration-300">
          <div className="p-6 pt-12">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setShowSearch(false)} className="p-2 text-white">
                <X size={24} />
              </button>
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search restaurants, cuisines, dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-orange-500"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {CUISINES.slice(0, 6).map(c => (
                <button 
                  key={c}
                  onClick={() => {
                    handleFilterUpdate({ cuisine: c });
                    setShowSearch(false);
                  }}
                  className="px-4 py-2 bg-white/10 rounded-full text-white text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
            
            {/* Search results */}
            {searchQuery && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {(() => {
                  const query = searchQuery.toLowerCase();
                  const filtered = restaurants.filter(r => 
                    r.name.toLowerCase().includes(query) ||
                    r.cuisine.toLowerCase().includes(query) ||
                    r.address?.toLowerCase().includes(query)
                  );
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-white/60 text-sm">No restaurants found for "{searchQuery}"</p>
                        <p className="text-white/40 text-xs mt-2">Try searching by name or cuisine type</p>
                      </div>
                    );
                  }
                  
                  return filtered.map(restaurant => (
                    <button
                      key={restaurant.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Store reference before closing modal
                        const targetRestaurant = restaurant;
                        setShowSearch(false);
                        setSearchQuery('');
                        // Use requestAnimationFrame to ensure state updates properly
                        requestAnimationFrame(() => {
                          setSelectedRestaurant(targetRestaurant);
                          setState('PROFILE');
                        });
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-white/10 rounded-2xl text-left hover:bg-white/20 transition-colors"
                    >
                      <img src={restaurant.mainPhotoUrl} className="w-16 h-16 rounded-xl object-cover" alt={restaurant.name} />
                      <div>
                        <h4 className="text-white font-bold">{restaurant.name}</h4>
                        <p className="text-white/60 text-sm">{restaurant.cuisine} • {restaurant.distance}</p>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews Feed Modal - Full screen swipeable feed */}
      {showReviewsFeed && (
        <div className="fixed inset-0 z-[70] bg-black">
          {loadingFeedReviews ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Loader2 size={64} className="text-orange-500 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Loading Reviews...</h2>
              <p className="text-white/60">Finding the best reviews in your area</p>
            </div>
          ) : feedReviews.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <MessageSquare size={64} className="text-white/40 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Reviews Yet</h2>
              <p className="text-white/60">Reviews from restaurants in your area will appear here</p>
              <button 
                onClick={() => setShowReviewsFeed(false)}
                className="mt-8 px-6 py-3 bg-orange-500 text-white font-bold rounded-full"
              >
                Back to Feed
              </button>
            </div>
          ) : (
            <div className="snap-container">
                {feedReviews.map((review, idx) => (
                  <div key={idx} className="snap-item relative">
                    {/* Full screen photo */}
                    <img 
                      src={review.photoUrl || review.restaurantPhoto || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'} 
                      className="absolute inset-0 w-full h-full object-cover" 
                      alt="Review"
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'; }}
                    />
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
                    
                    {/* Close button - top left */}
                    <button 
                      onClick={() => setShowReviewsFeed(false)} 
                      className="absolute top-12 left-4 z-10 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
                    >
                      <X size={20} className="text-white" />
                    </button>
                    
                    {/* Rating badge - top right - clickable to Google Reviews */}
                    <a 
                      href={`${review.restaurantGoogleMapsUrl}#reviews`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-12 right-4 z-10 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
                    >
                      <Star size={14} className="text-amber-400" fill="currentColor" />
                      <span className="text-white font-bold text-sm">{review.restaurantRating?.toFixed(1)}</span>
                      <span className="text-white/70 text-xs">({review.restaurantTotalReviews} reviews)</span>
                    </a>
                    
                    {/* Bottom content */}
                    <div className="absolute bottom-24 left-0 right-0 p-6">
                      {/* Avatar and author info */}
                      <div className="flex items-center gap-3 mb-4">
                        {review.authorPhotoUrl ? (
                          <img src={review.authorPhotoUrl} className="w-12 h-12 rounded-full border-2 border-white object-cover" alt={review.authorName} />
                        ) : (
                          <div className="w-12 h-12 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                            {review.authorName?.charAt(0) || 'A'}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-bold">{review.authorName}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} className={i < review.rating ? "text-amber-400" : "text-white/30"} fill="currentColor" />
                              ))}
                            </div>
                            <span className="text-white/60 text-sm">{review.relativeTimeDescription}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Review text with "more" */}
                      <div>
                        <p 
                          id={`review-text-${idx}`}
                          className="text-white text-base leading-relaxed line-clamp-2"
                        >
                          "{review.text}"
                        </p>
                        <button 
                          onClick={() => {
                            const el = document.getElementById(`review-text-${idx}`);
                            if (el) {
                              el.classList.toggle('line-clamp-2');
                            }
                          }}
                          className="text-white/50 text-sm mt-1"
                        >
                          more
                        </button>
                      </div>
                    </div>
                    
                    {/* Bottom nav bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-white/10 px-6 py-4 pb-8">
                      <div className="flex items-center justify-between max-w-md mx-auto">
                        <button onClick={() => setShowReviewsFeed(false)} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
                          <Home size={24} />
                        </button>
                        <button onClick={() => { setShowReviewsFeed(false); setShowSearch(true); }} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
                          <Search size={24} />
                        </button>
                        <button onClick={() => setShowBitesAI(true)} className="flex flex-col items-center gap-1 text-white transition-colors">
                          <Sparkles size={24} />
                        </button>
                        <button onClick={() => setShowFilterModal('cuisine')} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
                          <Filter size={24} />
                        </button>
                        <button 
                          onClick={() => {
                            const res = restaurants.find(r => r.id === review.restaurantId);
                            if (res?.isOpen) {
                              window.open(res.googleMapsUrl, '_blank');
                            }
                          }}
                          className="flex items-center gap-2 bg-green-500 text-white font-bold px-4 py-2 rounded-full text-sm"
                        >
                          <Clock size={14} />
                          OPEN
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Restaurant Reviews Modal - Full screen swipeable feed */}
      {showRestaurantReviews && (
        <div className="fixed inset-0 z-[70] bg-black">
          {console.log('[REVIEW MODAL] Rendering modal for restaurant:', showRestaurantReviews.name)}
          {console.log('[REVIEW MODAL] Modal reviews count:', modalReviews.length)}
          {console.log('[REVIEW MODAL] Loading state:', loadingModalReviews)}
          {loadingModalReviews ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
              <p className="text-white/60">Loading reviews...</p>
            </div>
          ) : modalReviews.length > 0 ? (
            <div className="snap-container">
              {modalReviews.slice(0, 10).map((review, idx) => {
                // Always use the restaurant's main photo (same as feed) for consistency
                const photoSrc = showRestaurantReviews.mainPhotoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
                return (
                <div key={idx} className="snap-item relative">
                  <img 
                    src={photoSrc} 
                    className="absolute inset-0 w-full h-full object-cover" 
                    alt="Review"
                    onError={(e) => { 
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'; 
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
                  
                  <button 
                    onClick={() => setShowRestaurantReviews(null)} 
                    className="absolute top-12 left-4 z-10 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <X size={20} className="text-white" />
                  </button>
                  
                  <button 
                    onClick={() => {
                      const url = showRestaurantReviews.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(showRestaurantReviews.name + ' ' + showRestaurantReviews.address)}`;
                      window.open(url, '_blank');
                    }}
                    className="absolute top-12 right-4 z-10 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  >
                    <Star size={14} className="text-amber-400" fill="currentColor" />
                    <span className="text-white font-bold text-sm">{showRestaurantReviews.rating?.toFixed(1)}</span>
                    <span className="text-white/70 text-xs">({showRestaurantReviews.totalReviews} reviews)</span>
                  </button>
                  
                  <div className="absolute bottom-24 left-0 right-0 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {review.authorPhotoUrl ? (
                        <img src={review.authorPhotoUrl} className="w-12 h-12 rounded-full border-2 border-white object-cover" alt={review.authorName} />
                      ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                          {review.authorName?.charAt(0) || 'A'}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-bold">{review.authorName}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} className={i < review.rating ? "text-amber-400" : "text-white/30"} fill="currentColor" />
                            ))}
                          </div>
                          <span className="text-white/60 text-sm">{review.relativeTimeDescription}</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-white text-base leading-relaxed line-clamp-2">"{review.text}"</p>
                    <span className="text-white/50 text-sm mt-1">swipe for more</span>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-white/10 px-6 py-4 pb-8">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                      <button onClick={() => setShowRestaurantReviews(null)} className="text-white/60 hover:text-white"><Home size={24} /></button>
                      <button onClick={() => { setShowRestaurantReviews(null); setShowSearch(true); }} className="text-white/60 hover:text-white"><Search size={24} /></button>
                      <button onClick={() => setShowBitesAI(true)} className="text-white"><Sparkles size={24} /></button>
                      <button onClick={() => setShowFilterModal('cuisine')} className="text-white/60 hover:text-white"><Filter size={24} /></button>
                      <button 
                        onClick={() => window.open(showRestaurantReviews.googleMapsUrl, '_blank')}
                        className="flex items-center gap-2 bg-green-500 text-white font-bold px-4 py-2 rounded-full text-sm"
                      >
                        <Clock size={14} />OPEN
                      </button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6">
              <button 
                onClick={() => setShowRestaurantReviews(null)} 
                className="absolute top-12 left-4 z-10 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <X size={20} className="text-white" />
              </button>
              <p className="text-white/60 mb-4">No reviews available yet</p>
              <a 
                href={`${showRestaurantReviews.googleMapsUrl}#reviews`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 text-sm font-bold"
              >
                View on Google Maps →
              </a>
            </div>
          )}
        </div>
      )}

      {/* All Filters Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300" onClick={() => setShowFilterModal(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[40px] max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-8 pb-4 border-b border-zinc-100">
              <h3 className="text-2xl font-black tracking-tight">Filters</h3>
              <button onClick={() => setShowFilterModal(null)} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">
                <X size={20}/>
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Cuisine Section */}
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Cuisine</h4>
                <div className="grid grid-cols-2 gap-3">
                  {CUISINES.map(c => (
                    <button 
                      key={c}
                      onClick={() => handleFilterUpdate({ cuisine: c })}
                      className={`py-4 rounded-2xl font-bold transition-all ${filters.cuisine === c ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Section */}
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Price Range</h4>
                <div className="grid grid-cols-3 gap-3">
                  {PRICES.map(p => (
                    <button 
                      key={p}
                      onClick={() => handleFilterUpdate({ price: p })}
                      className={`py-4 rounded-2xl font-bold transition-all ${filters.price === p ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Options Section */}
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Dietary Options</h4>
                <div className="grid grid-cols-2 gap-3">
                  {DIETARY_OPTIONS.map(d => (
                    <button 
                      key={d}
                      onClick={() => handleFilterUpdate({ dietary: d })}
                      className={`py-4 rounded-2xl font-bold transition-all ${filters.dietary === d ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambiance Section */}
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Ambiance</h4>
                <div className="grid grid-cols-2 gap-3">
                  {AMBIANCE_OPTIONS.map(a => (
                    <button 
                      key={a}
                      onClick={() => handleFilterUpdate({ ambiance: a })}
                      className={`py-4 rounded-2xl font-bold transition-all ${filters.ambiance === a ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities Section */}
              <div>
                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Amenities</h4>
                <div className="space-y-3">
                  <button 
                    onClick={() => handleFilterUpdate({ hasParking: !filters.hasParking })}
                    className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${filters.hasParking ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100'}`}
                  >
                    🅿️ Parking Available
                  </button>
                  <button 
                    onClick={() => handleFilterUpdate({ hasOutdoorSeating: !filters.hasOutdoorSeating })}
                    className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${filters.hasOutdoorSeating ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100'}`}
                  >
                    🌿 Outdoor Seating
                  </button>
                </div>
              </div>

              {/* Apply Button */}
              <button 
                onClick={() => setShowFilterModal(null)}
                className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bites AI Modal - Global */}
      {showBitesAI && (
        <BitesAI
          mode="chat"
          onClose={() => setShowBitesAI(false)}
          onSearchTrigger={(triageData: TriageData) => {
            // Map category
            const categoryMap: { [key: string]: CategoryFilter } = {
              'restaurants': 'restaurants',
              'cafes': 'cafes',
              'bars': 'bars',
              'all': 'all',
            };
            
            if (triageData.category) {
              setSelectedCategory(categoryMap[triageData.category] || 'all');
            }
            
            // NOTE: Do NOT apply cuisine filter from AI - causes 0 results
            // Category already filters by establishment type
            
            // Apply budget filter if provided
            if (triageData.budget) {
              setFilters(prev => ({ ...prev, price: triageData.budget || '' }));
            }
            
            // Reset cuisine filter to show all results
            setFilters(prev => ({ ...prev, cuisine: '' }));
            
            // Get GPS and go to feed
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const loc: UserLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    name: 'Current Location'
                  };
                  setLocation(loc);
                  setState('FEED');
                },
                (error) => {
                  console.error('Geolocation error:', error);
                  alert('Unable to get your location. Please enable location services.');
                }
              );
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
