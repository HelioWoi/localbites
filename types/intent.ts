// Intent Engine - User's food discovery intent state
export interface UserIntent {
  keyword: string | null;          // e.g. "pizza", "sushi"
  vibe: "quick" | "sitdown" | "drinks" | "explore" | "surprise" | null;
  category: "restaurants" | "cafes" | "bars" | "all" | null;
  openNow: boolean;                // Default false - only true if user explicitly asks
  radiusKm: number | null;
  price: "$" | "$$" | "$$$" | null;
  dietary: string[] | null;
  timeContext: {
    localTime: string;
    day: string;
  } | null;
  locationContext: {
    suburb?: string;
    city?: string;
  } | null;
}

export interface IntentAction {
  type: 'update_filters' | 'expand_radius' | 'toggle_open_now' | 'reset';
  payload?: Partial<UserIntent>;
  reason?: string;
}

// Initialize intent with time context
export function initializeIntent(): UserIntent {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const localTime = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return {
    keyword: null,
    vibe: null,
    category: null,
    openNow: false, // NEVER default to true
    radiusKm: null,
    price: null,
    dietary: null,
    timeContext: { localTime, day },
    locationContext: null,
  };
}

// Check if intent is actionable (ready to fetch)
export function isIntentActionable(intent: UserIntent): boolean {
  // Need at least vibe OR keyword to be actionable
  return !!(intent.vibe || intent.keyword);
}

// Map vibe to category
export function vibeToCategory(vibe: UserIntent['vibe']): UserIntent['category'] {
  switch (vibe) {
    case 'quick':
      return 'cafes';
    case 'sitdown':
      return 'restaurants';
    case 'drinks':
      return 'bars';
    case 'explore':
    case 'surprise':
      return 'all';
    default:
      return null;
  }
}
