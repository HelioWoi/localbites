import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CheckoutSuccessOverlayProps {
  onDismiss: () => void;
}

const CheckoutSuccessOverlay: React.FC<CheckoutSuccessOverlayProps> = ({ onDismiss }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setShow(true));

    // Fire confetti burst
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#f97316', '#fbbf24', '#a855f7', '#ec4899', '#22c55e'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#f97316', '#fbbf24', '#a855f7', '#ec4899', '#22c55e'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Big burst at start
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#f97316', '#fbbf24', '#a855f7', '#ec4899', '#22c55e'],
    });

    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div
        className={`relative mx-4 max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${
          show ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 px-8 pt-10 pb-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Crown size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-1">
              You're Premium!
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-white/90">
              <Sparkles size={16} />
              <span className="text-sm font-medium">All features unlocked</span>
              <Sparkles size={16} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 text-center">
          <p className="text-zinc-700 text-base mb-2">
            Welcome to <span className="font-bold text-orange-600">MenuLove Premium</span>!
          </p>
          <p className="text-zinc-500 text-sm mb-6">
            Your restaurant now has access to unlimited video uploads, analytics, QR code menus, and priority support.
          </p>

          <button
            onClick={handleDismiss}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-orange-200"
          >
            Let's Go!
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccessOverlay;
