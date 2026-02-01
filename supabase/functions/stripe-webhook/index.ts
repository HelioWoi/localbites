import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.11.0?target=deno&no-check";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[Stripe Webhook] Error:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;
  const amount = subscription.items.data[0]?.price.unit_amount || 0;
  const interval = subscription.items.data[0]?.price.recurring?.interval || "month";

  // Find partner by stripe_customer_id
  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!partner) {
    console.error("[Stripe Webhook] Partner not found for customer:", customerId);
    return;
  }

  // Determine plan name
  const planName = interval === "year" ? "Annual" : "Monthly";

  // Update partner subscription status
  await supabase
    .from("partners")
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      subscription_plan: planName,
      subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", partner.id);

  // Upsert subscription record
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

  console.log(`[Stripe Webhook] Updated subscription for partner ${partner.id}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
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

  console.log(`[Stripe Webhook] Canceled subscription for partner ${partner.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
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
      stripe_payment_intent_id: invoice.payment_intent as string,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "paid",
      description: invoice.description || "Subscription payment",
    });

  console.log(`[Stripe Webhook] Recorded payment for partner ${partner.id}: $${invoice.amount_paid / 100}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
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

  console.log(`[Stripe Webhook] Payment failed for partner ${partner.id}`);
}
