import { Restaurant } from '../types';

// Infer dietary options based on cuisine type
export function inferDietaryOptions(cuisine: string, name: string): string[] {
  const options: string[] = [];
  const cuisineLower = cuisine.toLowerCase();
  const nameLower = name.toLowerCase();

  // Vegan indicators
  if (cuisineLower.includes('vegan') || nameLower.includes('vegan') || 
      cuisineLower.includes('plant') || nameLower.includes('plant')) {
    options.push('Vegan', 'Vegetarian');
  }
  
  // Vegetarian indicators
  if (cuisineLower.includes('vegetarian') || nameLower.includes('vegetarian') ||
      cuisineLower.includes('healthy') || cuisineLower.includes('salad')) {
    options.push('Vegetarian');
  }

  // Gluten-free indicators
  if (cuisineLower.includes('healthy') || cuisineLower.includes('café') ||
      nameLower.includes('health') || nameLower.includes('organic')) {
    options.push('Gluten-Free');
  }

  // Halal indicators
  if (cuisineLower.includes('middle eastern') || cuisineLower.includes('turkish') ||
      cuisineLower.includes('lebanese') || nameLower.includes('halal')) {
    options.push('Halal');
  }

  // Kosher indicators
  if (nameLower.includes('kosher') || cuisineLower.includes('jewish')) {
    options.push('Kosher');
  }

  return [...new Set(options)]; // Remove duplicates
}

// Infer ambiance based on cuisine and price level
export function inferAmbiance(cuisine: string, priceLevel: string, name: string): string[] {
  const ambiance: string[] = [];
  const cuisineLower = cuisine.toLowerCase();
  const nameLower = name.toLowerCase();

  // Romantic indicators
  if (priceLevel === '$$$' || cuisineLower.includes('italian') || 
      cuisineLower.includes('french') || nameLower.includes('fine')) {
    ambiance.push('Romantic', 'Fine Dining');
  }

  // Family-friendly indicators
  if (cuisineLower.includes('burger') || cuisineLower.includes('pizza') ||
      cuisineLower.includes('mexican') || priceLevel === '$') {
    ambiance.push('Family-Friendly', 'Casual');
  }

  // Casual indicators
  if (cuisineLower.includes('café') || cuisineLower.includes('bar') ||
      priceLevel === '$' || priceLevel === '$$') {
    ambiance.push('Casual');
  }

  // Fine Dining indicators
  if (priceLevel === '$$$' || cuisineLower.includes('steakhouse') ||
      cuisineLower.includes('seafood')) {
    ambiance.push('Fine Dining');
  }

  // Trendy indicators
  if (cuisineLower.includes('japanese') || cuisineLower.includes('thai') ||
      cuisineLower.includes('healthy') || nameLower.includes('modern')) {
    ambiance.push('Trendy');
  }

  return [...new Set(ambiance)]; // Remove duplicates
}

// Infer parking availability (random but weighted by price level)
export function inferHasParking(priceLevel: string): boolean {
  // Higher price restaurants more likely to have parking
  if (priceLevel === '$$$') return Math.random() > 0.3; // 70% chance
  if (priceLevel === '$$') return Math.random() > 0.5; // 50% chance
  return Math.random() > 0.7; // 30% chance
}

// Infer outdoor seating (random but weighted by cuisine)
export function inferHasOutdoorSeating(cuisine: string): boolean {
  const cuisineLower = cuisine.toLowerCase();
  
  // Cafés, bars, and certain cuisines more likely to have outdoor seating
  if (cuisineLower.includes('café') || cuisineLower.includes('bar') ||
      cuisineLower.includes('italian') || cuisineLower.includes('mexican')) {
    return Math.random() > 0.4; // 60% chance
  }
  
  return Math.random() > 0.6; // 40% chance
}

// Enrich restaurant with inferred filter data
export function enrichRestaurantWithFilters(restaurant: Restaurant): Restaurant {
  return {
    ...restaurant,
    dietaryOptions: inferDietaryOptions(restaurant.cuisine, restaurant.name),
    ambiance: inferAmbiance(restaurant.cuisine, restaurant.priceLevel, restaurant.name),
    hasParking: inferHasParking(restaurant.priceLevel),
    hasOutdoorSeating: inferHasOutdoorSeating(restaurant.cuisine),
  };
}

// Apply filters to restaurant list
export function applyFilters(
  restaurants: Restaurant[],
  filters: {
    cuisine: string;
    price: string;
    openNow: boolean;
    dietary: string;
    ambiance: string;
    hasParking: boolean;
    hasOutdoorSeating: boolean;
  }
): Restaurant[] {
  return restaurants.filter(restaurant => {
    // Cuisine filter
    if (filters.cuisine !== 'All' && restaurant.cuisine !== filters.cuisine) {
      return false;
    }

    // Price filter
    if (filters.price !== '' && restaurant.priceLevel !== filters.price) {
      return false;
    }

    // Open now filter
    if (filters.openNow && !restaurant.isOpen) {
      return false;
    }

    // Dietary filter
    if (filters.dietary !== 'All') {
      if (!restaurant.dietaryOptions || !restaurant.dietaryOptions.includes(filters.dietary)) {
        return false;
      }
    }

    // Ambiance filter
    if (filters.ambiance !== 'All') {
      if (!restaurant.ambiance || !restaurant.ambiance.includes(filters.ambiance)) {
        return false;
      }
    }

    // Parking filter
    if (filters.hasParking && !restaurant.hasParking) {
      return false;
    }

    // Outdoor seating filter
    if (filters.hasOutdoorSeating && !restaurant.hasOutdoorSeating) {
      return false;
    }

    return true;
  });
}
