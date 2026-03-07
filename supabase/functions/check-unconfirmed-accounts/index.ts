import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    console.log('[Check Unconfirmed Accounts] Starting check...');

    // Get all partners with unconfirmed emails who want to receive marketing emails
    const { data: unconfirmedPartners, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .eq('email_confirmed', false)
      .eq('marketing_emails_enabled', true)
      .order('created_at', { ascending: false });

    if (partnersError) {
      throw new Error(`Failed to fetch unconfirmed partners: ${partnersError.message}`);
    }

    if (!unconfirmedPartners || unconfirmedPartners.length === 0) {
      console.log('[Check Unconfirmed Accounts] No unconfirmed accounts found');
      return new Response(
        JSON.stringify({ success: true, message: 'No unconfirmed accounts found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Check Unconfirmed Accounts] Found ${unconfirmedPartners.length} unconfirmed accounts`);

    const now = new Date();
    const emailsSent = [];

    for (const partner of unconfirmedPartners) {
      const createdAt = new Date(partner.created_at);
      const minutesSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
      const hoursSinceCreation = Math.floor(minutesSinceCreation / 60);

      let emailType: string | null = null;

      // Determine which email to send based on time elapsed
      if (minutesSinceCreation >= 10 && minutesSinceCreation < 720) {
        // 10 minutes to 12 hours
        emailType = '10min';
      } else if (hoursSinceCreation >= 12 && hoursSinceCreation < 24) {
        emailType = '12h';
      } else if (hoursSinceCreation >= 24 && hoursSinceCreation < 48) {
        emailType = '24h';
      } else if (hoursSinceCreation >= 48 && hoursSinceCreation < 72) {
        emailType = '48h';
      } else if (hoursSinceCreation >= 72) {
        emailType = '72h';
      }

      if (!emailType) {
        console.log(`[Check Unconfirmed Accounts] Skipping ${partner.email} - too soon (${minutesSinceCreation} minutes)`);
        continue;
      }

      // Check if this email type was already sent
      const { data: existingEmail } = await supabase
        .from('activation_emails')
        .select('id')
        .eq('partner_id', partner.id)
        .eq('email_type', emailType)
        .single();

      if (existingEmail) {
        console.log(`[Check Unconfirmed Accounts] Skipping ${partner.email} - ${emailType} already sent`);
        continue;
      }

      // Send activation reminder email
      console.log(`[Check Unconfirmed Accounts] Sending ${emailType} email to ${partner.email}`);

      const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-activation-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          partner: {
            id: partner.id,
            email: partner.email,
            restaurant_name: partner.restaurant_name || 'Restaurant',
          },
          emailType,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error(`[Check Unconfirmed Accounts] Failed to send ${emailType} to ${partner.email}:`, errorText);
        continue;
      }

      // Record that this email was sent
      const { error: insertError } = await supabase
        .from('activation_emails')
        .insert({
          partner_id: partner.id,
          email_type: emailType,
        });

      if (insertError) {
        console.error(`[Check Unconfirmed Accounts] Failed to record ${emailType} for ${partner.email}:`, insertError);
      } else {
        emailsSent.push({ partner: partner.email, emailType });
        console.log(`[Check Unconfirmed Accounts] ✅ Sent ${emailType} to ${partner.email}`);
      }
    }

    console.log(`[Check Unconfirmed Accounts] Completed. Sent ${emailsSent.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${unconfirmedPartners.length} unconfirmed accounts, sent ${emailsSent.length} emails`,
        emailsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Check Unconfirmed Accounts] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
