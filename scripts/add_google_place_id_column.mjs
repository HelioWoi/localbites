const SUPABASE_URL = 'https://quybuvapflnzcaedjbkl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

async function addColumnAndUpdate() {
  try {
    // Execute SQL via Supabase SQL endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE partners ADD COLUMN IF NOT EXISTS google_place_id TEXT;
          
          UPDATE partners
          SET 
            google_place_id = 'ChIJ2xk-KKB3k2sR61ntTxoGZrg',
            google_maps_url = 'https://maps.google.com/?cid=13287314460683098603',
            rating = 4.3,
            total_reviews = 263
          WHERE email = 'flumedining@gmail.com';
        `
      })
    });
    
    if (response.ok) {
      console.log('✅ Column added and Flume updated successfully!');
    } else {
      const error = await response.text();
      console.log('Using direct SQL approach instead...');
      console.log('\nRun this in Supabase SQL Editor:');
      console.log(`
ALTER TABLE partners ADD COLUMN IF NOT EXISTS google_place_id TEXT;

UPDATE partners
SET 
  google_place_id = 'ChIJ2xk-KKB3k2sR61ntTxoGZrg',
  google_maps_url = 'https://maps.google.com/?cid=13287314460683098603',
  rating = 4.3,
  total_reviews = 263
WHERE email = 'flumedining@gmail.com';
      `);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addColumnAndUpdate();
