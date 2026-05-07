export const STRIPE_PRICE_IDS = {
  basic_monthly:  import.meta.env.VITE_STRIPE_BASIC_MONTHLY_PRICE_ID  || '',
  basic_annual:   import.meta.env.VITE_STRIPE_BASIC_ANNUAL_PRICE_ID   || '',
  pro_monthly:    import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID    || '',
  pro_annual:     import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID     || '',
  ai_credits_50:  import.meta.env.VITE_STRIPE_AI_CREDITS_50_PRICE_ID  || '',
  // Legacy $39 plan — kept so existing subscribers are not broken
  legacy_monthly: 'price_1TJ1EwIG1T8Ip1Z0n23ZgsZF',
  legacy_annual:  'price_1SxxDjIG1T8Ip1Z0cgTPEV7Z',
} as const;

export const STRIPE_MODE = import.meta.env.VITE_STRIPE_MODE || 'live';
