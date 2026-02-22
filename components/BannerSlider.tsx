import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BannerSliderProps {
  images: string[];
  autoPlayInterval?: number;
}

const BannerSlider: React.FC<BannerSliderProps> = ({ 
  images, 
  autoPlayInterval = 7000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [images.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full h-full">
      {/* Image with fade animation and pulse */}
      <div className="relative w-full h-full overflow-hidden">
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Banner ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ${
              index === currentIndex ? 'opacity-100 animate-pulse-subtle' : 'opacity-0'
            }`}
          />
        ))}
      </div>
      
      {/* Add pulse animation keyframes */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 8s ease-in-out infinite;
        }
      `}</style>

      {/* Dots Indicator - Discrete navigation */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white/90 w-5 h-1.5'
                  : 'bg-white/40 w-1.5 h-1.5 hover:bg-white/60'
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
