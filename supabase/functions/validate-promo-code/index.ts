import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Promo code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Normalize code (uppercase, trim)
    const normalizedCode = code.trim().toUpperCase()

    // Check if promo code exists and is valid
    const { data: promoCode, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single()

    if (promoError || !promoCode) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid or expired promo code' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if code is within valid date range
    const now = new Date()
    if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Promo code is not yet active' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Promo code has expired' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if max uses reached
    if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Promo code has reached maximum uses' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Code is valid
    return new Response(
      JSON.stringify({ 
        valid: true,
        type: promoCode.type,
        description: promoCode.description,
        discount_amount: promoCode.discount_amount,
        discount_percent: promoCode.discount_percent
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error validating promo code:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
