import React, { useState, useEffect } from 'react';
import { X, ArrowRight, BarChart3, Menu, CreditCard, Settings, MessageCircle, ShoppingBag, Eye } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// Define steps outside component to prevent recreation on every render
const TOUR_STEPS: TourStep[] = [
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Track your restaurant\'s performance with real-time analytics. See video plays, order clicks, likes, saves, and view counts for each dish.',
    icon: <BarChart3 size={24} className="text-orange-500" />,
    targetId: 'tab-analytics',
    position: 'bottom'
  },
  {
    id: 'menu',
    title: 'Menu Management',
    description: 'Upload and manage your video menu items. Add descriptions, prices, categories, and "Order Now" buttons that link to your Square/Stripe checkout.',
    icon: <Menu size={24} className="text-orange-500" />,
    targetId: 'tab-menu',
    position: 'bottom'
  },
  {
    id: 'subscription',
    title: 'Subscription & Billing',
    description: 'Manage your subscription plan, view billing history, and upgrade your account.',
    icon: <CreditCard size={24} className="text-orange-500" />,
    targetId: 'tab-subscription',
    position: 'bottom'
  },
  {
    id: 'settings',
    title: 'Restaurant Settings',
    description: 'Update your restaurant profile, contact information, opening hours, social media links, and enable Order Now buttons for your menu.',
    icon: <Settings size={24} className="text-orange-500" />,
    targetId: 'tab-settings',
    position: 'bottom'
  },
  {
    id: 'chatbot',
    title: 'AI Assistant',
    description: 'Get instant help with our AI chatbot. Ask questions about features, billing, or how to use the platform.',
    icon: <MessageCircle size={24} className="text-orange-500" />,
    targetId: 'chat-widget-trigger',
    position: 'top'
  }
];

const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updateTargetPosition = () => {
      const targetElement = document.getElementById(TOUR_STEPS[currentStep].targetId);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);
      }
    };

    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [currentStep, isOpen]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    onClose();
    onComplete();
  };

  const handleComplete = () => {
    onClose();
    onComplete();
  };

  if (!isOpen || !targetRect) return null;

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Calculate tooltip position with viewport constraints
  const getTooltipPosition = () => {
    const edgePadding = 32; // Increased padding to prevent any cutoff
    const tooltipWidth = Math.min(360, window.innerWidth - edgePadding * 2);
    const tooltipHeight = 280; // Account for all content including padding
    const gapFromTarget = 20; // Gap between target element and tooltip
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + gapFromTarget;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - gapFromTarget;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.left - tooltipWidth - gapFromTarget;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.right + gapFromTarget;
        break;
    }

    // Constrain to viewport bounds with edge padding - ensure modal stays fully visible
    left = Math.max(edgePadding, Math.min(left, viewportWidth - tooltipWidth - edgePadding));
    top = Math.max(edgePadding, Math.min(top, viewportHeight - tooltipHeight - edgePadding));

    return { top, left, width: tooltipWidth };
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <>
      {/* Overlay with spotlight */}
      <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Highlight ring */}
        <div
          className="absolute border-4 border-orange-500 rounded-xl animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.2)',
          }}
        />
      </div>

      {/* Tooltip card */}
      <div
        className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-zinc-200 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[360px]"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: tooltipPosition.width,
          pointerEvents: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 transition-colors p-1 hover:bg-zinc-100 rounded-lg"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="p-5 pt-6">
          {/* Icon */}
          <div className="mb-4">
            {step.icon}
          </div>

          {/* Title & Description */}
          <h3 className="text-base font-bold text-zinc-900 mb-2">{step.title}</h3>
          <p className="text-sm text-zinc-600 mb-5 leading-relaxed">{step.description}</p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-6 bg-orange-500'
                      : index < currentStep
                      ? 'w-1.5 bg-orange-400'
                      : 'w-1.5 bg-zinc-300'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors flex items-center gap-1.5"
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidedTour;
