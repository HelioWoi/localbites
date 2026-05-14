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

const AI_PROMPT = `Transform this menu photo into a premium commercial-style restaurant visual while preserving the original product exactly as it is.

Rules:
- Do NOT change the structure, ingredients, shape, or identity of the item
- Do NOT add logos, labels, text overlays, or new objects
- Improve lighting, color balance, clarity, and overall presentation
- Keep the final result realistic and true to the original product
- Keep composition natural for menu usage`;

const markFailed = async (supabase, jobId, message) => {
  await supabase
    .from('photo_jobs')
    .update({
      status: 'failed',
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: 'ok' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(500, { error: 'Required environment variables are not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const requestedJobId = body.jobId || null;

  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase
      .from('photo_jobs')
      .update({
        status: 'failed',
        error_message: 'Processing timeout',
        completed_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('started_at', tenMinutesAgo);

    let job = null;

    if (requestedJobId) {
      const { data } = await supabase
        .from('photo_jobs')
        .select('*')
        .eq('id', requestedJobId)
        .in('status', ['pending', 'failed'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      job = data;
    } else {
      const { data } = await supabase
        .from('photo_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      job = data;
    }

    if (!job) {
      return jsonResponse(200, { processed: false, reason: 'No pending jobs' });
    }

    const { data: claimedJob, error: claimError } = await supabase
      .from('photo_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', job.id)
      .eq('status', job.status)
      .select('*')
      .maybeSingle();

    if (claimError || !claimedJob) {
      return jsonResponse(200, { processed: false, reason: 'Job already claimed' });
    }

    const sourceImageRes = await fetch(claimedJob.original_image_url);
    if (!sourceImageRes.ok) {
      await markFailed(supabase, claimedJob.id, `Could not load original image (${sourceImageRes.status})`);
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    const sourceArrayBuffer = await sourceImageRes.arrayBuffer();
    const sourceBuffer = Buffer.from(sourceArrayBuffer);
    if (sourceBuffer.length > 8 * 1024 * 1024) {
      await markFailed(supabase, claimedJob.id, 'Image too large for processing');
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    const sourceBlob = new Blob([sourceBuffer], { type: sourceImageRes.headers.get('content-type') || 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', sourceBlob, 'photo.jpg');
    formData.append('prompt', AI_PROMPT);
    formData.append('model', 'gpt-image-1');
    formData.append('n', '1');
    formData.append('size', '1024x1536');
    formData.append('quality', 'low');

    const controller = new AbortController();
    const timeoutMs = 24000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let aiResponse;
    try {
      aiResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!aiResponse.ok) {
      const errorPayload = await aiResponse.json().catch(() => ({}));
      const errorMessage = errorPayload?.error?.message || `OpenAI error ${aiResponse.status}`;
      await markFailed(supabase, claimedJob.id, errorMessage);
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    const aiData = await aiResponse.json();
    const b64 = aiData?.data?.[0]?.b64_json;
    if (!b64) {
      await markFailed(supabase, claimedJob.id, 'No image returned from AI');
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    const outputBuffer = Buffer.from(b64, 'base64');
    const outputPath = `ai-enhanced/${claimedJob.id}.png`;

    const { error: uploadError } = await supabase.storage
      .from('menu-videos')
      .upload(outputPath, outputBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      await markFailed(supabase, claimedJob.id, `Image upload failed: ${uploadError.message}`);
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('menu-videos').getPublicUrl(outputPath);

    await supabase
      .from('photo_jobs')
      .update({
        status: 'done',
        enhanced_image_url: publicUrl,
        error_message: null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', claimedJob.id);

    return jsonResponse(200, {
      processed: true,
      jobId: claimedJob.id,
      status: 'done',
      enhancedImageUrl: publicUrl,
    });
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    return jsonResponse(500, {
      error: isTimeout ? 'Worker timed out while processing AI image' : (error.message || 'Unexpected worker error'),
    });
  }
};
