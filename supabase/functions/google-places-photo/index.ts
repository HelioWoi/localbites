import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    const url = new URL(req.url);
    const photoName = url.searchParams.get("name");

    console.log("[google-places-photo] Received request for:", photoName);

    if (!photoName) {
      console.error("[google-places-photo] Missing photo name");
      return new Response("Missing photo name", { 
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!GOOGLE_API_KEY) {
      console.error("[google-places-photo] Missing API key");
      return new Response("Missing API key", { 
        status: 500,
        headers: corsHeaders,
      });
    }

    // The photoName from Google Places API is in format: "places/{placeId}/photos/{photoId}"
    // We need to call: https://places.googleapis.com/v1/{photoName}/media
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${GOOGLE_API_KEY}`;
    
    console.log("[google-places-photo] Fetching from:", photoUrl.replace(GOOGLE_API_KEY, "***"));
    
    const response = await fetch(photoUrl);
    
    console.log("[google-places-photo] Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[google-places-photo] Failed to fetch photo: ${response.status} - ${errorText}`);
      return new Response(`Photo not found: ${response.status}`, { 
        status: response.status,
        headers: corsHeaders,
      });
    }

    // Return the image directly
    const imageData = await response.arrayBuffer();
    console.log("[google-places-photo] Successfully fetched image, size:", imageData.byteLength);
    
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("[google-places-photo] Error proxying photo:", error);
    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
