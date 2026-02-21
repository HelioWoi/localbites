const SUPABASE_URL = 'https://quybuvapflnzcaedjbkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

async function updateFlumeGoogleData() {
  try {
    console.log('Updating Flume by the River with Google Place data...\n');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/partners?email=eq.flumedining@gmail.com`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        google_place_id: 'ChIJ2xk-KKB3k2sR61ntTxoGZrg',
        google_maps_url: 'https://maps.google.com/?cid=13287314460683098603',
        rating: 4.3,
        total_reviews: 263
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update failed: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Successfully updated Flume by the River!');
    console.log('\nUpdated data:');
    console.log(`  Google Place ID: ${result[0].google_place_id}`);
    console.log(`  Google Maps URL: ${result[0].google_maps_url}`);
    console.log(`  Rating: ${result[0].rating}`);
    console.log(`  Total Reviews: ${result[0].total_reviews}`);
    console.log('\n🎯 Reviews will now appear on the restaurant page!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateFlumeGoogleData();
