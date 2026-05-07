import { supabase } from '../lib/supabase';
import { STRIPE_PRICE_IDS } from './stripeConfig';

// ── Plan tiers ───────────────────────────────────────────────────────────────
export type PlanId = 'free' | 'basic' | 'pro';

export interface PlanLimits {
  menuItems: number;       // Infinity = unlimited
  aiCredits: number;       // per month; 0 = disabled
  locations: number;
  analytics: boolean;
  analyticsAdvanced: boolean;
  customBranding: boolean;
  whiteLabel: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    menuItems:         10,
    aiCredits:         0,
    locations:         1,
    analytics:         false,
    analyticsAdvanced: false,
    customBranding:    false,
    whiteLabel:        false,
  },
  basic: {
    menuItems:         Infinity,
    aiCredits:         50,
    locations:         1,
    analytics:         true,
    analyticsAdvanced: false,
    customBranding:    true,
    whiteLabel:        false,
  },
  pro: {
    menuItems:         Infinity,
    aiCredits:         200,
    locations:         3,
    analytics:         true,
    analyticsAdvanced: true,
    customBranding:    true,
    whiteLabel:        true,
  },
};

// Prices in AUD cents for display
export const PLAN_PRICES = {
  basic:  { monthly: 29,  annual: 313 },   // annual = ~$26.08/mo (10% off)
  pro:    { monthly: 69,  annual: 745 },   // annual = ~$62.08/mo (10% off)
} as const;

/** Map DB value of subscription_plan → PlanId */
export function planFromString(raw: string | null | undefined, hasActive: boolean): PlanId {
  if (!hasActive) return 'free';
  if (!raw) return 'free';
  const s = raw.toLowerCase();
  if (s === 'pro') return 'pro';
  if (s === 'basic' || s === 'monthly' || s === 'annual') return 'basic';
  return 'free';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  priceId: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic_monthly',
    name: 'Basic Monthly',
    price: 29,
    interval: 'month',
    priceId: STRIPE_PRICE_IDS.basic_monthly,
    features: [
      'Unlimited menu items',
      'Custom branding',
      'Connect your checkout link',
      'Analytics (basic)',
      '50 AI photo credits / month',
      'Priority support',
    ],
  },
  {
    id: 'basic_annual',
    name: 'Basic Annual',
    price: 313,
    interval: 'year',
    priceId: STRIPE_PRICE_IDS.basic_annual,
    features: [
      'Unlimited menu items',
      'Custom branding',
      'Connect your checkout link',
      'Analytics (basic)',
      '50 AI photo credits / month',
      'Priority support',
      'Save $35/year (10% off)',
    ],
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 69,
    interval: 'month',
    priceId: STRIPE_PRICE_IDS.pro_monthly,
    features: [
      'Everything in Basic',
      'Analytics (advanced)',
      'Up to 3 locations',
      '200 AI photo credits / month',
      'Faster AI processing',
      'White-label options',
    ],
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: 745,
    interval: 'year',
    priceId: STRIPE_PRICE_IDS.pro_annual,
    features: [
      'Everything in Basic',
      'Analytics (advanced)',
      'Up to 3 locations',
      '200 AI photo credits / month',
      'Faster AI processing',
      'White-label options',
      'Save $83/year (10% off)',
    ],
  },
];

export async function createCheckoutSession(partnerId: string, priceId: string) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      partnerId,
      priceId,
      successUrl: `${window.location.origin}/partner?success=true`,
      cancelUrl: `${window.location.origin}/partner?canceled=true`,
    },
  });

  if (error) throw error;
  return data;
}

export async function createPortalSession(partnerId: string) {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: {
      partnerId,
      returnUrl: `${window.location.origin}/partner`,
    },
  });

  if (error) throw error;
  return data;
}

export async function getSubscriptionStatus(partnerId: string) {
  const { data, error } = await supabase
    .from('partners')
    .select('subscription_status, subscription_plan, subscription_end_date, stripe_customer_id, stripe_subscription_id')
    .eq('id', partnerId)
    .single();

  if (error) throw error;
  return data;
}

export function isSubscriptionActive(status: string | null): boolean {
  return status === 'active' || status === 'trialing';
}
