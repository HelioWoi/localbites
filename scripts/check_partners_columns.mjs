const SUPABASE_URL = 'https://quybuvapflnzcaedjbkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

async function checkColumns() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/partners?email=eq.flumedining@gmail.com&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    const data = await response.json();
    
    if (data.length > 0) {
      console.log('Columns in partners table:');
      console.log(Object.keys(data[0]).join(', '));
      
      const hasGooglePlaceId = 'google_place_id' in data[0];
      const hasGoogleMapsUrl = 'google_maps_url' in data[0];
      
      console.log('\nGoogle columns exist:');
      console.log(`  google_place_id: ${hasGooglePlaceId ? '✅' : '❌'}`);
      console.log(`  google_maps_url: ${hasGoogleMapsUrl ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkColumns();
