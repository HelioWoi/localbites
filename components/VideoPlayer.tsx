
import React, { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  url: string;
  isActive: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        // Play the video when active
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay might be blocked until user interaction
          });
        }
      } else {
        // Pause and reset video state when inactive
        videoRef.current.pause();
        // Delay resetting currentTime to match the fade-out duration
        const timeout = setTimeout(() => {
          if (videoRef.current && !isActive) {
            videoRef.current.currentTime = 0;
          }
        }, 700);
        return () => clearTimeout(timeout);
      }
    }
  }, [isActive]);

  return (
    <div className="relative h-full w-full bg-zinc-100 flex items-center justify-center overflow-hidden">
      {/* Loading Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 animate-pulse z-10">
           <div className="w-10 h-10 border-4 border-zinc-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}
      
      <video
        ref={videoRef}
        src={url}
        className={`h-full w-full object-cover transition-all duration-700 ease-in-out ${
          isLoaded && isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setIsLoaded(true)}
      />

      {/* Subtle overlay to enhance contrast for text elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />
    </div>
  );
};

export default VideoPlayer;
