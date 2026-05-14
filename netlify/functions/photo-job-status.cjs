'use strict';

const { createClient } = require('@supabase/supabase-js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
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

  const jobId = event.queryStringParameters?.jobId;
  if (!jobId) {
    return jsonResponse(400, { error: 'jobId is required' });
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

  const { data, error } = await supabase
    .from('photo_jobs')
    .select('id, status, original_image_url, enhanced_image_url, error_message, request_id, credits_used, created_at, started_at, completed_at, updated_at')
    .eq('id', jobId)
    .single();

  if (error) {
    const isNotFound = error.code === 'PGRST116';
    return jsonResponse(isNotFound ? 404 : 400, { error: isNotFound ? 'Job not found' : (error.message || 'Could not fetch photo job') });
  }

  return jsonResponse(200, {
    jobId: data.id,
    status: data.status,
    originalImageUrl: data.original_image_url,
    enhancedImageUrl: data.enhanced_image_url,
    errorMessage: data.error_message,
    requestId: data.request_id,
    creditsUsed: data.credits_used,
    createdAt: data.created_at,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    updatedAt: data.updated_at,
  });
};
