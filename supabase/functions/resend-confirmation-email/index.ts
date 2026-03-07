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
    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[Resend Confirmation] Resending confirmation email to ${email}`);

    // Get partner data
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('email', email)
      .single();

    if (partnerError || !partner) {
      console.error('[Resend Confirmation] Partner not found:', partnerError);
      throw new Error('Partner account not found');
    }

    // Check if already confirmed
    if (partner.email_confirmed) {
      console.log('[Resend Confirmation] Email already confirmed');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email already confirmed. You can login now.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new confirmation token
    const confirmationToken = crypto.randomUUID();
    const confirmationExpiresAt = new Date();
    confirmationExpiresAt.setHours(confirmationExpiresAt.getHours() + 24); // 24 hours

    // Update partner with new token
    const { error: updateError } = await supabase
      .from('partners')
      .update({
        email_confirmation_token: confirmationToken,
        email_confirmation_sent_at: new Date().toISOString(),
        email_confirmation_expires_at: confirmationExpiresAt.toISOString(),
      })
      .eq('id', partner.id);

    if (updateError) {
      console.error('[Resend Confirmation] Update error:', updateError);
      throw updateError;
    }

    // Send confirmation email via send-confirmation-email function
    const { error: emailError } = await supabase.functions.invoke('send-confirmation-email', {
      body: {
        email: partner.email,
        restaurantName: partner.restaurant_name,
        confirmationToken,
      },
    });

    if (emailError) {
      console.error('[Resend Confirmation] Email send error:', emailError);
      throw emailError;
    }

    console.log('[Resend Confirmation] ✅ Confirmation email resent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Confirmation email sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Resend Confirmation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
