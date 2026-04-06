import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

      console.log(`[Check Unconfirmed Accounts] Checking ${partner.email} - ${minutesSinceCreation} minutes since creation`);

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

      console.log(`[Check Unconfirmed Accounts] ${partner.email} should receive ${emailType} email`);

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

      // Send activation reminder email via Resend API directly
      console.log(`[Check Unconfirmed Accounts] Sending ${emailType} email to ${partner.email}`);

      const confirmLink = `https://menulove.com.au/partner?confirm=${partner.id}`;
      const unsubscribeLink = `https://menulove.com.au/unsubscribe?id=${partner.id}`;

      let subject = '';
      let fromName = 'MenuLove Team <noreply@menulove.com.au>';
      let emailHtml = '';

      // Build email based on type
      if (emailType === '10min') {
        subject = 'Please confirm your email to activate your MenuLove dashboard';
        emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 30px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Welcome to MenuLove! 🎉</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #18181b; font-size: 18px; font-weight: 600;">Hi,</h2><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">We noticed you just created your MenuLove account but haven't confirmed your email yet.</p><p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">Confirming your email takes just one click and unlocks your dashboard where you can:</p><ul style="margin: 0 0 30px; padding-left: 20px; color: #52525b; font-size: 16px; line-height: 1.8;"><li>Upload photos and videos of your dishes</li><li>Generate your custom QR code</li><li>Share your video menu with customers</li><li>Track views and engagement</li></ul><table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;"><tr><td align="center"><a href="${confirmLink}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">Confirm My Email</a></td></tr></table><p style="margin: 0 0 20px; color: #52525b; font-size: 14px; line-height: 1.6;">Once confirmed, you'll have 14 days of free trial to explore all features.</p><p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">Need help? Just reply to this email.</p><p style="margin: 20px 0 0; color: #18181b; font-size: 14px; line-height: 1.6;">Helio Woi<br><span style="color: #71717a;">MenuLove Team</span></p></td></tr><tr><td style="background-color: #fafafa; padding: 20px 40px; text-align: center; border-top: 1px solid #e4e4e7;"><p style="margin: 0 0 10px; color: #a1a1aa; font-size: 12px;">This is an automated message from MenuLove</p><p style="margin: 0; color: #a1a1aa; font-size: 11px;">Don't want to receive these emails? <a href="${unsubscribeLink}" style="color: #f97316; text-decoration: none;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`;
      } else {
        continue;
      }

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromName,
          to: [partner.email],
          reply_to: 'contact@menulove.com.au',
          subject: subject,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errText = await emailResponse.text();
        console.error(`[Check Unconfirmed Accounts] Resend failed for ${partner.email}: ${emailResponse.status} ${errText}`);
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
        console.error(`[Check Unconfirmed Accounts] DB insert failed for ${partner.email}:`, insertError);
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
