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
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: partner, error: fetchError } = await supabase
      .from('partners')
      .select('id, restaurant_name, email_confirmed, email_confirmation_expires_at')
      .eq('email_confirmation_token', token)
      .maybeSingle();

    if (fetchError) {
      console.error('[Confirm Email] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!partner) {
      return new Response(
        JSON.stringify({ status: 'invalid', message: 'Invalid or expired confirmation link.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (partner.email_confirmed) {
      return new Response(
        JSON.stringify({
          status: 'already_confirmed',
          message: 'Your email is already confirmed!',
          restaurantName: partner.restaurant_name,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (partner.email_confirmation_expires_at) {
      const expiresAt = new Date(partner.email_confirmation_expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ status: 'expired', message: 'This confirmation link has expired. Please request a new one.' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('partners')
      .update({
        email_confirmed: true,
        email_confirmation_token: null,
        email_confirmation_sent_at: null,
        email_confirmation_expires_at: null,
      })
      .eq('id', partner.id);

    if (updateError) {
      console.error('[Confirm Email] Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        status: 'confirmed',
        message: 'Email confirmed successfully!',
        restaurantName: partner.restaurant_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Confirm Email] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to confirm email.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
