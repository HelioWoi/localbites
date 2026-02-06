import React from 'react';
import { Smartphone } from 'lucide-react';

/**
 * Banner que aparece APENAS em desktop (lg: 1024px+)
 * Informa que a melhor experiência é no mobile
 */
const DesktopBanner: React.FC = () => {
  return (
    <div className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <Smartphone size={20} className="text-white flex-shrink-0" />
        <p className="text-sm font-medium">
          For the best experience, access from your mobile device
        </p>
      </div>
    </div>
  );
};

export default DesktopBanner;
