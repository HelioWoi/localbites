
import { Restaurant, UserLocation, Review } from "../types";

const DEMO_RESTAURANTS: Omit<Restaurant, 'id'>[] = [
  {
    name: "The Wharf Tavern",
    cuisine: "Seafood",
    priceLevel: "$$",
    distance: "0.3 km",
    isOpen: true,
    rating: 4.6,
    totalReviews: 847,
    address: "123 Esplanade, Mooloolaba QLD",
    googleMapsUrl: "https://maps.google.com/?q=The+Wharf+Tavern+Mooloolaba",
    website: "https://wharftavern.com.au",
    isSubscribed: true,
    reviews: [
      { id: "r1", authorName: "Sarah M.", authorPhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", rating: 5, text: "Best fish and chips on the Sunshine Coast! The view is unbeatable.", relativeTimeDescription: "2 days ago", time: Date.now() - 2 * 24 * 60 * 60 * 1000, photoUrl: "https://images.unsplash.com/photo-1579888944880-d98341245702?q=80&w=800&auto=format&fit=crop" },
      { id: "r2", authorName: "James K.", authorPhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", rating: 5, text: "Fresh seafood, cold beers, and sunset views. What more could you want?", relativeTimeDescription: "1 week ago", time: Date.now() - 7 * 24 * 60 * 60 * 1000, photoUrl: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?q=80&w=800&auto=format&fit=crop" },
      { id: "r3", authorName: "Emma L.", authorPhotoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", rating: 4, text: "We come here every time we visit Mooloolaba. Never disappoints!", relativeTimeDescription: "2 weeks ago", time: Date.now() - 14 * 24 * 60 * 60 * 1000, photoUrl: "https://images.unsplash.com/photo-1606731219412-bb0d4db6a366?q=80&w=800&auto=format&fit=crop" },
      { id: "r4", authorName: "Michael T.", authorPhotoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop", rating: 5, text: "The grilled prawns were absolutely divine. Staff were lovely too.", relativeTimeDescription: "3 weeks ago", time: Date.now() - 21 * 24 * 60 * 60 * 1000, photoUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=800&auto=format&fit=crop" },
      { id: "r5", authorName: "Lisa W.", authorPhotoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop", rating: 5, text: "Amazing atmosphere and the seafood platter was incredible!", relativeTimeDescription: "1 month ago", time: Date.now() - 30 * 24 * 60 * 60 * 1000, photoUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?q=80&w=800&auto=format&fit=crop" },
    ],
    reviewSnippets: [
      "Best fish and chips on the Sunshine Coast! The view is unbeatable.",
      "Fresh seafood, cold beers, and sunset views. What more could you want?",
      "We come here every time we visit Mooloolaba. Never disappoints!"
    ],
    mainPhotoUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1074&auto=format&fit=crop",
    dishes: [
      { id: "d1a", name: "Fish & Chips", description: "Beer-battered barramundi with hand-cut chips", thumbnailUrl: "https://images.unsplash.com/photo-1579888944880-d98341245702?q=80&w=500&auto=format&fit=crop", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
      { id: "d1b", name: "Grilled Prawns", description: "Tiger prawns with garlic butter", thumbnailUrl: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?q=80&w=500&auto=format&fit=crop", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
      { id: "d1c", name: "Oysters Natural", description: "Fresh Sydney rock oysters", thumbnailUrl: "https://images.unsplash.com/photo-1606731219412-bb0d4db6a366?q=80&w=500&auto=format&fit=crop", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
      { id: "d1d", name: "Seafood Platter", description: "Chef's selection for two", thumbnailUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=500&auto=format&fit=crop", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
      { id: "d1e", name: "Lobster Thermidor", description: "Classic French preparation with creamy sauce", thumbnailUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?q=80&w=500&auto=format&fit=crop", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }
    ]
  },
  {
    name: "Spice Jar",
    cuisine: "Thai",
    priceLevel: "$",
    distance: "0.5 km",
    isOpen: true,
    address: "45 Brisbane Rd, Mooloolaba QLD",
    googleMapsUrl: "https://maps.google.com/?q=Spice+Jar+Mooloolaba",
    website: "",
    isSubscribed: false,
    reviewSnippets: [
      "Authentic Thai flavours! The Pad Thai is incredible.",
      "Quick service, generous portions, and very affordable.",
      "Hidden gem! The green curry is the best I've had outside Thailand."
    ],
    mainPhotoUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?q=80&w=1170&auto=format&fit=crop",
    dishes: [{ id: "d2", name: "Pad Thai", description: "Classic stir-fried rice noodles with prawns", thumbnailUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?q=80&w=500&auto=format&fit=crop" }]
  },
  {
    name: "Bella Venezia",
    cuisine: "Italian",
    priceLevel: "$$$",
    distance: "0.8 km",
    isOpen: true,
    address: "78 Ocean St, Mooloolaba QLD",
    googleMapsUrl: "https://maps.google.com/?q=Bella+Venezia+Mooloolaba",
    website: "https://bellavenezia.com.au",
    isSubscribed: true,
    reviewSnippets: [
      "The homemade pasta is to die for! Romantic atmosphere too.",
      "Finally, real Italian food in Mooloolaba. The tiramisu is perfection.",
      "A bit pricey but worth every dollar. Book ahead!"
    ],
    mainPhotoUrl: "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?q=80&w=1160&auto=format&fit=crop",
    dishes: [
      { id: "d3a", name: "Spaghetti Carbonara", description: "Traditional Roman pasta with guanciale", thumbnailUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=500&auto=format&fit=crop", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
      { id: "d3b", name: "Margherita Pizza", description: "Wood-fired with San Marzano tomatoes", thumbnailUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=500&auto=format&fit=crop", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
      { id: "d3c", name: "Tiramisu", description: "Classic Italian dessert", thumbnailUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=500&auto=format&fit=crop" },
      { id: "d3d", name: "Bruschetta", description: "Toasted bread with fresh tomatoes", thumbnailUrl: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?q=80&w=500&auto=format&fit=crop" }
    ]
  },
  {
    name: "Sunrise Café",
    cuisine: "Breakfast",
    priceLevel: "$$",
    distance: "0.2 km",
    isOpen: true,
    address: "12 First Ave, Mooloolaba QLD",
    googleMapsUrl: "https://maps.google.com/?q=Sunrise+Cafe+Mooloolaba",
    website: "",
    isSubscribed: false,
    reviewSnippets: [
      "Best brekkie spot! The avocado smash is legendary.",
      "Great coffee and even better vibes. Perfect start to the day.",
      "Friendly staff, beachside location, delicious food. 10/10!"
    ],
    mainPhotoUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=1160&auto=format&fit=crop",
    dishes: [{ id: "d4", name: "Avo Smash", description: "Smashed avocado on sourdough with poached eggs", thumbnailUrl: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?q=80&w=500&auto=format&fit=crop" }]
  },
  {
    name: "Sushi Train Express",
    cuisine: "Japanese",
    priceLevel: "$$",
    distance: "0.6 km",
    isOpen: true,
    address: "99 Mooloolaba Esplanade, QLD",
    googleMapsUrl: "https://maps.google.com/?q=Sushi+Train+Mooloolaba",
    website: "",
    isSubscribed: false,
    reviewSnippets: [
      "Fresh sushi at great prices! The salmon nigiri melts in your mouth.",
      "Fun for the whole family. Kids love watching the train go by.",
      "Quick, tasty, and affordable. Our go-to for a casual dinner."
    ],
    mainPhotoUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1170&auto=format&fit=crop",
    dishes: [{ id: "d5", name: "Salmon Nigiri", description: "Fresh Atlantic salmon on seasoned rice", thumbnailUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=500&auto=format&fit=crop" }]
  }
];

export async function getNearbyRestaurants(
  location: UserLocation, 
  filters?: { cuisine?: string; price?: string; openNow?: boolean }
): Promise<Restaurant[]> {
  console.log('[LocalBites] Fetching restaurants for:', location.name);
  
  await new Promise(resolve => setTimeout(resolve, 800));

  let results = DEMO_RESTAURANTS.map((r, i) => ({
    ...r,
    id: `res-${i}-${Date.now()}`
  }));

  if (filters?.cuisine && filters.cuisine !== 'All') {
    results = results.filter(r => 
      r.cuisine.toLowerCase().includes(filters.cuisine!.toLowerCase())
    );
  }

  if (filters?.price) {
    results = results.filter(r => r.priceLevel === filters.price);
  }

  if (results.length === 0) {
    results = DEMO_RESTAURANTS.slice(0, 3).map((r, i) => ({
      ...r,
      id: `res-fallback-${i}-${Date.now()}`
    }));
  }

  console.log('[LocalBites] Returning', results.length, 'restaurants');
  return results;
}
