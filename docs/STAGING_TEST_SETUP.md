# Staging/Test Environment Setup (Safe for Production)

This setup lets you test affiliate + checkout flows in Stripe test mode without changing production config.

## 1) Keep production untouched

- Do not edit production `.env` values.
- Do not replace live Stripe price IDs.
- Do not change live Supabase function secrets.

## 2) Create local staging env file

1. Copy `.env.staging.example` to `.env.staging.local`.
2. Fill with staging Supabase keys and Stripe test price IDs.

Example:

```env
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_staging_anon_key
VITE_STRIPE_MONTHLY_PRICE_ID=price_xxx_test_monthly
VITE_STRIPE_ANNUAL_PRICE_ID=price_xxx_test_annual
VITE_STRIPE_MODE=test
```

## 3) Run frontend in staging mode

```bash
npm run dev:staging
```

This loads `.env.staging.local` and keeps your normal `npm run dev` untouched.

## 4) Prepare Supabase staging project

In the staging Supabase project:

- Apply affiliate and referral migrations.
- Deploy functions:
  - `create-checkout-session`
  - `create-portal-session`
  - `stripe-webhook`
  - `validate-promo-code`

Set function secrets in staging only:

- `STRIPE_SECRET_KEY` = Stripe test secret key
- `SUPABASE_SERVICE_ROLE_KEY` = staging service role key
- `SUPABASE_URL` = staging project URL

## 5) Prepare Stripe test mode

In Stripe test data mode:

- Create monthly and annual prices for A$39/A$390.
- Copy those test `price_id` values into `.env.staging.local`.
- Configure webhook endpoint to staging `stripe-webhook` URL.

## 6) Validate end-to-end

1. Open partner signup with referral link `...?ref=ANA02F9`.
2. Complete signup + checkout using test card `4242 4242 4242 4242`.
3. Confirm referral row exists and transitions as expected.
4. Confirm first paid invoice creates `first_payment` commission.

## Important note: Affiliate code vs Promo code

- Affiliate code (e.g. `ANA02F9`) currently works via URL param `ref`.
- `Promo code` input is a separate flow validated against `promo_codes`.
- They are not interchangeable unless we explicitly implement a merged rule.
