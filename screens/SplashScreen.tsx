
import React, { useEffect, useState } from 'react';
import { Utensils, MapPin, Navigation } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState(0);
  const [showGps, setShowGps] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 500);
    const t3 = setTimeout(() => setStage(3), 900);
    const t4 = setTimeout(() => setShowGps(true), 2000);
    const t5 = setTimeout(onFinish, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onFinish]);

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
          
          <h2 className="mt-8 text-xl font-bold text-zinc-800 animate-pulse">
            Finding your location...
          </h2>
          
          <p className="mt-2 text-zinc-400 text-sm font-medium">
            Searching for the best bites nearby
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
      {/* Centered animated logo */}
      <div className="flex flex-col items-center justify-center -mt-20">
        <div className={`relative transition-all duration-700 ease-out ${stage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className={`w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-orange-500/30 ${stage >= 1 ? 'animate-pulse-glow' : ''}`}>
            <Utensils className={`w-10 h-10 text-white transition-transform duration-500 ${stage >= 2 ? 'rotate-0' : '-rotate-12'}`} strokeWidth={2.5} />
          </div>
        </div>
        
        <h1 className={`mt-6 text-3xl font-extrabold tracking-tighter bg-gradient-to-r from-zinc-800 to-zinc-500 bg-clip-text text-transparent transition-all duration-500 ease-out ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          Local Bites
        </h1>
        
        <p className={`mt-1 text-zinc-400 text-sm font-medium tracking-wide transition-all duration-500 ease-out ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          Decide what to eat. Fast.
        </p>
        
        <div className={`mt-8 transition-all duration-500 ${stage >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
            <div className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
