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
    const { action, lat, lng, radius, placeId, points } = await req.json();

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
      case "getNearbyLocalities":
        result = await getNearbyLocalities(lat, lng, points);
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
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos,places.location,places.types,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.reviews",
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
    openingHours: place.currentOpeningHours?.weekdayDescriptions || [],
    photoUrl: place.photos?.[0]?.name
      ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`
      : undefined,
    googleMapsUrl: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    cuisine: extractCuisine(place.types),
    location: {
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    },
    reviews: (place.reviews || []).slice(0, 5).map((review: any, idx: number) => ({
      id: `${place.id}-review-${idx}`,
      authorName: review.authorAttribution?.displayName || "Anonymous",
      authorPhotoUrl: review.authorAttribution?.photoUri,
      rating: review.rating || 5,
      text: review.text?.text || review.originalText?.text || "",
      relativeTimeDescription: review.relativePublishTimeDescription || "Recently",
      time: Date.now() - idx * 86400000,
      photoUrl: place.photos?.[idx + 1]?.name
        ? `https://places.googleapis.com/v1/${place.photos[idx + 1].name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`
        : place.photos?.[0]?.name
          ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`
          : undefined,
    })),
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

// Get nearby localities using reverse geocoding
async function getNearbyLocalities(lat: number, lng: number, points: { lat: number; lng: number; direction: string }[]) {
  const localities: { name: string; lat: number; lng: number }[] = [];
  const seenNames = new Set<string>();

  // First, get the user's current locality
  try {
    const currentLocality = await reverseGeocode(lat, lng);
    if (currentLocality && !seenNames.has(currentLocality.name)) {
      seenNames.add(currentLocality.name);
      localities.push(currentLocality);
    }
  } catch (e) {
    console.error("Error getting current locality:", e);
  }

  // Then get localities for nearby points
  for (const point of points) {
    if (localities.length >= 3) break;
    try {
      const locality = await reverseGeocode(point.lat, point.lng);
      if (locality && !seenNames.has(locality.name)) {
        seenNames.add(locality.name);
        localities.push(locality);
      }
    } catch (e) {
      console.error("Error getting locality for point:", e);
    }
  }

  return { localities };
}

// Reverse geocode a point to get locality name
async function reverseGeocode(lat: number, lng: number): Promise<{ name: string; lat: number; lng: number } | null> {
  // Try with result_type filter first
  let response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&result_type=locality|sublocality|neighborhood`
  );

  let data = await response.json();
  
  // If no results, try without filter
  if (!data.results || data.results.length === 0) {
    response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
    );
    data = await response.json();
  }

  if (data.results && data.results.length > 0) {
    // Try to find locality/sublocality in any result
    for (const result of data.results) {
      for (const component of result.address_components) {
        if (component.types.includes('locality') || 
            component.types.includes('sublocality') || 
            component.types.includes('sublocality_level_1') ||
            component.types.includes('neighborhood')) {
          return {
            name: component.long_name,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          };
        }
      }
    }
    
    // Fallback: use the first address component that looks like a place name
    const firstResult = data.results[0];
    if (firstResult.address_components && firstResult.address_components.length > 0) {
      // Skip street numbers and routes, get the first meaningful name
      for (const component of firstResult.address_components) {
        if (!component.types.includes('street_number') && 
            !component.types.includes('route') &&
            !component.types.includes('postal_code') &&
            !component.types.includes('country')) {
          return {
            name: component.long_name,
            lat: firstResult.geometry.location.lat,
            lng: firstResult.geometry.location.lng
          };
        }
      }
    }
  }
  return null;
}
