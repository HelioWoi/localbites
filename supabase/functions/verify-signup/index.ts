import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RECAPTCHA_SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting constants
const MAX_ATTEMPTS_PER_IP_PER_HOUR = 3;
const MAX_ATTEMPTS_PER_EMAIL_PER_DAY = 10;
const MIN_RECAPTCHA_SCORE = 0.5;
const MIN_FORM_FILL_TIME_MS = 3000; // 3 seconds minimum

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      recaptchaToken, 
      honeypot, 
      formStartTime,
      ipAddress,
      userAgent 
    } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[Verify Signup] Checking signup for ${email}`);

    // 1. HONEYPOT CHECK - If honeypot field is filled, it's a bot
    if (honeypot && honeypot.trim() !== '') {
      console.log(`[Verify Signup] ❌ Honeypot triggered for ${email}`);
      
      await supabase.from('signup_attempts').insert({
        ip_address: ipAddress,
        email,
        user_agent: userAgent,
        success: false,
        blocked_reason: 'honeypot',
      });

      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'Security check failed. Please try again later.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. FORM FILL TIME CHECK - Too fast = bot
    if (formStartTime) {
      const fillTime = Date.now() - formStartTime;
      if (fillTime < MIN_FORM_FILL_TIME_MS) {
        console.log(`[Verify Signup] ❌ Form filled too fast (${fillTime}ms) for ${email}`);
        
        await supabase.from('signup_attempts').insert({
          ip_address: ipAddress,
          email,
          user_agent: userAgent,
          success: false,
          blocked_reason: 'too_fast',
        });

        return new Response(
          JSON.stringify({ 
            allowed: false, 
            reason: 'Please take your time filling out the form.' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. RECAPTCHA VERIFICATION
    let recaptchaScore = 0;
    if (recaptchaToken) {
      const recaptchaResponse = await fetch(
        `https://www.google.com/recaptcha/api/siteverify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
        }
      );

      const recaptchaData = await recaptchaResponse.json();
      recaptchaScore = recaptchaData.score || 0;

      console.log(`[Verify Signup] reCAPTCHA score for ${email}: ${recaptchaScore}`);

      if (recaptchaScore < MIN_RECAPTCHA_SCORE) {
        console.log(`[Verify Signup] ❌ Low reCAPTCHA score (${recaptchaScore}) for ${email}`);
        
        await supabase.from('signup_attempts').insert({
          ip_address: ipAddress,
          email,
          user_agent: userAgent,
          success: false,
          blocked_reason: 'low_recaptcha',
          recaptcha_score: recaptchaScore,
        });

        return new Response(
          JSON.stringify({ 
            allowed: false, 
            reason: 'Security verification failed. Please try again or contact support.' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. TEMPORARY EMAIL CHECK
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (emailDomain) {
      const { data: tempDomain } = await supabase
        .from('temp_email_domains')
        .select('domain')
        .eq('domain', emailDomain)
        .single();

      if (tempDomain) {
        console.log(`[Verify Signup] ❌ Temporary email domain (${emailDomain}) for ${email}`);
        
        await supabase.from('signup_attempts').insert({
          ip_address: ipAddress,
          email,
          user_agent: userAgent,
          success: false,
          blocked_reason: 'temp_email',
          recaptcha_score: recaptchaScore,
        });

        return new Response(
          JSON.stringify({ 
            allowed: false, 
            reason: 'Please use a valid business email address. Temporary emails are not allowed.' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. RATE LIMITING - IP based
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentIPAttempts, error: ipError } = await supabase
      .from('signup_attempts')
      .select('id')
      .eq('ip_address', ipAddress)
      .gte('created_at', oneHourAgo);

    if (ipError) {
      console.error('[Verify Signup] Error checking IP attempts:', ipError);
    }

    if (recentIPAttempts && recentIPAttempts.length >= MAX_ATTEMPTS_PER_IP_PER_HOUR) {
      console.log(`[Verify Signup] ❌ Rate limit exceeded for IP ${ipAddress}`);
      
      await supabase.from('signup_attempts').insert({
        ip_address: ipAddress,
        email,
        user_agent: userAgent,
        success: false,
        blocked_reason: 'rate_limit_ip',
        recaptcha_score: recaptchaScore,
      });

      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'Too many signup attempts. Please try again in 1 hour.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. RATE LIMITING - Email based
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentEmailAttempts, error: emailError } = await supabase
      .from('signup_attempts')
      .select('id')
      .eq('email', email)
      .gte('created_at', oneDayAgo);

    if (emailError) {
      console.error('[Verify Signup] Error checking email attempts:', emailError);
    }

    if (recentEmailAttempts && recentEmailAttempts.length >= MAX_ATTEMPTS_PER_EMAIL_PER_DAY) {
      console.log(`[Verify Signup] ❌ Rate limit exceeded for email ${email}`);
      
      await supabase.from('signup_attempts').insert({
        ip_address: ipAddress,
        email,
        user_agent: userAgent,
        success: false,
        blocked_reason: 'rate_limit_email',
        recaptcha_score: recaptchaScore,
      });

      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'Too many signup attempts with this email. Please try again tomorrow.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. ALL CHECKS PASSED - Log successful verification
    console.log(`[Verify Signup] ✅ All checks passed for ${email}`);
    
    await supabase.from('signup_attempts').insert({
      ip_address: ipAddress,
      email,
      user_agent: userAgent,
      success: true,
      recaptcha_score: recaptchaScore,
    });

    return new Response(
      JSON.stringify({ 
        allowed: true,
        recaptchaScore,
        message: 'Verification successful'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Verify Signup] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
