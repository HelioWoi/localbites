const SUPABASE_URL = 'https://quybuvapflnzcaedjbkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

async function checkFlume() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/partners?select=*,menu_items(*)&email=eq.flumedining@gmail.com`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    const data = await response.json();
    
    if (data.length > 0) {
      const flume = data[0];
      const now = new Date();
      const trialEndsAt = flume.trial_ends_at ? new Date(flume.trial_ends_at) : null;
      const isTrialActive = trialEndsAt && trialEndsAt > now;
      
      console.log('\n=== FLUME BY THE RIVER STATUS ===\n');
      console.log('Restaurant Name:', flume.restaurant_name);
      console.log('Slug:', flume.slug);
      console.log('Email:', flume.email);
      console.log('Address:', flume.address);
      console.log('Latitude:', flume.latitude);
      console.log('Longitude:', flume.longitude);
      console.log('\n--- Subscription Info ---');
      console.log('Subscription Status:', flume.subscription_status);
      console.log('Trial Ends At:', flume.trial_ends_at);
      console.log('Trial Active:', isTrialActive ? '✅ YES' : '❌ NO');
      console.log('Lifetime Access:', flume.lifetime_access ? '✅ YES' : '❌ NO');
      console.log('\n--- Google Data ---');
      console.log('Google Place ID:', flume.google_place_id || '❌ NOT SET');
      console.log('Google Maps URL:', flume.google_maps_url || '❌ NOT SET');
      console.log('Rating:', flume.rating || 'N/A');
      console.log('Total Reviews:', flume.total_reviews || 'N/A');
      console.log('\n--- Menu Items ---');
      console.log('Total Items:', flume.menu_items?.length || 0);
      
      if (flume.menu_items && flume.menu_items.length > 0) {
        console.log('\nItems:');
        flume.menu_items.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.name} (${item.category}) - ${item.video_url ? 'Video' : item.photo_url ? 'Photo' : 'No media'}`);
        });
      }
      
      console.log('\n--- Will Appear in Feed? ---');
      const hasName = !!flume.restaurant_name;
      const hasItems = flume.menu_items && flume.menu_items.length > 0;
      const hasCoordinates = flume.latitude && flume.longitude;
      const isActive = flume.lifetime_access || isTrialActive || flume.subscription_status === 'active';
      
      console.log('Has Name:', hasName ? '✅' : '❌');
      console.log('Has Menu Items:', hasItems ? '✅' : '❌');
      console.log('Has Coordinates:', hasCoordinates ? '✅' : '❌');
      console.log('Is Active (trial/subscription):', isActive ? '✅' : '❌');
      
      const willAppear = hasName && hasItems && hasCoordinates && isActive;
      console.log('\n🎯 WILL APPEAR IN FEED:', willAppear ? '✅ YES' : '❌ NO');
      
      if (!willAppear) {
        console.log('\n⚠️  ISSUES TO FIX:');
        if (!hasName) console.log('  - Missing restaurant name');
        if (!hasItems) console.log('  - No menu items');
        if (!hasCoordinates) console.log('  - Missing latitude/longitude');
        if (!isActive) console.log('  - No active trial or subscription');
      }
    } else {
      console.log('❌ Flume by the River not found in database');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFlume();
