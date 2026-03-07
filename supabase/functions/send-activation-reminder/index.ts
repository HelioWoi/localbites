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
    const { partner, emailType } = await req.json();

    if (!partner || !partner.email || !partner.restaurant_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required partner data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Activation Reminder] Sending ${emailType} reminder to ${partner.restaurant_name}`);

    const confirmLink = `https://menulove.com.au/partner?confirm=${partner.id}`;
    const unsubscribeLink = `https://menulove.com.au/unsubscribe?id=${partner.id}`;

    let subject = '';
    let emailHtml = '';
    let fromName = '';
    const replyTo = 'contact@menulove.com.au';

    // Footer with unsubscribe link
    const footer = `
          <tr>
            <td style="background-color: #fafafa; padding: 20px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 12px;">
                This is an automated message from MenuLove
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 11px;">
                Don't want to receive these emails? <a href="${unsubscribeLink}" style="color: #f97316; text-decoration: none;">Unsubscribe</a>
              </p>
            </td>
          </tr>`;

    const personalFooter = `
          <tr>
            <td style="background-color: #fafafa; padding: 20px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 12px;">
                This is a personal message from Helio Woi, Founder of MenuLove
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 11px;">
                Don't want to receive these emails? <a href="${unsubscribeLink}" style="color: #f97316; text-decoration: none;">Unsubscribe</a>
              </p>
            </td>
          </tr>`;

    switch (emailType) {
      case '10min':
        subject = 'Please confirm your email to activate your MenuLove dashboard';
        fromName = 'MenuLove Team <noreply@menulove.com.au>';
        emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Welcome to MenuLove! 🎉</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #18181b; font-size: 18px; font-weight: 600;">Hi,</h2><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">We noticed you just created your MenuLove account but haven't confirmed your email yet.</p><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">Confirming your email takes just one click and unlocks your dashboard where you can:</p><ul style="margin: 0 0 30px; padding-left: 20px; color: #52525b; font-size: 16px; line-height: 1.8;"><li>Upload photos and videos of your dishes</li><li>Generate your custom QR code</li><li>Share your video menu with customers</li><li>Track views and engagement</li></ul><table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;"><tr><td align="center"><a href="${confirmLink}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">Confirm My Email</a></td></tr></table><p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">Once confirmed, you'll have 30 days of free trial to explore all features.</p><p style="margin: 20px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">Need help? Just reply to this email.</p><p style="margin: 30px 0 0; color: #52525b; font-size: 16px; line-height: 1.6;">Helio Woi<br><span style="color: #71717a; font-size: 14px;">MenuLove Team</span></p></td></tr>${footer}</table></td></tr></table></body></html>`;
        break;

      case '12h':
        subject = 'Your MenuLove dashboard is waiting for you';
        fromName = 'MenuLove Team <noreply@menulove.com.au>';
        emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 40px 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Your Dashboard is Ready 📱</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #18181b; font-size: 18px; font-weight: 600;">Hi,</h2><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">Your MenuLove account is almost ready — you just need to confirm your email.</p><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">Many cafés and restaurants in Australia are already using MenuLove to:</p><ul style="margin: 0 0 30px; padding-left: 20px; color: #52525b; font-size: 16px; line-height: 1.8;"><li>✓ Showcase signature dishes with short videos</li><li>✓ Make it easier for customers to choose</li><li>✓ Increase orders with visual menus</li></ul><p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">It takes less than 2 minutes to activate your account and start building your menu.</p><table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;"><tr><td align="center"><a href="${confirmLink}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">Activate My Account</a></td></tr></table><p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">Your 30-day free trial starts as soon as you confirm your email.</p><p style="margin: 20px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">Questions? Reply to this email and we'll help you get started.</p><p style="margin: 30px 0 0; color: #52525b; font-size: 16px; line-height: 1.6;">MenuLove Team</p></td></tr>${footer}</table></td></tr></table></body></html>`;
        break;

      case '24h':
        subject = 'Your video menu could already be live';
        fromName = 'MenuLove Team <noreply@menulove.com.au>';
        emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 40px 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Your Menu Could Be Live 🎬</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #18181b; font-size: 18px; font-weight: 600;">Hello,</h2><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">Your MenuLove account was created 24 hours ago, but it hasn't been activated yet.</p><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">With MenuLove you can create a TikTok-style menu that customers love:</p><ul style="margin: 0 0 30px; padding-left: 20px; color: #52525b; font-size: 16px; line-height: 1.8;"><li>📱 Video-style menu similar to social media feeds</li><li>🎯 QR code menu for easy sharing</li><li>📸 Showcase dishes with photos or short videos</li><li>📊 Simple analytics about menu views</li></ul><p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">It takes less than 5 minutes to confirm your email and publish your first menu items.</p><table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;"><tr><td align="center"><a href="${confirmLink}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">Activate My Account Now</a></td></tr></table><p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">We'd love to see your venue on MenuLove.</p><p style="margin: 30px 0 0; color: #52525b; font-size: 16px; line-height: 1.6;">Helio Woi<br><span style="color: #71717a; font-size: 14px;">MenuLove</span></p></td></tr>${footer}</table></td></tr></table></body></html>`;
        break;

      case '48h':
        subject = 'Do you still want your MenuLove account?';
        fromName = 'MenuLove Team <noreply@menulove.com.au>';
        emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 40px 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">⚠️ Account Pending Confirmation</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #18181b; font-size: 18px; font-weight: 600;">Hi,</h2><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">We noticed your MenuLove account is still waiting for email confirmation.</p><p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">To keep our platform secure, unconfirmed accounts may be removed after some time.</p><p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">If you'd still like to activate your account and create your video menu, please confirm your email below.</p><table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;"><tr><td align="center"><a href="${confirmLink}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">Confirm My Email</a></td></tr></table><p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">Your 30-day free trial is ready to start as soon as you activate.</p><p style="margin: 30px 0 0; color: #52525b; font-size: 16px; line-height: 1.6;">MenuLove Team</p></td></tr>${footer}</table></td></tr></table></body></html>`;
        break;

      case '72h':
        subject = 'Quick question about your MenuLove account';
        fromName = 'Helio Woi <noreply@menulove.com.au>';
        emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 40px 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">👋 Personal Message</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #18181b; font-size: 18px; font-weight: 600;">Hi,</h2><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">I saw that you started creating a MenuLove account but didn't finish the setup.</p><p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">If you'd like, I can personally help you set up your menu in just a few minutes — no charge, no commitment.</p><p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">Just reply to this email and I'll assist you.</p><table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;"><tr><td align="center"><a href="${confirmLink}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">Activate My Account</a></td></tr></table><p style="margin: 30px 0 0; color: #52525b; font-size: 16px; line-height: 1.6;">Helio Woi<br><span style="color: #71717a; font-size: 14px;">Founder - MenuLove</span><br><a href="https://menulove.com.au" style="color: #f97316; text-decoration: none; font-size: 14px;">menulove.com.au</a></p></td></tr>${personalFooter}</table></td></tr></table></body></html>`;
        break;

      default:
        throw new Error('Invalid email type');
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromName,
        to: [partner.email],
        reply_to: replyTo,
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
    console.log(`[Activation Reminder] Email sent successfully to ${partner.email}:`, result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        partner: partner.restaurant_name,
        emailType
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
