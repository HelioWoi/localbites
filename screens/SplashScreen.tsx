
import React, { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 500);
    const t3 = setTimeout(() => setStage(3), 900);
    const t4 = setTimeout(onFinish, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onFinish]);

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
