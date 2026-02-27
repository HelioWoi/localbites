import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  try {
    const { email, restaurant_name, trial_days } = await req.json();

    if (!email || !restaurant_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send welcome email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MenuLove <noreply@menulove.com.au>',
        to: [email],
        subject: `Welcome to MenuLove, ${restaurant_name}! 🎉`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 40px 60px 40px; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Welcome to MenuLove! 🎉</h1>
                          <p style="margin: 16px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 18px;">Your video menu journey starts now</p>
                        </td>
                      </tr>

                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="margin: 0 0 24px 0; color: #18181b; font-size: 16px; line-height: 1.6;">
                            Hi <strong>${restaurant_name}</strong>,
                          </p>
                          
                          <p style="margin: 0 0 24px 0; color: #18181b; font-size: 16px; line-height: 1.6;">
                            Welcome aboard! We're thrilled to have you join MenuLove. Your account is now active with a <strong>${trial_days}-day free trial</strong> of our Premium plan.
                          </p>

                          <!-- Trial Box -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px; margin: 24px 0;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0 0 8px 0; color: #9a3412; font-size: 14px; font-weight: 600; text-transform: uppercase;">Your Premium Trial</p>
                                <p style="margin: 0; color: #18181b; font-size: 18px; font-weight: bold;">${trial_days} days of unlimited access</p>
                                <p style="margin: 8px 0 0 0; color: #52525b; font-size: 14px;">No credit card required during trial</p>
                              </td>
                            </tr>
                          </table>

                          <h2 style="margin: 32px 0 16px 0; color: #18181b; font-size: 20px; font-weight: bold;">What's included:</h2>
                          
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #22c55e; font-size: 18px; margin-right: 8px;">✓</span>
                                <span style="color: #18181b; font-size: 15px;">Unlimited video uploads</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #22c55e; font-size: 18px; margin-right: 8px;">✓</span>
                                <span style="color: #18181b; font-size: 15px;">QR Code menu for your restaurant</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #22c55e; font-size: 18px; margin-right: 8px;">✓</span>
                                <span style="color: #18181b; font-size: 15px;">Smart search & discovery</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #22c55e; font-size: 18px; margin-right: 8px;">✓</span>
                                <span style="color: #18181b; font-size: 15px;">Analytics dashboard</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #22c55e; font-size: 18px; margin-right: 8px;">✓</span>
                                <span style="color: #18181b; font-size: 15px;">Priority support</span>
                              </td>
                            </tr>
                          </table>

                          <h2 style="margin: 32px 0 16px 0; color: #18181b; font-size: 20px; font-weight: bold;">Get started in 3 easy steps:</h2>
                          
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                            <tr>
                              <td style="padding: 16px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 12px;">
                                <p style="margin: 0 0 4px 0; color: #92400e; font-size: 14px; font-weight: 600;">1. Upload your first video</p>
                                <p style="margin: 0; color: #78350f; font-size: 13px;">Show off your best dishes (max 30s, 10MB)</p>
                              </td>
                            </tr>
                          </table>
                          
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                            <tr>
                              <td style="padding: 16px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 12px;">
                                <p style="margin: 0 0 4px 0; color: #92400e; font-size: 14px; font-weight: 600;">2. Download your QR Code</p>
                                <p style="margin: 0; color: #78350f; font-size: 13px;">Print and display at your restaurant</p>
                              </td>
                            </tr>
                          </table>
                          
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                            <tr>
                              <td style="padding: 16px; background-color: #fef3c7; border-radius: 8px;">
                                <p style="margin: 0 0 4px 0; color: #92400e; font-size: 14px; font-weight: 600;">3. Watch your engagement grow</p>
                                <p style="margin: 0; color: #78350f; font-size: 13px;">Track views and saves in your dashboard</p>
                              </td>
                            </tr>
                          </table>

                          <!-- CTA Button -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                            <tr>
                              <td align="center">
                                <a href="https://menulove.com.au/partner" style="display: inline-block; padding: 16px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
                                  Go to Dashboard →
                                </a>
                              </td>
                            </tr>
                          </table>

                          <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                            Need help? Reply to this email or visit our <a href="https://menulove.com.au/help" style="color: #f97316; text-decoration: none;">Help Center</a>.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 8px 0; color: #71717a; font-size: 13px;">
                            MenuLove - Video Menus & Smart Discovery
                          </p>
                          <p style="margin: 0 0 4px 0; color: #a1a1aa; font-size: 12px;">
                            Made with <span style="color: #dc2626;">❤️</span> in Australia | <a href="mailto:contact@menulove.com.au" style="color: #f97316; text-decoration: none;">contact@menulove.com.au</a>
                          </p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                            All rights reserved.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Welcome email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
