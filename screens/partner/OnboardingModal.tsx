import React, { useState } from 'react';
import { X, Play, Upload, FolderOpen, Search, Video, ChevronRight, Check } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { restaurantName: string; cuisine: string; address: string }) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    onComplete({ restaurantName, cuisine, address });
  };

  const canProceedStep3 = restaurantName.trim().length > 0 && cuisine.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="relative p-6 border-b border-zinc-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
          
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-8 bg-gradient-to-r from-orange-500 to-amber-500'
                    : step < currentStep
                    ? 'w-2 bg-orange-500'
                    : 'w-2 bg-zinc-200'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-zinc-500">Step {currentStep} of {totalSteps}</p>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Play size={40} className="text-white" fill="white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-zinc-900 mb-3">Welcome to MenuLove</h2>
                <p className="text-lg text-zinc-600 max-w-md mx-auto">
                  Transform your menu into engaging video content and get discovered by hungry customers
                </p>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-200">
                <div className="flex items-center justify-center gap-4">
                  <div className="w-32 h-48 bg-white rounded-xl shadow-lg flex items-center justify-center border border-zinc-200">
                    <div className="text-center">
                      <Video size={32} className="text-orange-500 mx-auto mb-2" />
                      <div className="space-y-1">
                        <div className="h-2 w-20 bg-zinc-200 rounded mx-auto"></div>
                        <div className="h-2 w-16 bg-zinc-200 rounded mx-auto"></div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-orange-500" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-zinc-900">Your videos</p>
                    <p className="text-xs text-zinc-500">reach customers</p>
                    <p className="text-xs text-zinc-500">searching for food</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: How It Works */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">How It Works</h2>
                <p className="text-zinc-600">Three simple steps to get started</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1 */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-200 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Upload size={28} className="text-white" />
                  </div>
                  <h3 className="font-bold text-zinc-900">Upload Videos</h3>
                  <p className="text-sm text-zinc-600">Show your dishes in action with short, engaging videos</p>
                </div>

                {/* Card 2 */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-200 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FolderOpen size={28} className="text-white" />
                  </div>
                  <h3 className="font-bold text-zinc-900">Organize Menu</h3>
                  <p className="text-sm text-zinc-600">Create categories for easy browsing and discovery</p>
                </div>

                {/* Card 3 */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-200 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Search size={28} className="text-white" />
                  </div>
                  <h3 className="font-bold text-zinc-900">Get Discovered</h3>
                  <p className="text-sm text-zinc-600">Customers find you through video search and feed</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="text-sm text-amber-900 text-center">
                  💡 <strong>Pro Tip:</strong> Videos with clear dish shots and good lighting perform best!
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Quick Setup */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Let's Set Up Your Restaurant</h2>
                <p className="text-zinc-600">Tell us a bit about your business</p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-semibold text-zinc-900 mb-2">
                    Restaurant Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g., Mario's Pizza"
                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-900 mb-2">
                    Cuisine Type <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    placeholder="e.g., Italian, Japanese, Mexican"
                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-900 mb-2">
                    Address <span className="text-zinc-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., 123 Main St, Sydney"
                    className="w-full px-4 py-3 border-2 border-zinc-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 max-w-md mx-auto">
                <p className="text-sm text-blue-900 text-center">
                  ℹ️ You can update these details anytime in Settings
                </p>
              </div>
            </div>
          )}

          {/* Step 4: First Action */}
          {currentStep === 4 && (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-3xl font-bold text-zinc-900 mb-3">You're All Set! 🎉</h2>
                <p className="text-lg text-zinc-600 max-w-md mx-auto">
                  Ready to add your first menu video?
                </p>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-8 border-2 border-orange-200 max-w-md mx-auto">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">Click "Add Menu Video"</p>
                      <p className="text-sm text-zinc-600">Upload a short video of your dish</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">Add dish details</p>
                      <p className="text-sm text-zinc-600">Name, category, and optional price</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">Publish & share</p>
                      <p className="text-sm text-zinc-600">Your menu is live instantly!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-600">
                  <Video size={16} />
                  <span>Tip: Keep videos under 10 seconds for best results</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-zinc-700">
                  <p className="font-semibold text-amber-900 mb-1">📹 Video Requirements:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Maximum: 10 seconds duration</li>
                    <li>• Maximum: 5MB file size</li>
                    <li>• Recommended: 720p quality (perfect for mobile)</li>
                  </ul>
                  <p className="mt-2 text-zinc-600">
                    Need to compress? Use{' '}
                    <a 
                      href="https://www.freeconvert.com/video-compressor" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 font-semibold underline"
                    >
                      this free tool
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 bg-zinc-50">
          <div className="flex items-center justify-between gap-4">
            {currentStep > 1 && currentStep < 4 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-2.5 text-zinc-600 hover:text-zinc-900 font-semibold transition-colors"
              >
                Back
              </button>
            )}
            
            {currentStep < 3 && (
              <button
                onClick={handleNext}
                className="ml-auto px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
              >
                Next
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={handleNext}
                disabled={!canProceedStep3}
                className={`ml-auto px-6 py-2.5 font-bold rounded-lg shadow-lg transition-all ${
                  canProceedStep3
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            )}

            {currentStep === 4 && (
              <button
                onClick={handleComplete}
                className="ml-auto px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
