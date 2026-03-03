import React from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface WelcomeBannerProps {
  restaurantName: string;
  onStartTour: () => void;
  onDismiss: () => void;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ restaurantName, onStartTour, onDismiss }) => {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 mb-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      {/* Content */}
      <div className="relative z-10">
        <button
          onClick={onDismiss}
          className="absolute top-0 right-0 text-white/80 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={24} className="text-white" />
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to MenuLove, {restaurantName}! 🎉
            </h2>
            <p className="text-white/90 text-sm mb-4 max-w-2xl">
              Your 30-day free trial has started! Let's get you set up with a quick tour of your dashboard. 
              We'll show you how to upload videos, track analytics, and manage your restaurant profile.
            </p>
            
            <button
              onClick={onStartTour}
              className="bg-white text-orange-600 px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-50 transition-colors flex items-center gap-2 shadow-lg"
            >
              Start Quick Tour
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
