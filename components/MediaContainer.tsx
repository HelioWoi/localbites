
import React, { useRef, useEffect, useState } from 'react';
import { trackEvent } from '../services/eventsService';
import { trackAnalyticsEvent } from '../services/analyticsV2Service';
import { getCDNUrl } from '../utils/cdnHelper';

interface MediaContainerProps {
  videoUrl?: string;
  photoUrl: string;
  isActive: boolean;
  isSubscribed: boolean;
  restaurantId?: string;
  itemId?: string;
  onSwipeUp?: () => void;
  onPartialSwipeUp?: () => void;
}

const MediaContainer: React.FC<MediaContainerProps> = ({ 
  videoUrl, 
  photoUrl, 
  isActive, 
  isSubscribed,
  restaurantId,
  itemId,
  onSwipeUp,
  onPartialSwipeUp
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTrackedPlay, setHasTrackedPlay] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Timeout to prevent infinite spinner - show content after 3 seconds even if not loaded
  useEffect(() => {
    if (!isLoaded) {
      const timeout = setTimeout(() => {
        console.log('[MediaContainer] Loading timeout - forcing loaded state');
        setIsLoaded(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        // Only play video if subscribed
        if (isSubscribed) {
          videoRef.current.play().catch(() => {});
        }
        
        // Track video play event (only once per video) - works for all restaurants
        if (!hasTrackedPlay && restaurantId && itemId) {
          // Legacy tracking (keep for backward compatibility)
          trackEvent({ 
            eventType: 'video_play',
            restaurantId,
            itemId
          });
          
          // Analytics V2 tracking (new system) - track for ALL restaurants
          trackAnalyticsEvent({
            eventType: 'play',
            restaurantId,
            itemId
          }).catch(err => console.error('[MediaContainer] Analytics V2 error:', err));
          
          setHasTrackedPlay(true);
        }
      } else {
        if (isSubscribed && videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        setHasTrackedPlay(false);
      }
    }
  }, [isActive, isSubscribed, restaurantId, itemId, hasTrackedPlay]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY;
    
    // Partial swipe (50-150px) = show details
    // Full swipe (>150px) = next restaurant
    if (deltaY > 150 && onSwipeUp) {
      onSwipeUp();
    } else if (deltaY > 50 && deltaY <= 150 && onPartialSwipeUp) {
      onPartialSwipeUp();
    }
    touchStartY.current = null;
  };

  return (
    <div 
      className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
           <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-600 rounded-full animate-spin" />
        </div>
      )}

      {isSubscribed && videoUrl ? (
        <video
          ref={videoRef}
          src={getCDNUrl(videoUrl)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loop
          playsInline
          preload={isActive ? 'metadata' : 'none'}
          onCanPlay={() => setIsLoaded(true)}
          onLoadedData={() => setIsLoaded(true)}
          onError={(e) => {
            console.error('[MediaContainer] Video error:', videoUrl, e);
            setIsLoaded(true); // Show even if error to prevent infinite spinner
          }}
        />
      ) : photoUrl ? (
        <img
          src={photoUrl}
          className={`h-full w-full object-cover transition-all duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${isActive && isLoaded ? 'animate-ken-burns' : ''}`}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            console.error('[MediaContainer] Failed to load photo:', photoUrl);
            setIsLoaded(true);
          }}
          alt="Restaurant"
        />
      ) : (
        // No photo URL - show message
        <div className="flex items-center justify-center h-full w-full bg-zinc-900">
          <div className="text-center text-white/40">
            <p className="text-sm">No photo available</p>
          </div>
        </div>
      )}
      
      {/* Gradients igual ao Reviews Reel - preto esfumado */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
    </div>
  );
};

export default MediaContainer;
