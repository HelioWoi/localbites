import { textSearchRestaurants } from '../services/googlePlacesProxy';

async function searchFlumeRestaurant() {
  try {
    console.log('Searching for Flume by the River...');
    
    // Maroochydore coordinates
    const lat = -26.6564;
    const lng = 153.0897;
    
    const results = await textSearchRestaurants(
      lat,
      lng,
      5000,
      'Flume by the River Maroochydore'
    );
    
    console.log('\n=== SEARCH RESULTS ===');
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
      console.log('\n=== SQL TO UPDATE DATABASE ===');
      console.log(`
UPDATE partners
SET 
  google_place_id = '${flume.id}',
  google_maps_url = '${flume.googleMapsUrl}',
  rating = ${flume.rating},
  total_reviews = ${flume.totalReviews}${flume.website ? `,\n  website = '${flume.website}'` : ''}
WHERE email = 'flumedining@gmail.com';
      `);
    }
    
  } catch (error) {
    console.error('Error searching for restaurant:', error);
  }
}

searchFlumeRestaurant();
