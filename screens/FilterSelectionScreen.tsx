import React from 'react';
import { Utensils, Coffee, Wine, Sparkles } from 'lucide-react';

interface FilterSelectionScreenProps {
  onSelect: (category: 'restaurants' | 'cafes' | 'bars' | 'all') => void;
  onSkip: () => void;
}

const FilterSelectionScreen: React.FC<FilterSelectionScreenProps> = ({ onSelect, onSkip }) => {
  const categories = [
    {
      id: 'restaurants' as const,
      icon: Utensils,
      title: 'Restaurants',
      subtitle: 'Pizza, Sushi, Italian...',
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-500/10',
    },
    {
      id: 'cafes' as const,
      icon: Coffee,
      title: 'Cafes & Bakery',
      subtitle: 'Coffee, Breakfast, Pastries',
      gradient: 'from-amber-500 to-yellow-500',
      iconBg: 'bg-amber-500/10',
    },
    {
      id: 'bars' as const,
      icon: Wine,
      title: 'Bars & Drinks',
      subtitle: 'Cocktails, Pubs, Nightlife',
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-500/10',
    },
    {
      id: 'all' as const,
      icon: Sparkles,
      title: 'Show Me All',
      subtitle: 'All restaurants, cafes & bars',
      gradient: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">LocalBites</h2>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-zinc-900 mb-3 tracking-tight">
            Find your
            <br />
            next bite
          </h1>
          <p className="text-zinc-400 text-base">
            Choose a category to explore
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => onSelect(category.id)}
                className="aspect-square bg-zinc-50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-zinc-100 active:scale-95 transition-all duration-200 group border border-zinc-100"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${category.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon size={32} className="text-white" strokeWidth={2} />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold text-zinc-900">
                    {category.title}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>

        {/* Skip Button */}
        <button
          onClick={onSkip}
          className="w-full text-zinc-400 text-sm font-medium py-4 hover:text-zinc-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default FilterSelectionScreen;
