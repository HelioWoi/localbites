import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    // Get user's IP from request headers
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || '1.1.1.1'

    // Use ipapi.co (free, no API key needed, 1000 requests/day)
    const response = await fetch(`https://ipapi.co/${ip}/json/`)
    const data = await response.json()

    if (data.error) {
      throw new Error(data.reason || 'IP lookup failed')
    }

    // Return city, region, country and coordinates
    return new Response(
      JSON.stringify({
        city: data.city,
        region: data.region,
        country: data.country_name,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    console.error('IP geolocation error:', error)
    
    // Fallback to Sunshine Coast if IP detection fails
    return new Response(
      JSON.stringify({
        city: 'Mooloolaba',
        region: 'Queensland',
        country: 'Australia',
        latitude: -26.6811,
        longitude: 153.1214,
        timezone: 'Australia/Brisbane',
        fallback: true
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})
