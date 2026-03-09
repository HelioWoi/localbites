import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, invitedBy } = await req.json()

    if (!email) {
      throw new Error('Email is required')
    }

    // Create Supabase client
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate unique token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Store invitation token
    const { error: dbError } = await supabase
      .from('team_invitations')
      .insert({
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: invitedBy,
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to create invitation')
    }

    // Setup URL
    const setupUrl = `${req.headers.get('origin') || 'https://menulove.com.au'}/admin/setup?token=${token}`

    // Send email via Resend
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Panel Invitation - MenuLove</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎉 You're Invited!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello!
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                You've been added as an administrator to the <strong>MenuLove Admin Panel</strong>.
              </p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>📧 Your login email:</strong><br>
                  <span style="font-family: monospace; font-size: 15px;">${email}</span>
                </p>
              </div>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>To get started:</strong>
              </p>
              
              <ol style="margin: 0 0 30px; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.8;">
                <li>Click the button below to create your password</li>
                <li>Set up your secure password</li>
                <li>Log in to the admin panel</li>
              </ol>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                      Create Password & Access Panel
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>⏰ This invitation expires in 7 days.</strong><br>
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #f97316; font-size: 18px; font-weight: 700;">
                MenuLove
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                Video Menus & Smart Ordering
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer Text -->
        <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} MenuLove. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    const emailText = `
You're Invited to MenuLove Admin Panel!

Hello!

You've been added as an administrator to the MenuLove Admin Panel.

Your login email: ${email}

To get started:
1. Click the link below to create your password
2. Set up your secure password
3. Log in to the admin panel

${setupUrl}

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

---
MenuLove - Video Menus & Smart Ordering
    `

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MenuLove <noreply@menulove.com.au>',
        to: [email],
        subject: 'You\'re invited to MenuLove Admin Panel',
        html: emailHtml,
        text: emailText,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData)
      throw new Error('Failed to send email')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        emailId: resendData.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
