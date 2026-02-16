
import React, { useEffect, useState } from 'react';
import { Utensils, MapPin, Navigation } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState(0);
  const [showGps, setShowGps] = useState(false);
  const [searchText, setSearchText] = useState(0);

  const searchTexts = [
    "Locating your position...",
    "Searching within 5km radius...",
    "Finding best rated places...",
    "Analyzing reviews & ratings...",
    "Filtering by cuisine & price...",
    "Checking opening hours...",
    "Sorting by distance...",
    "Loading your feed..."
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 500);
    const t3 = setTimeout(() => setStage(3), 900);
    const t4 = setTimeout(() => setShowGps(true), 2000);
    const t5 = setTimeout(onFinish, 5000); // 3 segundos de GPS (2s logo + 3s GPS = 5s total)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onFinish]);

  // Rotate search texts every 1 second (8 texts x 1s = 8s)
  useEffect(() => {
    if (!showGps) return;
    
    const interval = setInterval(() => {
      setSearchText((prev) => (prev + 1) % searchTexts.length);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [showGps]);

  // GPS searching animation
  if (showGps) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 text-zinc-900 overflow-hidden">
        <div className="flex flex-col items-center justify-center">
          {/* GPS Pin with pulse animation */}
          <div className="relative">
            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-orange-500/10 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-orange-500/20 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-orange-500/30 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.6s' }} />
            </div>
            
            {/* Center pin */}
            <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/40">
              <MapPin className="w-8 h-8 text-white animate-bounce" style={{ animationDuration: '1s' }} />
            </div>
          </div>
          
          <h2 className="mt-8 text-xl font-bold text-zinc-800 transition-all duration-300">
            {searchTexts[searchText]}
          </h2>
          
          <p className="mt-2 text-zinc-400 text-sm font-medium">
            We're finding the best restaurants for you
          </p>
          
          {/* Animated dots */}
          <div className="mt-6 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-orange-500 animate-spin" style={{ animationDuration: '2s' }} />
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 text-zinc-900 overflow-hidden">
      {/* Logo with slogan */}
      <div className="flex flex-col items-center justify-center -mt-20">
        <div className={`relative ${stage >= 1 ? 'animate-fade-in-scale' : 'opacity-0'}`}>
          <img 
            src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/logo%20hor%20slogan.png" 
            alt="MenuLove - Find Your Next Yum" 
            className={`w-64 h-auto ${stage >= 2 ? 'animate-pulse-slow' : ''}`}
            style={{ maxWidth: '280px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
