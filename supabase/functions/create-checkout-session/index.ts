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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");
    
    console.log("[Checkout] Env check - STRIPE:", !!STRIPE_SECRET_KEY, "SUPABASE:", !!SUPABASE_URL);
    
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "Missing env vars",
          stripe: !!STRIPE_SECRET_KEY,
          supabaseUrl: !!SUPABASE_URL,
          supabaseKey: !!SUPABASE_SERVICE_KEY,
          supabaseAnonKey: !!SUPABASE_ANON_KEY
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const { partnerId, priceId, checkoutType = 'subscription', planTier, successUrl, cancelUrl } = await req.json();
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

    const partnerOwnerId = (typeof partner.user_id === "string" && partner.user_id)
      ? partner.user_id
      : partner.id;

    if (!partnerOwnerId || partnerOwnerId !== userData.user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
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

    const isAiAddonCheckout = checkoutType === 'ai_credits_addon';

    if (isAiAddonCheckout) {
      const rawPlan = String(partner.subscription_plan || '').toLowerCase();
      const hasPaidPlanAssigned = ['basic', 'pro', 'monthly', 'annual'].includes(rawPlan);
      const isPaidActive = partner.subscription_status === 'active' || partner.subscription_status === 'trialing' || partner.lifetime_access === true || (hasPaidPlanAssigned && partner.subscription_status !== 'canceled');
      if (!isPaidActive) {
        return new Response(
          JSON.stringify({ error: "AI add-on is available only for active Basic/Pro partners" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // Create checkout session
    const sessionParams = new URLSearchParams({
      customer: customerId,
      mode: isAiAddonCheckout ? 'payment' : 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl || 'https://menulove.com.au/partner?success=true',
      cancel_url: cancelUrl || 'https://menulove.com.au/partner?canceled=true',
      'metadata[partner_id]': partnerId,
      'metadata[checkout_type]': checkoutType,
    });

    const normalizedPlanTier = planTier === 'pro' ? 'pro' : planTier === 'basic' ? 'basic' : null;
    if (!isAiAddonCheckout && normalizedPlanTier) {
      sessionParams.set('metadata[plan_tier]', normalizedPlanTier);
      sessionParams.set('subscription_data[metadata][plan_tier]', normalizedPlanTier);
    }

    if (isAiAddonCheckout) {
      sessionParams.set('payment_intent_data[metadata][partner_id]', partnerId);
      sessionParams.set('payment_intent_data[metadata][checkout_type]', 'ai_credits_addon');
      sessionParams.set('payment_intent_data[metadata][credits]', '50');
    } else {
      // Keep subscription metadata for plan checkouts
      sessionParams.set('subscription_data[metadata][partner_id]', partnerId);
    }

    // Add affiliate metadata if present (subscription only)
    if (affiliateId && !isAiAddonCheckout) {
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
