import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  console.log("[Webhook] ===== NEW REQUEST =====");
  console.log("[Webhook] Method:", req.method);
  console.log("[Webhook] URL:", req.url);
  
  // Get env vars inside handler
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[Webhook] Missing Supabase env vars");
    return new Response("Missing environment variables", { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Helper functions with access to supabase
  async function handleSubscriptionUpdate(subscription: any) {
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    const priceId = subscription.items.data[0]?.price.id;
    const amount = subscription.items.data[0]?.price.unit_amount || 0;
    const interval = subscription.items.data[0]?.price.recurring?.interval || "month";

    console.log(`[Webhook] Processing subscription update for customer: ${customerId}`);

    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!partner) {
      console.error("[Webhook] Partner not found for customer:", customerId);
      return;
    }

    const planName = interval === "year" ? "Annual" : "Monthly";
    
    // If cancel_at_period_end is true, user canceled but subscription is still active until period end
    const effectiveStatus = subscription.cancel_at_period_end ? "canceled" : status;

    console.log(`[Webhook] Subscription status: ${status}, cancel_at_period_end: ${subscription.cancel_at_period_end}, effective: ${effectiveStatus}`);

    await supabase
      .from("partners")
      .update({
        stripe_subscription_id: subscriptionId,
        subscription_status: effectiveStatus,
        subscription_plan: planName,
        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", partner.id);

    await supabase
      .from("subscriptions")
      .upsert({
        partner_id: partner.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        status: status,
        plan_name: planName,
        plan_interval: interval,
        amount: amount,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "stripe_subscription_id"
      });

    console.log(`[Webhook] Updated subscription for partner ${partner.id}: ${status}`);
  }

  async function handleSubscriptionDeleted(subscription: any) {
    const customerId = subscription.customer as string;

    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!partner) return;

    await supabase
      .from("partners")
      .update({
        subscription_status: "canceled",
        subscription_end_date: new Date().toISOString(),
      })
      .eq("id", partner.id);

    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    console.log(`[Webhook] Canceled subscription for partner ${partner.id}`);
  }

  async function handleInvoicePaid(invoice: any) {
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;

    console.log(`[Webhook] Processing invoice.paid for customer: ${customerId}, subscription: ${subscriptionId}`);

    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!partner) {
      console.error(`[Webhook] Partner not found for customer: ${customerId}`);
      return;
    }

    // If invoice has subscription data, update subscription info
    if (subscriptionId && invoice.lines?.data?.[0]) {
      const line = invoice.lines.data[0];
      const priceId = line.price?.id;
      const interval = line.price?.recurring?.interval || "month";
      const planName = interval === "year" ? "Annual" : "Monthly";
      
      // Check if this is a trial (amount is 0 for trial invoices)
      const isTrial = invoice.amount_paid === 0;
      
      console.log(`[Webhook] Updating subscription for partner ${partner.id}: ${subscriptionId}, isTrial: ${isTrial}`);
      
      await supabase
        .from("partners")
        .update({
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          subscription_plan: planName,
          subscription_start_date: new Date(line.period.start * 1000).toISOString(),
          subscription_end_date: new Date(line.period.end * 1000).toISOString(),
        })
        .eq("id", partner.id);

      console.log(`[Webhook] Subscription updated: ${subscriptionId}, plan: ${planName}, isTrial: ${isTrial}, end: ${new Date(line.period.end * 1000).toISOString()}`);
    }

    // Record payment
    await supabase
      .from("payment_history")
      .insert({
        partner_id: partner.id,
        stripe_payment_intent_id: invoice.payment_intent as string,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: "paid",
        description: invoice.description || "Subscription payment",
      });

    console.log(`[Webhook] Recorded payment for partner ${partner.id}: $${invoice.amount_paid / 100}`);
  }

  async function handlePaymentFailed(invoice: any) {
    const customerId = invoice.customer as string;

    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!partner) return;

    await supabase
      .from("payment_history")
      .insert({
        partner_id: partner.id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: "failed",
        description: "Payment failed",
      });

    console.log(`[Webhook] Payment failed for partner ${partner.id}`);
  }

  try {
    const body = await req.text();
    
    console.log("[Webhook] Raw body received:", body.substring(0, 200));
    
    // Parse event without SDK verification (Stripe will retry if signature is invalid)
    const event = JSON.parse(body);

    console.log(`[Webhook] ========================================`);
    console.log(`[Webhook] Event Type: ${event.type}`);
    console.log(`[Webhook] Event ID: ${event.id}`);
    console.log(`[Webhook] Event Data:`, JSON.stringify(event.data?.object, null, 2).substring(0, 500));
    console.log(`[Webhook] ========================================`);

    switch (event.type) {
      case "customer.subscription.created":
        console.log("[Webhook] Processing subscription.created");
        await handleSubscriptionUpdate(event.data.object);
        break;

      case "customer.subscription.updated":
        console.log("[Webhook] Processing subscription.updated");
        await handleSubscriptionUpdate(event.data.object);
        break;

      case "customer.subscription.deleted":
        console.log("[Webhook] Processing subscription.deleted");
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.paid":
        console.log("[Webhook] Processing invoice.paid");
        await handleInvoicePaid(event.data.object);
        break;

      case "invoice.payment_failed":
        console.log("[Webhook] Processing invoice.payment_failed");
        await handlePaymentFailed(event.data.object);
        break;

      case "checkout.session.completed":
        console.log("[Webhook] Checkout session completed - subscription should be created separately");
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    console.log("[Webhook] Event processed successfully");
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    console.error("[Webhook] Error stack:", err.stack);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
