import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ENV overrides for budget control
// REFRESH_DAILY_LIMIT: 50 calls/day = ~1500/month = ~$48/month at $0.032/call
// REFRESH_BATCH_SIZE: 25 items per execution (run every 6h = 4x/day = 100 max/day if all batches full)
const REFRESH_DAILY_LIMIT = parseInt(Deno.env.get("REFRESH_DAILY_LIMIT") || "50");
const REFRESH_BATCH_SIZE = parseInt(Deno.env.get("REFRESH_BATCH_SIZE") || "25");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[RefreshVenues] Starting batch refresh...");

    // Check daily budget
    const { data: budgetCheck, error: budgetError } = await supabase
      .rpc('check_daily_budget');

    if (budgetError) {
      console.error("[RefreshVenues] Budget check error:", budgetError);
      throw budgetError;
    }

    const budget = budgetCheck[0];
    console.log(`[RefreshVenues] Daily budget: ${budget.used}/${budget.limit_quota} (${budget.remaining} remaining)`);

    if (!budget.can_refresh) {
      console.warn("[RefreshVenues] Daily budget exhausted");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Daily budget exhausted",
          budget,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get pending items from queue (limit by remaining budget and batch size)
    const limit = Math.min(REFRESH_BATCH_SIZE, budget.remaining);
    const { data: queueItems, error: queueError } = await supabase
      .from('venue_refresh_queue')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(limit);

    if (queueError) {
      console.error("[RefreshVenues] Queue fetch error:", queueError);
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("[RefreshVenues] No pending items in queue");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending items",
          processed: 0,
          budget,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[RefreshVenues] Processing ${queueItems.length} items...`);

    let successCount = 0;
    let failCount = 0;

    // Process each item
    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabase
          .from('venue_refresh_queue')
          .update({
            status: 'processing',
            last_attempt_at: new Date().toISOString(),
            attempts: item.attempts + 1,
          })
          .eq('id', item.id);

        console.log(`[RefreshVenues] Processing ${item.cache_key} (${item.region})`);

        // Extract radius from cache_key (format: places_lat_lng_radius)
        const parts = item.cache_key.split('_');
        const radius = parseInt(parts[3]) || 5000;

        // Call Google Places API
        const url = new URL("https://places.googleapis.com/v1/places:searchNearby");
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY!,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.types,places.currentOpeningHours,places.regularOpeningHours,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.priceLevel,places.photos",
          },
          body: JSON.stringify({
            includedTypes: ["restaurant", "cafe", "bar"],
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: {
                  latitude: item.lat,
                  longitude: item.lng,
                },
                radius,
              },
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        const places = data.places || [];

        console.log(`[RefreshVenues] Got ${places.length} places for ${item.cache_key}`);

        // Save to cache
        const cacheData = {
          results: places,
          count: places.length,
          region: item.region,
        };

        await supabase
          .from('api_cache')
          .upsert({
            cache_key: item.cache_key,
            data: cacheData,
            last_fetched_at: new Date().toISOString(),
          }, {
            onConflict: 'cache_key',
          });

        // Mark as done
        await supabase
          .from('venue_refresh_queue')
          .update({
            status: 'done',
            error_message: null,
          })
          .eq('id', item.id);

        // Increment budget
        await supabase.rpc('increment_daily_budget', { p_count: 1 });

        successCount++;
        console.log(`[RefreshVenues] ✅ Success: ${item.cache_key}`);

      } catch (error) {
        console.error(`[RefreshVenues] ❌ Failed: ${item.cache_key}`, error);

        // Mark as failed
        await supabase
          .from('venue_refresh_queue')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', item.id);

        failCount++;
      }
    }

    // Get updated budget
    const { data: finalBudget } = await supabase.rpc('check_daily_budget');

    console.log(`[RefreshVenues] Batch complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: queueItems.length,
        successCount,
        failCount,
        budget: finalBudget?.[0] || budget,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[RefreshVenues] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
