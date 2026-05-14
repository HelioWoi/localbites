'use strict';

const { createClient } = require('@supabase/supabase-js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const getAuthHeader = (headers = {}) => headers.authorization || headers.Authorization || '';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: 'ok' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: 'Supabase env vars are not configured' });
  }

  const authHeader = getAuthHeader(event.headers);
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing Authorization header' });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const originalImageUrl = parsedBody.originalImageUrl || parsedBody.original_image_url;
  const restaurantId = parsedBody.restaurantId || parsedBody.restaurant_id || null;
  const itemId = parsedBody.itemId || parsedBody.item_id || null;
  const creditsUsedRaw = parsedBody.creditsUsed ?? parsedBody.credits_used;
  const creditsUsed = Number.isInteger(creditsUsedRaw) && creditsUsedRaw > 0 ? creditsUsedRaw : 1;

  if (!originalImageUrl || typeof originalImageUrl !== 'string') {
    return jsonResponse(400, { error: 'originalImageUrl is required' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const requestId = event.headers?.['x-nf-request-id'] || event.headers?.['x-request-id'] || null;

  const { data, error } = await supabase
    .from('photo_jobs')
    .insert({
      user_id: userData.user.id,
      restaurant_id: restaurantId,
      item_id: itemId,
      original_image_url: originalImageUrl,
      status: 'pending',
      request_id: requestId,
      credits_used: creditsUsed,
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    return jsonResponse(400, { error: error.message || 'Could not create photo job' });
  }

  return jsonResponse(200, {
    jobId: data.id,
    status: data.status,
    createdAt: data.created_at,
  });
};
