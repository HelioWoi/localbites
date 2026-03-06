import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const ADMIN_EMAILS = ['heliocwoi@gmail.com', 'contact@menulove.com.au']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record } = await req.json()
    
    // Partner data from the trigger
    const partnerName = record.restaurant_name || 'Unknown'
    const partnerEmail = record.email || 'No email'
    const partnerPhone = record.phone || 'Not provided'
    const partnerAddress = record.address || 'Not provided'
    const createdAt = new Date(record.created_at).toLocaleString('en-AU', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Australia/Sydney'
    })

    console.log('🎉 New Partner Signup!')
    console.log(`Restaurant: ${partnerName}`)
    console.log(`Email: ${partnerEmail}`)
    console.log(`Time: ${createdAt}`)

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Partner Signup - MenuLove</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🎉 New Partner Signup!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 18px; font-weight: 600;">Partner Details</h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <strong style="color: #52525b; font-size: 14px;">Restaurant Name:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                    <span style="color: #18181b; font-size: 14px; font-weight: 600;">${partnerName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <strong style="color: #52525b; font-size: 14px;">Email:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                    <a href="mailto:${partnerEmail}" style="color: #f97316; font-size: 14px; text-decoration: none;">${partnerEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <strong style="color: #52525b; font-size: 14px;">Phone:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                    <span style="color: #18181b; font-size: 14px;">${partnerPhone}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                    <strong style="color: #52525b; font-size: 14px;">Address:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                    <span style="color: #18181b; font-size: 14px;">${partnerAddress}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <strong style="color: #52525b; font-size: 14px;">Signup Time:</strong>
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <span style="color: #18181b; font-size: 14px;">${createdAt}</span>
                  </td>
                </tr>
              </table>

              <!-- Quick Actions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://menulove.com.au/admin" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);">
                      View in Admin Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                This is an automated notification from MenuLove Partner System
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

    // Send email via Resend to admin emails
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MenuLove Partner System <noreply@menulove.com.au>',
        to: ADMIN_EMAILS,
        subject: `🎉 New Partner Signup: ${partnerName}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await resendResponse.json();
    console.log('Partner notification email sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent',
        partner: partnerName,
        admins: ADMIN_EMAILS,
        messageId: result.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
