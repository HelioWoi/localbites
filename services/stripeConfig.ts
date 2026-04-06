const LIVE_STRIPE_PRICE_IDS = {
  monthly: 'price_1TJ1EwIG1T8Ip1Z0n23ZgsZF',
  annual: 'price_1SxxDjIG1T8Ip1Z0cgTPEV7Z',
} as const;

export const STRIPE_PRICE_IDS = {
  monthly: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || LIVE_STRIPE_PRICE_IDS.monthly,
  annual: import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID || LIVE_STRIPE_PRICE_IDS.annual,
} as const;

export const STRIPE_MODE = import.meta.env.VITE_STRIPE_MODE || 'live';

export const isUsingLiveStripeFallback =
  STRIPE_PRICE_IDS.monthly === LIVE_STRIPE_PRICE_IDS.monthly &&
  STRIPE_PRICE_IDS.annual === LIVE_STRIPE_PRICE_IDS.annual;
