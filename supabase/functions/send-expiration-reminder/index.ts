import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { partner, daysLeft, reminderType } = await req.json();

    if (!partner || !partner.email || !partner.restaurant_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required partner data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Expiration Reminder] Sending ${reminderType} reminder to ${partner.restaurant_name}`);

    // Determine email content based on reminder type
    let subject = '';
    let headerColor = '';
    let headerText = '';
    let mainMessage = '';
    let urgencyLevel = '';

    switch (reminderType) {
      case '10_days':
        subject = `Your MenuLove trial ends in 10 days - ${partner.restaurant_name}`;
        headerColor = '#3b82f6'; // Blue
        headerText = '⏰ Trial Ending Soon';
        mainMessage = `Your 14-day free trial will end in <strong>10 days</strong>. Don't lose access to your video menu and customer engagement tools!`;
        urgencyLevel = 'info';
        break;
      case '5_days':
        subject = `Only 5 days left on your MenuLove trial - ${partner.restaurant_name}`;
        headerColor = '#f59e0b'; // Amber
        headerText = '⚠️ 5 Days Remaining';
        mainMessage = `Your trial expires in just <strong>5 days</strong>. Subscribe now to keep your restaurant visible to customers and maintain your QR code access.`;
        urgencyLevel = 'warning';
        break;
      case '3_days':
        subject = `Last chance! 3 days left - ${partner.restaurant_name}`;
        headerColor = '#f97316'; // Orange
        headerText = '🔔 3 Days Left!';
        mainMessage = `Time is running out! Your trial ends in <strong>3 days</strong>. Don't let your customers lose access to your delicious menu.`;
        urgencyLevel = 'urgent';
        break;
      case '2_days':
        subject = `Your trial expires in 2 days - ${partner.restaurant_name}`;
        headerColor = '#ef4444'; // Red
        headerText = '⚡ 2 Days Remaining';
        mainMessage = `Your trial is almost over! Only <strong>2 days</strong> left. Subscribe today to avoid losing visibility and QR code access.`;
        urgencyLevel = 'critical';
        break;
      case '1_day':
        subject = `Final reminder: Trial ends tomorrow - ${partner.restaurant_name}`;
        headerColor = '#dc2626'; // Dark Red
        headerText = '🚨 Last Day!';
        mainMessage = `This is your final reminder! Your trial ends <strong>tomorrow</strong>. Subscribe now to keep your restaurant live on MenuLove.`;
        urgencyLevel = 'critical';
        break;
      case 'expired':
        subject = `Your MenuLove trial has ended - ${partner.restaurant_name}`;
        headerColor = '#6b7280'; // Gray
        headerText = '😔 Trial Expired';
        mainMessage = `Your trial has ended. Your restaurant is now hidden from customers and your QR code is disabled. Subscribe to restore full access.`;
        urgencyLevel = 'expired';
        break;
      default:
        throw new Error('Invalid reminder type');
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${headerColor}; padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${headerText}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 20px; font-weight: 600;">Hi ${partner.restaurant_name}!</h2>
              
              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                ${mainMessage}
              </p>

              ${reminderType === 'expired' ? `
              <!-- What You're Missing Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px; color: #991b1b; font-size: 16px; font-weight: 600;">What You're Missing:</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #991b1b; font-size: 14px; line-height: 1.8;">
                      <li>Your restaurant is <strong>hidden from customers</strong></li>
                      <li>QR code is <strong>disabled</strong></li>
                      <li>Public links are <strong>not accessible</strong></li>
                      <li>You cannot add new videos</li>
                    </ul>
                  </td>
                </tr>
              </table>
              ` : `
              <!-- Benefits Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px; color: #92400e; font-size: 16px; font-weight: 600;">Keep These Benefits:</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                      <li>Unlimited video menu uploads</li>
                      <li>Full analytics dashboard</li>
                      <li>QR code for in-restaurant use</li>
                      <li>Customer engagement tracking</li>
                      <li>Priority support</li>
                    </ul>
                  </td>
                </tr>
              </table>
              `}

              <!-- Pricing -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 12px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Simple Pricing</p>
                    <p style="margin: 0; color: #18181b; font-size: 32px; font-weight: bold;">$49<span style="font-size: 18px; font-weight: normal; color: #6b7280;">/month</span></p>
                    <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">or $490/year (save $98)</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://menulove.com.au/partner" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                      ${reminderType === 'expired' ? 'Reactivate Now' : 'Subscribe Now'}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
                Questions? Contact us at <a href="mailto:contact@menulove.com.au" style="color: #f97316; text-decoration: none;">contact@menulove.com.au</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 30px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; color: #71717a; font-size: 14px;">
                MenuLove - Video Menus & Smart Ordering
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
        to: [partner.email],
        subject: subject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await resendResponse.json();
    console.log(`[Expiration Reminder] Email sent successfully to ${partner.email}:`, result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        partner: partner.restaurant_name,
        reminderType
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
