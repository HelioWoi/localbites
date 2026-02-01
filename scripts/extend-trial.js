// Script to extend partner trial by 14 days
// Usage: node scripts/extend-trial.js <partner_email>

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quybuvapflnzcaedjbkl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function extendTrial(email) {
  console.log(`\n🔄 Extending trial for: ${email}\n`);

  // Get current partner
  const { data: partner, error: fetchError } = await supabase
    .from('partners')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !partner) {
    console.error('❌ Partner not found:', fetchError?.message || 'No partner with this email');
    return;
  }

  console.log('📊 Current trial ends:', partner.trial_ends_at);

  // Extend by 14 days from current trial_ends_at or now
  const currentEnd = partner.trial_ends_at ? new Date(partner.trial_ends_at) : new Date();
  const newEnd = new Date(currentEnd.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { error: updateError } = await supabase
    .from('partners')
    .update({ 
      trial_ends_at: newEnd.toISOString(),
      subscription_status: 'active'
    })
    .eq('id', partner.id);

  if (updateError) {
    console.error('❌ Error extending trial:', updateError.message);
    return;
  }

  console.log('✅ Trial extended successfully!');
  console.log('📅 New trial ends:', newEnd.toISOString());
  console.log(`⏰ Days added: 14 days\n`);
}

// Get email from command line argument
const email = process.argv[2] || 'heliocwoi@gmail.com';
extendTrial(email);
