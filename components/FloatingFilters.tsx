
import React from 'react';
import { Filter, DollarSign, Clock } from 'lucide-react';

interface FloatingFiltersProps {
  onFilterClick: (type: string) => void;
  activeFilters: { cuisine: string; price: string; openNow: boolean };
}

const FloatingFilters: React.FC<FloatingFiltersProps> = ({ onFilterClick, activeFilters }) => {
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center z-50 p-1.5 bg-white/20 backdrop-blur-3xl rounded-full border border-white/20 shadow-2xl">
      <button 
        onClick={() => onFilterClick('cuisine')}
        className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 ${activeFilters.cuisine !== 'All' ? 'bg-orange-600 text-white shadow-lg' : 'bg-transparent text-white'}`}
      >
        <Filter size={14} className={activeFilters.cuisine !== 'All' ? 'text-white' : 'text-white/60'} />
        <span className="text-[11px] font-bold tracking-tight">{activeFilters.cuisine === 'All' ? 'Cuisine' : activeFilters.cuisine}</span>
      </button>

      <div className="w-[1px] h-4 bg-white/10 mx-1" />

      <button 
        onClick={() => onFilterClick('price')}
        className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 ${activeFilters.price !== '' ? 'bg-orange-600 text-white shadow-lg' : 'bg-transparent text-white'}`}
      >
        <DollarSign size={14} className={activeFilters.price !== '' ? 'text-white' : 'text-white/60'} />
        <span className="text-[11px] font-bold tracking-tight">{activeFilters.price || 'Price'}</span>
      </button>

      <button 
        className={`ml-1 px-6 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20`}
      >
        <Clock size={14} />
        <span className="text-[11px] font-black uppercase tracking-wide">Open</span>
      </button>
    </div>
  );
};

export default FloatingFilters;
