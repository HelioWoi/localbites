// Script to check partner data in Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quybuvapflnzcaedjbkl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPartnerData() {
  console.log('\n🔍 Checking partner data for: heliocwoi@gmail.com\n');

  // Get partner
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('email', 'heliocwoi@gmail.com')
    .single();

  if (partnerError) {
    console.error('❌ Error fetching partner:', partnerError.message);
    return;
  }

  if (!partner) {
    console.log('❌ Partner not found');
    return;
  }

  console.log('✅ Partner found:');
  console.log('   ID:', partner.id);
  console.log('   Email:', partner.email);
  console.log('   Restaurant Name:', partner.restaurant_name || '❌ NOT SET');
  console.log('   Slug:', partner.slug || '❌ NOT SET');
  console.log('   Address:', partner.address || '❌ NOT SET');
  console.log('   Cuisine:', partner.cuisine || '❌ NOT SET');
  console.log('   Plan:', partner.plan);
  console.log('   Trial Ends:', partner.trial_ends_at);

  // Get menu items
  const { data: menuItems, error: itemsError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('partner_id', partner.id);

  if (itemsError) {
    console.error('❌ Error fetching menu items:', itemsError.message);
    return;
  }

  console.log('\n📹 Menu Items:', menuItems?.length || 0);
  if (menuItems && menuItems.length > 0) {
    menuItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} (${item.category})`);
      console.log(`      Featured: ${item.is_featured ? '⭐ YES' : 'No'}`);
      console.log(`      Video: ${item.video_url ? '✅' : '❌'}`);
    });
  }

  // Check why it's not appearing
  console.log('\n📊 Feed Visibility Check:');
  if (!partner.restaurant_name) {
    console.log('   ❌ PROBLEM: restaurant_name is not set');
    console.log('   → Go to Partner Dashboard → Settings → Save restaurant name');
  }
  if (!menuItems || menuItems.length === 0) {
    console.log('   ❌ PROBLEM: No menu items (videos) uploaded');
    console.log('   → Go to Partner Dashboard → Menu → Add Item');
  }
  if (partner.restaurant_name && menuItems && menuItems.length > 0) {
    console.log('   ✅ All requirements met! Restaurant should appear in feed.');
    console.log('   → Try searching for:', partner.restaurant_name);
  }

  console.log('\n');
}

checkPartnerData();
