import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, lat, lng, radius, placeId } = await req.json();

    if (!GOOGLE_API_KEY) {
      throw new Error("Google Places API key not configured");
    }

    let result;

    switch (action) {
      case "searchNearby":
        result = await searchNearbyRestaurants(lat, lng, radius || 2000);
        break;
      case "getDetails":
        result = await getPlaceDetails(placeId);
        break;
      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function searchNearbyRestaurants(lat: number, lng: number, radius: number) {
  // Make multiple searches to get more results (up to 60 restaurants)
  const searchTypes = [
    ["restaurant"],
    ["cafe", "coffee_shop"],
    ["bar", "pub"],
  ];

  const allPlaces: any[] = [];
  const seenIds = new Set<string>();

  for (const types of searchTypes) {
    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY!,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos,places.location,places.types,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri",
          },
          body: JSON.stringify({
            includedTypes: types,
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: radius,
              },
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        for (const place of (data.places || [])) {
          // Filter out non-food establishments
          const excludedTypes = [
            'supermarket', 'grocery_store', 'convenience_store', 'gym', 
            'fitness_center', 'gas_station', 'hotel', 'lodging', 
            'shopping_mall', 'department_store', 'pharmacy', 'hospital',
            'school', 'university', 'bank', 'atm', 'car_wash', 'car_repair'
          ];
          const placeTypes = place.types || [];
          const isExcluded = placeTypes.some((t: string) => excludedTypes.includes(t));
          
          if (!seenIds.has(place.id) && !isExcluded) {
            seenIds.add(place.id);
            allPlaces.push(place);
          }
        }
      }
    } catch (error) {
      console.error("Search error for types:", types, error);
    }
  }

  const data = { places: allPlaces };

  return (data.places || []).map((place: any) => ({
    id: place.id,
    name: place.displayName?.text || "Unknown",
    address: place.formattedAddress || "",
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    rating: place.rating,
    totalReviews: place.userRatingCount,
    priceLevel: priceLevelToString(place.priceLevel),
    isOpen: place.currentOpeningHours?.openNow,
    photoUrl: place.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`
      : undefined,
    googleMapsUrl: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    cuisine: extractCuisine(place.types),
    location: {
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    },
  }));
}

async function getPlaceDetails(placeId: string) {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_API_KEY!,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,priceLevel,currentOpeningHours,photos,location,types,websiteUri,nationalPhoneNumber,googleMapsUri,reviews",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch place details");
  }

  const place = await response.json();

  return {
    place: {
      id: place.id,
      name: place.displayName?.text || "Unknown",
      address: place.formattedAddress || "",
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
      rating: place.rating,
      totalReviews: place.userRatingCount,
      priceLevel: priceLevelToString(place.priceLevel),
      isOpen: place.currentOpeningHours?.openNow,
      photoUrl: place.photos?.[0]?.name
        ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`
        : undefined,
      googleMapsUrl: place.googleMapsUri,
      cuisine: extractCuisine(place.types),
      location: {
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      },
    },
    reviews: (place.reviews || []).map((review: any, idx: number) => ({
      id: `review-${idx}`,
      authorName: review.authorAttribution?.displayName || "Anonymous",
      authorPhotoUrl: review.authorAttribution?.photoUri,
      rating: review.rating,
      text: review.text?.text || "",
      relativeTimeDescription: review.relativePublishTimeDescription || "",
      time: new Date(review.publishTime).getTime() / 1000,
    })),
    photos: (place.photos || []).slice(0, 10).map((photo: any) =>
      `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`
    ),
  };
}

function priceLevelToString(priceLevel?: string): string {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE": return "Free";
    case "PRICE_LEVEL_INEXPENSIVE": return "$";
    case "PRICE_LEVEL_MODERATE": return "$$";
    case "PRICE_LEVEL_EXPENSIVE": return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE": return "$$$$";
    default: return "$$";
  }
}

function extractCuisine(types?: string[]): string {
  if (!types) return "Restaurant";

  const cuisineMap: Record<string, string> = {
    chinese_restaurant: "Chinese",
    japanese_restaurant: "Japanese",
    italian_restaurant: "Italian",
    mexican_restaurant: "Mexican",
    indian_restaurant: "Indian",
    thai_restaurant: "Thai",
    vietnamese_restaurant: "Vietnamese",
    korean_restaurant: "Korean",
    french_restaurant: "French",
    greek_restaurant: "Greek",
    brazilian_restaurant: "Brazilian",
    seafood_restaurant: "Seafood",
    steak_house: "Steakhouse",
    pizza_restaurant: "Pizza",
    sushi_restaurant: "Sushi",
    cafe: "Café",
    bakery: "Bakery",
    bar: "Bar & Grill",
  };

  for (const type of types) {
    if (cuisineMap[type]) return cuisineMap[type];
  }
  return "Restaurant";
}
