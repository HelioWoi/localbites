import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ADMIN_EMAILS = ['heliocwoi@gmail.com', 'contact@menulove.com.au']

serve(async (req) => {
  try {
    const { record } = await req.json()
    
    // Partner data from the trigger
    const partnerName = record.restaurant_name || 'Unknown'
    const partnerEmail = record.email || 'No email'
    const createdAt = new Date(record.created_at).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    })

    // Simple email notification
    console.log('🎉 New Partner Signup!')
    console.log(`Restaurant: ${partnerName}`)
    console.log(`Email: ${partnerEmail}`)
    console.log(`Time: ${createdAt}`)
    console.log(`Sending notification to: ${ADMIN_EMAILS.join(', ')}`)

    // For now, just log - Supabase doesn't have built-in email sending
    // You'll need to integrate with Resend or SendGrid for actual emails
    // This function will be called by the database trigger

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification logged',
        partner: partnerName,
        admins: ADMIN_EMAILS
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
