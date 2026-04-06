# 🚀 Stripe Setup Guide for LocalBites

## 📋 Overview
This guide will help you set up Stripe for partner subscriptions in LocalBites.

**Subscription Plans:**
- 💳 Monthly: $39/month
- 💎 Annual: $390/year (save $78)

---

## 🔧 Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click "Start now" or "Sign up"
3. Create account with your email
4. Complete business verification

---

## 🔑 Step 2: Get API Keys

1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Click **Developers** → **API keys**
3. You'll see:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

**Copy both keys - you'll need them!**

---

## 💰 Step 3: Create Products and Prices

### Create Monthly Plan:
1. Go to **Products** → **Add product**
2. Fill in:
   ```
   Name: LocalBites Premium - Monthly
   Description: Premium subscription for restaurant partners
   Pricing model: Recurring
   Price: $39
   Billing period: Monthly
   ```
3. Click **Save product**
4. **Copy the Price ID** (starts with `price_...`)

### Create Annual Plan:
1. Click **Add product** again
2. Fill in:
   ```
   Name: LocalBites Premium - Annual
   Description: Premium subscription for restaurant partners (save 17%)
   Pricing model: Recurring
   Price: $390
   Billing period: Yearly
   ```
3. Click **Save product**
4. **Copy the Price ID** (starts with `price_...`)

---

## 🔐 Step 4: Configure Environment Variables

### Frontend (.env.local):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Supabase Edge Functions:
1. Go to Supabase Dashboard
2. **Project Settings** → **Edge Functions** → **Secrets**
3. Add these secrets:
   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

---

## 🪝 Step 5: Configure Webhooks

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Fill in:
   ```
   Endpoint URL: https://your-project.supabase.co/functions/v1/stripe-webhook
   Description: LocalBites subscription webhooks
   ```
4. Select events to listen to:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)
7. Add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

---

## 📦 Step 6: Deploy Supabase Functions

Run these commands in your terminal:

```bash
# Deploy create-checkout-session function
supabase functions deploy create-checkout-session

# Deploy create-portal-session function
supabase functions deploy create-portal-session

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook
```

---

## 🗄️ Step 7: Run Database Migration

```bash
# Apply the subscriptions migration
supabase db push
```

This creates:
- `subscriptions` table
- `payment_history` table
- Adds subscription columns to `partners` table

---

## 🎨 Step 8: Update Price IDs in Code

Edit `/Users/heliowoi/Documents/local-bites/screens/partner/SubscriptionManager.tsx`:

```typescript
const PRICE_IDS = {
  monthly: 'price_YOUR_MONTHLY_PRICE_ID',  // Replace with your actual price ID
  annual: 'price_YOUR_ANNUAL_PRICE_ID',    // Replace with your actual price ID
};
```

---

## ✅ Step 9: Test the Integration

### Test Mode (Recommended First):
1. Use test API keys (`pk_test_...` and `sk_test_...`)
2. Go to `/partner` in your app
3. Click **Subscription** tab
4. Click **Subscribe Monthly** or **Subscribe Annually**
5. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
6. Complete checkout
7. Verify subscription appears in dashboard

### Test Webhooks:
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select `customer.subscription.created`
5. Check Supabase database to verify data was updated

---

## 🚀 Step 10: Go Live

When ready for production:

1. **Switch to Live Mode** in Stripe Dashboard (toggle in top right)
2. Get **Live API keys** (starts with `pk_live_` and `sk_live_`)
3. Update environment variables with live keys
4. Create live webhook endpoint
5. Update price IDs if different in live mode
6. Test with real card (small amount)
7. Launch! 🎉

---

## 📊 Monitoring

### Stripe Dashboard:
- **Payments**: View all transactions
- **Customers**: See all subscribed partners
- **Subscriptions**: Manage active subscriptions
- **Billing**: Track revenue

### Supabase:
- Query `subscriptions` table for active subscriptions
- Query `payment_history` for transaction history
- Check `partners.subscription_status` for quick status

---

## 🆘 Troubleshooting

### Checkout not working:
- Check API keys are correct
- Verify Supabase functions are deployed
- Check browser console for errors

### Webhooks not firing:
- Verify webhook URL is correct
- Check webhook secret is set in Supabase
- Test webhook in Stripe Dashboard

### Subscription not updating:
- Check webhook events are being received
- Verify database permissions (RLS policies)
- Check Supabase function logs

---

## 💡 Next Steps

After Stripe is working:

1. Add subscription check to video upload (limit free users)
2. Add premium badge to subscribed partners in feed
3. Implement analytics for premium users
4. Add email notifications for payment failures
5. Create admin dashboard to view all subscriptions

---

## 📞 Support

If you need help:
- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs
- MenuLove Support: your-email@menulove.com.au

---

**Good luck! 🚀**
