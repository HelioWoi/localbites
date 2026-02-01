import { supabase } from '../lib/supabase';

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
    id: 'monthly',
    name: 'Monthly Premium',
    price: 29.90,
    interval: 'month',
    priceId: 'price_1SvzbsIG1T8Ip1Z0zLOzEVBR',
    features: [
      'Unlimited video uploads',
      'Premium profile badge',
      'Featured in search results',
      'Analytics dashboard',
      'Priority support',
    ],
  },
  {
    id: 'annual',
    name: 'Annual Premium',
    price: 308.90,
    interval: 'year',
    priceId: 'price_1SvzdrIG1T8Ip1Z0EQGKZjer',
    features: [
      'Unlimited video uploads',
      'Premium profile badge',
      'Featured in search results',
      'Analytics dashboard',
      'Priority support',
      'Save $49.90/year (14% off)',
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
