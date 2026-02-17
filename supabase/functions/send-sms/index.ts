import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  to: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Received SMS request');
    const { to, message }: SMSRequest = await req.json();
    console.log('To:', to);
    console.log('Message:', message);

    if (!to || !message) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking Twilio credentials...');
    console.log('TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
    console.log('TWILIO_AUTH_TOKEN:', TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
    console.log('TWILIO_PHONE_NUMBER:', TWILIO_PHONE_NUMBER ? 'SET' : 'NOT SET');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Twilio credentials not configured',
          details: {
            accountSid: !!TWILIO_ACCOUNT_SID,
            authToken: !!TWILIO_AUTH_TOKEN,
            phoneNumber: !!TWILIO_PHONE_NUMBER
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const body = new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS sent successfully:', data.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: data.sid,
        status: data.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending SMS:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
