const SUPABASE_URL = 'https://quybuvapflnzcaedjbkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MzY4NzAsImV4cCI6MjA1MzAxMjg3MH0.qMBCfg-9Nq1Ux1bDfaGvmQqNKZXq5UNHNcBXqZ9gN3o';

async function searchFlumeRestaurant() {
  try {
    console.log('Searching for Flume by the River via Google Places API...\n');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/google-places`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'textSearch',
        lat: -26.6564,
        lng: 153.0897,
        radius: 5000,
        query: 'Flume by the River Maroochydore'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const results = await response.json();
    
    console.log('=== SEARCH RESULTS ===');
    console.log(`Found ${results.length} results\n`);
    
    results.forEach((result, index) => {
      console.log(`Result ${index + 1}:`);
      console.log(`  Name: ${result.name}`);
      console.log(`  Place ID: ${result.id}`);
      console.log(`  Address: ${result.address}`);
      console.log(`  Rating: ${result.rating} (${result.totalReviews} reviews)`);
      console.log(`  Google Maps URL: ${result.googleMapsUrl}`);
      console.log(`  Website: ${result.website || 'N/A'}`);
      console.log('');
    });
    
    if (results.length > 0) {
      const flume = results[0];
      console.log('\n=== SQL TO UPDATE DATABASE ===\n');
      console.log(`UPDATE partners
SET 
  google_place_id = '${flume.id}',
  google_maps_url = '${flume.googleMapsUrl}',
  rating = ${flume.rating},
  total_reviews = ${flume.totalReviews}${flume.website ? `,
  website = '${flume.website}'` : ''}
WHERE email = 'flumedining@gmail.com';
`);
    } else {
      console.log('No results found. Try searching manually on Google Maps.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

searchFlumeRestaurant();
