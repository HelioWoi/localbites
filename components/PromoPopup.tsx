import React, { useState, useEffect } from 'react';
import { X, Sparkles, Video, Zap } from 'lucide-react';

const PromoPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the popup
    const hasSeenPopup = localStorage.getItem('menulove_promo_dismissed');
    
    if (hasSeenPopup) {
      return;
    }

    // Show popup when user tries to leave page (exit intent)
    const handleMouseLeave = (e: MouseEvent) => {
      // Detect when mouse leaves viewport at the top
      if (e.clientY <= 0 && !isVisible) {
        setIsVisible(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [isVisible]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem('menulove_promo_dismissed', 'true');
    }, 300);
  };

  const handleCTA = () => {
    // Scroll to signup form
    const formSection = document.getElementById('signup-form');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className={`bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl shadow-2xl max-w-lg w-full p-8 relative pointer-events-auto transform transition-all duration-300 ${
            isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Close popup"
          >
            <X size={24} />
          </button>

          {/* Content */}
          <div className="text-center text-white">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={40} className="text-white" />
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              Start Your Free Trial Today!
            </h2>
            
            {/* Subheadline */}
            <p className="text-xl font-semibold mb-6 text-white/90">
              14 Days Free • No Credit Card Required
            </p>

            {/* Benefits */}
            <div className="space-y-3 mb-8 text-left">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Video size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">TikTok-Style Video Menus</p>
                  <p className="text-xs text-white/80">Showcase your dishes beautifully</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">QR Code & Smart Links</p>
                  <p className="text-xs text-white/80">Share your menu anywhere</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">Real-Time Analytics</p>
                  <p className="text-xs text-white/80">Track views and engagement</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleCTA}
              className="w-full bg-white text-orange-600 font-black text-lg py-4 px-8 rounded-xl hover:bg-zinc-100 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 transform"
            >
              Create My Video Menu →
            </button>

            {/* Fine Print */}
            <p className="text-xs text-white/70 mt-4">
              No credit card required • Cancel anytime • No hidden fees
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PromoPopup;
