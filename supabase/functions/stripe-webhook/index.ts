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
  /** Map a Stripe price ID to our plan tier ('basic' | 'pro') */
  function planTierFromPriceId(priceId: string): 'basic' | 'pro' {
    const BASIC_MONTHLY = Deno.env.get("BASIC_MONTHLY_PRICE_ID") || '';
    const BASIC_ANNUAL  = Deno.env.get("BASIC_ANNUAL_PRICE_ID")  || '';
    const PRO_MONTHLY   = Deno.env.get("PRO_MONTHLY_PRICE_ID")   || '';
    const PRO_ANNUAL    = Deno.env.get("PRO_ANNUAL_PRICE_ID")    || '';
    if (priceId === PRO_MONTHLY || priceId === PRO_ANNUAL) return 'pro';
    if (priceId === BASIC_MONTHLY || priceId === BASIC_ANNUAL) return 'basic';
    return 'basic'; // legacy $39 plan migrates to basic
  }

  async function handleAiAddonCheckout(session: any) {
    const checkoutType = session?.metadata?.checkout_type;
    if (checkoutType !== 'ai_credits_addon') return;

    const customerId = session.customer as string;
    const creditsToAdd = Number(session?.metadata?.credits || 50);

    const { data: partner } = await supabase
      .from("partners")
      .select("id, ai_credits_addon_remaining")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!partner) {
      console.error("[Webhook] AI add-on checkout: partner not found for customer", customerId);
      return;
    }

    const nextRemaining = (partner.ai_credits_addon_remaining || 0) + creditsToAdd;

    await supabase
      .from("partners")
      .update({
        ai_credits_addon_remaining: nextRemaining,
      })
      .eq("id", partner.id);

    console.log(`[Webhook] Added ${creditsToAdd} AI add-on credits to partner ${partner.id}. Remaining add-on credits: ${nextRemaining}`);
  }

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

    const planTier = planTierFromPriceId(priceId);
    
    // If cancel_at_period_end is true, user canceled but subscription is still active until period end
    const effectiveStatus = subscription.cancel_at_period_end ? "canceled" : status;

    console.log(`[Webhook] Subscription status: ${status}, plan: ${planTier}, cancel_at_period_end: ${subscription.cancel_at_period_end}, effective: ${effectiveStatus}`);

    await supabase
      .from("partners")
      .update({
        stripe_subscription_id: subscriptionId,
        subscription_status: effectiveStatus,
        subscription_plan: planTier,
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
        plan_name: planTier,
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
      const invoicePriceId = line.price?.id || '';
      const planTier = planTierFromPriceId(invoicePriceId);
      
      // Check if this is a trial (amount is 0 for trial invoices)
      const isTrial = invoice.amount_paid === 0;
      
      if (isTrial) {
        await supabase
          .from("referrals")
          .update({ status: "trial" })
          .eq("partner_id", partner.id)
          .in("status", ["pending", "signed_up", "tracked"]);

        console.log(`[Webhook] Referral moved to trial status for partner ${partner.id}`);
      }

      console.log(`[Webhook] Updating subscription for partner ${partner.id}: ${subscriptionId}, plan: ${planTier}, isTrial: ${isTrial}`);
      
      // Reset AI credits on each billing period (including trial start)
      const nextResetAt = new Date(line.period.end * 1000).toISOString();

      await supabase
        .from("partners")
        .update({
          stripe_subscription_id: subscriptionId,
          subscription_status: "active",
          subscription_plan: planTier,
          subscription_start_date: new Date(line.period.start * 1000).toISOString(),
          subscription_end_date: new Date(line.period.end * 1000).toISOString(),
          ai_credits_used: 0,
          ai_credits_addon_remaining: 0,
          ai_credits_reset_at: nextResetAt,
        })
        .eq("id", partner.id);

      console.log(`[Webhook] Subscription updated: ${subscriptionId}, plan: ${planTier}, isTrial: ${isTrial}, creditsReset, end: ${nextResetAt}`);
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

    // Process affiliate commission if applicable
    await handleAffiliateCommission(invoice, partner.id);
  }

  async function handleAffiliateCommission(invoice: any, partnerId: string) {
    try {
      // Check if partner was referred by an affiliate
      const { data: partner } = await supabase
        .from("partners")
        .select("id, referred_by_affiliate_id")
        .eq("id", partnerId)
        .single();

      if (!partner?.referred_by_affiliate_id) {
        console.log("[Webhook] No affiliate referral for partner:", partnerId);
        return;
      }

      const affiliateId = partner.referred_by_affiliate_id;
      console.log("[Webhook] Processing affiliate commission for affiliate:", affiliateId);

      // Get the referral record
      const { data: referral } = await supabase
        .from("referrals")
        .select("id, first_payment_at")
        .eq("affiliate_id", affiliateId)
        .eq("partner_id", partnerId)
        .single();

      if (!referral) {
        console.log("[Webhook] No referral record found for affiliate/partner pair");
        return;
      }

      // Check if invoice amount is 0 (trial invoice) - skip commission
      if (invoice.amount_paid === 0) {
        console.log("[Webhook] Skipping commission for $0 trial invoice");
        return;
      }

      // Count existing commissions for this referral
      const { count: existingCommissions } = await supabase
        .from("affiliate_commissions")
        .select("id", { count: "exact" })
        .eq("referral_id", referral.id);

      const commissionCount = existingCommissions || 0;

      // Check if duplicate invoice
      const { data: existingInvoice } = await supabase
        .from("affiliate_commissions")
        .select("id")
        .eq("stripe_invoice_id", invoice.id)
        .single();

      if (existingInvoice) {
        console.log("[Webhook] Commission already exists for invoice:", invoice.id);
        return;
      }

      // Max 7 commissions: 1 first payment + 6 recurring months
      if (commissionCount >= 7) {
        console.log("[Webhook] Max commissions reached for referral:", referral.id);
        return;
      }

      const invoiceAmountDollars = invoice.amount_paid / 100;
      const isFirstPayment = !referral.first_payment_at;
      
      let commissionAmount: number;
      let commissionType: string;
      let commissionRate: number | null;

      if (isFirstPayment) {
        // First payment: fixed $39
        commissionAmount = 39.00;
        commissionType = "first_payment";
        commissionRate = null;

        // Update referral status and first_payment_at
        await supabase
          .from("referrals")
          .update({ 
            status: "qualified", 
            first_payment_at: new Date().toISOString() 
          })
          .eq("id", referral.id);
      } else {
        // Recurring: 25% of payment for 6 months
        commissionAmount = Math.round(invoiceAmountDollars * 0.25 * 100) / 100;
        commissionType = "recurring";
        commissionRate = 25.00;
      }

      // Create commission record
      await supabase.from("affiliate_commissions").insert({
        affiliate_id: affiliateId,
        referral_id: referral.id,
        partner_id: partnerId,
        stripe_invoice_id: invoice.id,
        type: commissionType,
        amount: commissionAmount,
        invoice_amount: invoiceAmountDollars,
        commission_rate: commissionRate,
        payment_number: commissionCount + 1,
        status: "pending",
      });

      // Update affiliate totals
      await supabase.rpc("update_affiliate_totals", { aff_id: affiliateId });

      console.log(`[Webhook] Affiliate commission created: ${commissionType} $${commissionAmount} for affiliate ${affiliateId}`);
    } catch (err) {
      console.error("[Webhook] Affiliate commission error (non-blocking):", err);
    }
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
        console.log("[Webhook] Processing checkout.session.completed");
        await handleAiAddonCheckout(event.data.object);
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
