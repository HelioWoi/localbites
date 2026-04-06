import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get env vars inside handler
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("[Checkout] Env check - STRIPE:", !!STRIPE_SECRET_KEY, "SUPABASE:", !!SUPABASE_URL);
    
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "Missing env vars",
          stripe: !!STRIPE_SECRET_KEY,
          supabaseUrl: !!SUPABASE_URL,
          supabaseKey: !!SUPABASE_SERVICE_KEY
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { partnerId, priceId, successUrl, cancelUrl } = await req.json();
    console.log("[Checkout] Partner:", partnerId, "Price:", priceId);

    if (!partnerId || !priceId) {
      return new Response(
        JSON.stringify({ error: "Missing partnerId or priceId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get partner
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("id", partnerId)
      .single();

    if (partnerError || !partner) {
      console.error("[Checkout] Partner error:", partnerError);
      return new Response(
        JSON.stringify({ error: "Partner not found", details: partnerError?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log("[Checkout] Partner found:", partner.email);

    // Get or create Stripe customer
    let customerId = partner.stripe_customer_id;

    if (!customerId) {
      console.log("[Checkout] Creating Stripe customer...");
      
      const customerParams = new URLSearchParams({
        email: partner.email,
        name: partner.restaurant_name || partner.email,
        'metadata[partner_id]': partnerId,
      });
      
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: customerParams.toString(),
      });
      
      const customer = await customerRes.json();
      
      if (!customerRes.ok) {
        console.error("[Checkout] Stripe customer error:", customer);
        return new Response(
          JSON.stringify({ error: "Failed to create customer", stripe: customer.error?.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      customerId = customer.id;
      console.log("[Checkout] Customer created:", customerId);
      
      await supabase
        .from("partners")
        .update({ stripe_customer_id: customerId })
        .eq("id", partnerId);
    }

    console.log("[Checkout] Creating checkout session with customer:", customerId);
    
    // Check if partner was referred by an affiliate
    let affiliateId: string | null = null;
    if (partner.referred_by_affiliate_id) {
      affiliateId = partner.referred_by_affiliate_id;
      console.log("[Checkout] Partner was referred by affiliate:", affiliateId);
    }

    // Create checkout session (no Stripe trial - partner already had 30-day in-app trial)
    const sessionParams = new URLSearchParams({
      customer: customerId,
      mode: 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl || 'https://menulove.com.au/partner?success=true',
      cancel_url: cancelUrl || 'https://menulove.com.au/partner?canceled=true',
      'metadata[partner_id]': partnerId,
      'subscription_data[metadata][partner_id]': partnerId,
    });

    // Add affiliate metadata if present
    if (affiliateId) {
      sessionParams.set('metadata[affiliate_id]', affiliateId);
      sessionParams.set('subscription_data[metadata][affiliate_id]', affiliateId);
    }
    
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionParams.toString(),
    });
    
    const session = await sessionRes.json();
    
    if (!sessionRes.ok) {
      console.error("[Checkout] Stripe session error:", session);
      return new Response(
        JSON.stringify({ error: "Failed to create session", stripe: session.error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("[Checkout] Session created:", session.id);
    
    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    console.error("[Checkout] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
