import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.11.0?target=deno&no-check";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[Checkout] Starting checkout session creation");
    
    const body = await req.json();
    console.log("[Checkout] Request body:", JSON.stringify(body));
    
    const { partnerId, priceId, successUrl, cancelUrl } = body;

    if (!partnerId || !priceId) {
      console.error("[Checkout] Missing parameters:", { partnerId, priceId });
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[Checkout] Fetching partner:", partnerId);
    
    // Get partner data
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("id", partnerId)
      .single();

    if (partnerError) {
      console.error("[Checkout] Partner fetch error:", partnerError);
      return new Response(
        JSON.stringify({ error: "Partner not found", details: partnerError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (!partner) {
      console.error("[Checkout] Partner not found");
      return new Response(
        JSON.stringify({ error: "Partner not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log("[Checkout] Partner found:", partner.email);

    // Create or retrieve Stripe customer
    let customerId = partner.stripe_customer_id;

    if (!customerId) {
      console.log("[Checkout] Creating Stripe customer for:", partner.email);
      try {
        const customer = await stripe.customers.create({
          email: partner.email,
          name: partner.name,
          metadata: {
            partner_id: partnerId,
          },
        });

        customerId = customer.id;
        console.log("[Checkout] Stripe customer created:", customerId);

        // Save customer ID to database
        await supabase
          .from("partners")
          .update({ stripe_customer_id: customerId })
          .eq("id", partnerId);
      } catch (error) {
        console.error("[Checkout] Error creating Stripe customer:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create Stripe customer", details: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else {
      console.log("[Checkout] Using existing Stripe customer:", customerId);
    }

    // Create checkout session with 14-day free trial
    console.log("[Checkout] Creating checkout session with price:", priceId);
    
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl || `${req.headers.get("origin")}/partner?success=true`,
        cancel_url: cancelUrl || `${req.headers.get("origin")}/partner?canceled=true`,
        metadata: {
          partner_id: partnerId,
        },
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            partner_id: partnerId,
          },
        },
      });
      console.log("[Checkout] Checkout session created:", session.id);
    } catch (error) {
      console.error("[Checkout] Error creating checkout session:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session", details: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const responseData = { sessionId: session.id, url: session.url };
    console.log("[Checkout] Returning success response:", responseData);
    
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
