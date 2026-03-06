import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('[Check Expiring] Starting expiration check...');
    
    const now = new Date();
    const results = {
      checked: 0,
      reminders_sent: 0,
      errors: 0,
      details: [] as any[]
    };

    // Get all partners with trial or subscription
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, email, restaurant_name, trial_ends_at, subscription_end_date, subscription_status, lifetime_access')
      .or('trial_ends_at.not.is.null,subscription_end_date.not.is.null');

    if (partnersError) {
      throw new Error(`Failed to fetch partners: ${partnersError.message}`);
    }

    console.log(`[Check Expiring] Found ${partners?.length || 0} partners to check`);

    for (const partner of partners || []) {
      results.checked++;
      
      // Skip lifetime access partners
      if (partner.lifetime_access === true) {
        console.log(`[Check Expiring] Skipping ${partner.restaurant_name} - has lifetime access`);
        continue;
      }

      // Determine expiration date (trial or subscription)
      let expirationDate: Date | null = null;
      let expirationSource = '';

      // Priority 1: Active subscription end date
      if (partner.subscription_status === 'active' && partner.subscription_end_date) {
        expirationDate = new Date(partner.subscription_end_date);
        expirationSource = 'subscription';
      }
      // Priority 2: Trial end date
      else if (partner.trial_ends_at) {
        expirationDate = new Date(partner.trial_ends_at);
        expirationSource = 'trial';
      }

      if (!expirationDate) {
        console.log(`[Check Expiring] Skipping ${partner.restaurant_name} - no expiration date`);
        continue;
      }

      // Calculate days until expiration
      const diffTime = expirationDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      console.log(`[Check Expiring] ${partner.restaurant_name}: ${daysLeft} days left (${expirationSource})`);

      // Determine reminder type based on days left
      let reminderType: string | null = null;
      if (daysLeft === 10) reminderType = '10_days';
      else if (daysLeft === 5) reminderType = '5_days';
      else if (daysLeft === 3) reminderType = '3_days';
      else if (daysLeft === 2) reminderType = '2_days';
      else if (daysLeft === 1) reminderType = '1_day';
      else if (daysLeft <= 0) reminderType = 'expired';

      if (!reminderType) {
        console.log(`[Check Expiring] ${partner.restaurant_name}: No reminder needed (${daysLeft} days)`);
        continue;
      }

      // Check if reminder already sent
      const { data: existingReminder } = await supabase
        .from('expiration_reminders')
        .select('id')
        .eq('partner_id', partner.id)
        .eq('reminder_type', reminderType)
        .eq('expiration_date', expirationDate.toISOString())
        .single();

      if (existingReminder) {
        console.log(`[Check Expiring] ${partner.restaurant_name}: ${reminderType} reminder already sent`);
        continue;
      }

      // Send reminder email
      console.log(`[Check Expiring] Sending ${reminderType} reminder to ${partner.restaurant_name}`);
      
      try {
        const { error: emailError } = await supabase.functions.invoke('send-expiration-reminder', {
          body: {
            partner: {
              id: partner.id,
              email: partner.email,
              restaurant_name: partner.restaurant_name
            },
            daysLeft,
            reminderType
          }
        });

        if (emailError) {
          throw emailError;
        }

        // Record that reminder was sent
        const { error: insertError } = await supabase
          .from('expiration_reminders')
          .insert({
            partner_id: partner.id,
            reminder_type: reminderType,
            expiration_date: expirationDate.toISOString()
          });

        if (insertError) {
          console.error(`[Check Expiring] Failed to record reminder for ${partner.restaurant_name}:`, insertError);
        }

        results.reminders_sent++;
        results.details.push({
          partner: partner.restaurant_name,
          reminderType,
          daysLeft,
          success: true
        });

        console.log(`[Check Expiring] ✅ Sent ${reminderType} reminder to ${partner.restaurant_name}`);
      } catch (error) {
        results.errors++;
        results.details.push({
          partner: partner.restaurant_name,
          reminderType,
          daysLeft,
          success: false,
          error: error.message
        });
        console.error(`[Check Expiring] ❌ Failed to send reminder to ${partner.restaurant_name}:`, error);
      }
    }

    console.log('[Check Expiring] Summary:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        ...results,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Check Expiring] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
