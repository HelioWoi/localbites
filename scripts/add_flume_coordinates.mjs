const SUPABASE_URL = 'https://quybuvapflnzcaedjbkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

async function addCoordinates() {
  try {
    // Maroochydore coordinates for Flume by the River
    const latitude = -26.6564;
    const longitude = 153.0897;
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/partners?email=eq.flumedining@gmail.com`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        latitude,
        longitude
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update failed: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Successfully added coordinates to Flume by the River!');
    console.log('\nUpdated data:');
    console.log(`  Latitude: ${result[0].latitude}`);
    console.log(`  Longitude: ${result[0].longitude}`);
    console.log('\n🎯 Flume will now appear in the feed alongside Backstreet Cafe!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addCoordinates();
