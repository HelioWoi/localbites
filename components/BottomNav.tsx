import React from 'react';
import { Home, Search, MessageSquare, Filter, Clock } from 'lucide-react';

interface BottomNavProps {
  onHome: () => void;
  onSearch: () => void;
  onReviews: () => void;
  onFilter: () => void;
  onOpenToggle: () => void;
  isOpenFilter: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({
  onHome,
  onSearch,
  onReviews,
  onFilter,
  onOpenToggle,
  isOpenFilter,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-t border-white/10 px-6 py-4 pb-8">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <button onClick={onHome} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
          <Home size={24} />
        </button>
        <button onClick={onSearch} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
          <Search size={24} />
        </button>
        <button onClick={onReviews} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors">
          <MessageSquare size={24} />
        </button>
        <button onClick={onFilter} className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors relative">
          <Filter size={24} />
          <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></div>
        </button>
        <button 
          onClick={onOpenToggle}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${isOpenFilter ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'}`}
        >
          <Clock size={14} />
          OPEN
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
