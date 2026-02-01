// Script to add coordinates to Helio's Bar
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quybuvapflnzcaedjbkl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addCoordinates() {
  console.log('\n📍 Adding coordinates to Helio\'s Bar\n');

  // Mooloolaba coordinates (16 Smith Street)
  const lat = -26.6811;
  const lng = 153.1214;

  const { data, error } = await supabase
    .from('partners')
    .update({
      latitude: lat,
      longitude: lng
    })
    .eq('email', 'heliocwoi@gmail.com')
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Coordinates added successfully!');
  console.log('   Latitude:', lat);
  console.log('   Longitude:', lng);
  console.log('   Location: Mooloolaba, Queensland');
  console.log('\n');
}

addCoordinates();
