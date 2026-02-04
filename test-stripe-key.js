// Test script to verify Stripe key and Price ID
// Run with: node test-stripe-key.js

const STRIPE_SECRET_KEY = process.argv[2];
const PRICE_ID = 'price_1SwsaOIG1T8Ip1Z0QZUp224w';

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Usage: node test-stripe-key.js sk_test_...');
  process.exit(1);
}

console.log('🔍 Testing Stripe configuration...\n');
console.log('Key format:', STRIPE_SECRET_KEY.substring(0, 10) + '...');
console.log('Price ID:', PRICE_ID);
console.log('\n📡 Fetching price from Stripe API...\n');

fetch(`https://api.stripe.com/v1/prices/${PRICE_ID}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
  },
})
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error('❌ Stripe API Error:');
      console.error('   Type:', data.error.type);
      console.error('   Code:', data.error.code);
      console.error('   Message:', data.error.message);
      console.error('\n💡 Solution:');
      if (data.error.type === 'invalid_request_error' && data.error.code === 'api_key_invalid') {
        console.error('   - Get valid key from: https://dashboard.stripe.com/test/apikeys');
        console.error('   - Make sure you are in TEST MODE');
        console.error('   - Copy the "Secret key" (starts with sk_test_)');
      } else if (data.error.code === 'resource_missing') {
        console.error('   - Price ID does not exist in your Stripe account');
        console.error('   - Create a new price at: https://dashboard.stripe.com/test/products');
        console.error('   - Or use an existing price ID from your Stripe dashboard');
      }
      process.exit(1);
    }
    
    console.log('✅ Stripe API connection successful!\n');
    console.log('📦 Price Details:');
    console.log('   ID:', data.id);
    console.log('   Type:', data.type);
    console.log('   Active:', data.active);
    console.log('   Amount:', `$${(data.unit_amount / 100).toFixed(2)} ${data.currency.toUpperCase()}`);
    console.log('   Interval:', data.recurring?.interval || 'N/A');
    console.log('   Product:', data.product);
    console.log('\n✅ Configuration is valid! You can proceed with testing checkout.');
  })
  .catch(err => {
    console.error('❌ Network Error:', err.message);
    console.error('\n💡 Check your internet connection');
  });
