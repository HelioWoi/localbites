import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
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
    const { email, restaurantName, confirmationToken, selectedPlan } = await req.json();

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY is not configured in Supabase Edge Function secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !restaurantName || !confirmationToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always use production URL since Edge Function runs on Supabase (production)
    const confirmationUrl = `https://menulove.com.au/confirm-email?token=${confirmationToken}`;

    const normalizedPlan = String(selectedPlan || 'free').toLowerCase();
    const plan = normalizedPlan === 'basic' || normalizedPlan === 'pro' ? normalizedPlan : 'free';

    const planMeta: Record<'free' | 'basic' | 'pro', {
      label: string;
      cta: string;
      boxTitle: string;
      intro: string;
      features: string[];
    }> = {
      free: {
        label: 'Free',
        cta: 'Confirm Email & Start Your Free Plan',
        boxTitle: 'Your Free Plan Includes:',
        intro: 'You selected the Free plan. Great for getting started quickly.',
        features: [
          '14-day onboarding trial access',
          'Menu profile setup',
          'QR code menu sharing',
          'Upgrade to Basic or Pro anytime',
        ],
      },
      basic: {
        label: 'Basic',
        cta: 'Confirm Email & Start Your Basic Trial',
        boxTitle: 'Your Basic Plan Includes:',
        intro: 'You selected the Basic plan. Ideal for growing restaurants.',
        features: [
          'Everything in Free',
          'Unlimited menu items',
          'Video upload support',
          'Analytics dashboard',
          'Email support',
        ],
      },
      pro: {
        label: 'Pro',
        cta: 'Confirm Email & Start Your Pro Trial',
        boxTitle: 'Your Pro Plan Includes:',
        intro: 'You selected the Pro plan for advanced growth features.',
        features: [
          'Everything in Basic',
          'Advanced analytics',
          'AI photo enhancement features',
          'Priority support',
          'White-label options',
        ],
      },
    };

    const selectedPlanMeta = planMeta[plan];
    const featuresHtml = selectedPlanMeta.features
      .map((feature) => `<li>${feature}</li>`)
      .join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - MenuLove</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to MenuLove! 🎉</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 20px; font-weight: 600;">Hi ${restaurantName}!</h2>
              
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for MenuLove! We're excited to help you showcase your menu with beautiful video content.
              </p>

              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                ${selectedPlanMeta.intro}
              </p>

              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                To get started, please confirm your email address by clicking the button below:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${confirmationUrl}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                      ${selectedPlanMeta.cta}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px; color: #71717a; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${confirmationUrl}" style="color: #f97316; word-break: break-all;">${confirmationUrl}</a>
              </p>

              <!-- Trial Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 12px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px; color: #92400e; font-size: 16px; font-weight: 600;">✨ ${selectedPlanMeta.boxTitle}</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                      ${featuresHtml}
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                This confirmation link will expire in 24 hours. If you didn't create an account with MenuLove, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 30px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; color: #71717a; font-size: 14px;">
                Need help? Contact us at <a href="mailto:contact@menulove.com.au" style="color: #f97316; text-decoration: none;">contact@menulove.com.au</a>
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                Built with 🧡 in Australia
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MenuLove <noreply@menulove.com.au>',
        to: [email],
        subject: `Confirm Your Email - ${selectedPlanMeta.label} Plan | MenuLove`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      let errorMessage = errorText;

      try {
        const parsed = JSON.parse(errorText) as { message?: string; error?: string };
        errorMessage = parsed.message || parsed.error || errorText;
      } catch {
      }

      console.error('Resend API error:', errorMessage);
      throw new Error(`Failed to send email: ${errorMessage}`);
    }

    const result = await resendResponse.json();
    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
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
