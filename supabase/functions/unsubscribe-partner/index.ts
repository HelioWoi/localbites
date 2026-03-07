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
    const { partnerId, action } = await req.json();

    if (!partnerId) {
      return new Response(
        JSON.stringify({ error: 'Missing partner ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update marketing preferences
    const marketingEnabled = action === 'subscribe';

    const { data, error } = await supabase
      .from('partners')
      .update({ marketing_emails_enabled: marketingEnabled })
      .eq('id', partnerId)
      .select('email, restaurant_name, marketing_emails_enabled')
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      throw new Error(`Failed to update preferences: ${error.message}`);
    }

    console.log(`[Unsubscribe] ${data.email} - marketing_emails_enabled: ${marketingEnabled}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: marketingEnabled 
          ? 'Successfully subscribed to marketing emails' 
          : 'Successfully unsubscribed from marketing emails',
        partner: {
          email: data.email,
          restaurant_name: data.restaurant_name,
          marketing_emails_enabled: data.marketing_emails_enabled,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
