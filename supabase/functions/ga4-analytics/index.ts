// GA4 Analytics Edge Function
// Fetches real-time and historical data from Google Analytics 4
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock data structure for safe fallback
const getMockData = () => ({
  activeUsers: 1,
  totalUsers7d: 42,
  totalUsers30d: 156,
  pageViews7d: 234,
  topPages: [
    { page: '/', views: 89 },
    { page: '/partner', views: 45 },
    { page: '/admin', views: 23 },
  ],
  deviceBreakdown: [
    { device: 'mobile', percentage: 65 },
    { device: 'desktop', percentage: 30 },
    { device: 'tablet', percentage: 5 },
  ],
  trafficSources: [
    { source: 'direct', users: 78 },
    { source: 'google', users: 45 },
    { source: 'social', users: 33 },
  ],
});

// Convert PEM private key to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate OAuth2 access token using service account
async function getAccessToken(serviceAccount: any): Promise<string> {
  // Import private key
  const privateKeyBuffer = pemToArrayBuffer(serviceAccount.private_key);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Create JWT
  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600), // 1 hour
      iat: getNumericDate(0),
    },
    privateKey
  );

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`OAuth2 token error: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Fetch GA4 data using Data API
async function fetchGA4Data(propertyId: string, accessToken: string) {
  // Fetch real-time active users (last 30 minutes)
  const responseRealtime = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics: [{ name: 'activeUsers' }],
      }),
    }
  );

  let activeUsersNow = 0;
  if (responseRealtime.ok) {
    const realtimeData = await responseRealtime.json();
    activeUsersNow = parseInt(realtimeData.rows?.[0]?.metricValues?.[0]?.value || '0');
  }

  // Fetch 7-day metrics
  const response7d = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
        ],
      }),
    }
  );

  if (!response7d.ok) {
    const error = await response7d.text();
    throw new Error(`GA4 API error: ${error}`);
  }

  const data7d = await response7d.json();

  // Fetch 30-day metrics
  const response30d = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }],
      }),
    }
  );

  const data30d = await response30d.json();

  // Fetch traffic sources (7 days)
  const responseTraffic = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      }),
    }
  );

  const trafficData = await responseTraffic.json();

  // Fetch top pages (7 days)
  const responsePages = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
    }
  );

  const pagesData = await responsePages.json();

  // Fetch device breakdown (7 days)
  const responseDevices = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      }),
    }
  );

  const devicesData = await responseDevices.json();

  // Parse results
  const users7d = parseInt(data7d.rows?.[0]?.metricValues?.[0]?.value || '0');
  const pageViews7d = parseInt(data7d.rows?.[0]?.metricValues?.[1]?.value || '0');
  const users30d = parseInt(data30d.rows?.[0]?.metricValues?.[0]?.value || '0');

  // Parse traffic sources
  const trafficSources = (trafficData.rows || []).map((row: any) => {
    const source = row.dimensionValues[0]?.value || 'unknown';
    const medium = row.dimensionValues[1]?.value || 'unknown';
    const users = parseInt(row.metricValues[0]?.value || '0');
    
    // Map to friendly names
    let displayName = source;
    if (source === '(direct)') displayName = 'Direct';
    else if (source.includes('google')) displayName = 'Google';
    else if (source.includes('facebook') || source.includes('fb')) displayName = 'Facebook';
    else if (source.includes('instagram') || source.includes('ig')) displayName = 'Instagram';
    else if (source.includes('linkedin')) displayName = 'LinkedIn';
    else if (source.includes('twitter') || source.includes('x.com')) displayName = 'Twitter/X';
    else if (medium === 'referral') displayName = `${source} (referral)`;
    
    return { source: displayName, users };
  });

  // Parse top pages
  const topPages = (pagesData.rows || []).map((row: any) => ({
    page: row.dimensionValues[0]?.value || '/',
    title: row.dimensionValues[1]?.value || 'Unknown',
    views: parseInt(row.metricValues[0]?.value || '0'),
  }));

  // Parse device breakdown
  const totalDeviceUsers = (devicesData.rows || []).reduce((sum: number, row: any) => 
    sum + parseInt(row.metricValues[0]?.value || '0'), 0
  );
  
  const deviceBreakdown = (devicesData.rows || []).map((row: any) => {
    const device = row.dimensionValues[0]?.value || 'unknown';
    const users = parseInt(row.metricValues[0]?.value || '0');
    const percentage = totalDeviceUsers > 0 ? Math.round((users / totalDeviceUsers) * 100) : 0;
    
    return { 
      device: device.charAt(0).toUpperCase() + device.slice(1), 
      percentage,
      users 
    };
  });

  return {
    activeUsers: activeUsersNow,
    totalUsers7d: users7d,
    totalUsers30d: users30d,
    pageViews7d: pageViews7d,
    topPages,
    deviceBreakdown,
    trafficSources,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[GA4 Analytics] Request received');

    // Get GA4 credentials from environment
    const GA4_PROPERTY_ID = Deno.env.get('GA4_PROPERTY_ID');
    const GA4_SERVICE_ACCOUNT = Deno.env.get('GA4_SERVICE_ACCOUNT');

    // If credentials not configured, return mock data
    if (!GA4_PROPERTY_ID || !GA4_SERVICE_ACCOUNT) {
      console.log('[GA4 Analytics] Credentials not configured');
      return new Response(
        JSON.stringify({
          success: true,
          data: getMockData(),
          message: 'Mock data - Configure GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT in Supabase secrets',
          isMock: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse service account
    const serviceAccount = JSON.parse(GA4_SERVICE_ACCOUNT);
    console.log('[GA4 Analytics] Service account loaded');

    // Get OAuth2 access token
    const accessToken = await getAccessToken(serviceAccount);
    console.log('[GA4 Analytics] Access token obtained');

    // Fetch real GA4 data
    const data = await fetchGA4Data(GA4_PROPERTY_ID, accessToken);
    console.log('[GA4 Analytics] Data fetched successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data,
        message: 'Live data from Google Analytics 4',
        isMock: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[GA4 Analytics] Error:', error);

    // Return mock data on error
    return new Response(
      JSON.stringify({
        success: true,
        data: getMockData(),
        error: error.message,
        message: `Mock data - Error: ${error.message}`,
        isMock: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
