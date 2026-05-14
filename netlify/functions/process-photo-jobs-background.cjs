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
  console.log('[process-photo-jobs-background] Worker started');
  console.log('[process-photo-jobs-background] httpMethod:', event.httpMethod || '(scheduled)');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: 'ok' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Prefer the service role key (bypasses RLS). Accept both naming conventions.
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  console.log('[process-photo-jobs-background] Env check — SUPABASE_URL:', !!supabaseUrl, '| SERVICE_KEY:', !!supabaseServiceKey, '| OPENAI_API_KEY:', !!apiKey);

  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    const missing = [!apiKey && 'OPENAI_API_KEY', !supabaseUrl && 'SUPABASE_URL', !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(', ');
    console.error('[process-photo-jobs-background] Missing env vars:', missing);
    return jsonResponse(500, { error: `Missing environment variables: ${missing}` });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    body = {};
  }

  const requestedJobId = body.jobId || null;
  console.log('[process-photo-jobs-background] requestedJobId:', requestedJobId || '(none — picking oldest pending)');
  let claimedJobId = null;

  try {
    // Recover stuck jobs first
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { error: stuckErr } = await supabase
      .from('photo_jobs')
      .update({
        status: 'failed',
        error_message: 'Processing timeout (stuck in processing)',
        completed_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('started_at', tenMinutesAgo);
    if (stuckErr) console.warn('[process-photo-jobs-background] Stuck-job recovery error:', stuckErr.message);

    const { count: pendingCount, error: pendingCountErr } = await supabase
      .from('photo_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (pendingCountErr) {
      console.error('[process-photo-jobs-background] Pending count query error:', pendingCountErr.message);
    }
    console.log('[process-photo-jobs-background] pending jobs found count:', pendingCount ?? 0);

    let job = null;

    if (requestedJobId) {
      const { data, error: qErr } = await supabase
        .from('photo_jobs')
        .select('*')
        .eq('id', requestedJobId)
        .eq('status', 'pending')
        .maybeSingle();
      if (qErr) console.error('[process-photo-jobs-background] Query error (specific job):', qErr.message);
      console.log('[process-photo-jobs-background] Specific job lookup result:', data ? data.id : 'null');
      job = data;
    } else {
      const { data, error: qErr } = await supabase
        .from('photo_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (qErr) console.error('[process-photo-jobs-background] Query error (oldest pending):', qErr.message);
      console.log('[process-photo-jobs-background] Oldest pending job:', data ? data.id : 'none found');
      job = data;
    }

    if (!job) {
      console.log('[process-photo-jobs-background] No pending jobs to process. Exiting.');
      return jsonResponse(200, { processed: false, reason: 'No pending jobs' });
    }

    console.log('[process-photo-jobs-background] Selected job id:', job.id);
    console.log('[process-photo-jobs-background] original_image_url:', job.original_image_url);
    console.log('[process-photo-jobs-background] before updating to processing');

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
      console.log('[process-photo-jobs-background] Job already claimed or claim failed:', claimError?.message);
      return jsonResponse(200, { processed: false, reason: 'Job already claimed' });
    }

    claimedJobId = claimedJob.id;
    console.log('[process-photo-jobs-background] after updating to processing:', claimedJob.id);

    console.log('[process-photo-jobs-background] Job claimed, status now processing:', claimedJob.id);
    console.log('[process-photo-jobs-background] Downloading source image...');

    const sourceImageRes = await fetch(claimedJob.original_image_url);
    if (!sourceImageRes.ok) {
      const msg = `Could not load original image (${sourceImageRes.status})`;
      console.error('[process-photo-jobs-background]', msg);
      await markFailed(supabase, claimedJob.id, msg);
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    const sourceArrayBuffer = await sourceImageRes.arrayBuffer();
    const sourceBuffer = Buffer.from(sourceArrayBuffer);
    console.log('[process-photo-jobs-background] Source image size (bytes):', sourceBuffer.length);

    if (sourceBuffer.length > 8 * 1024 * 1024) {
      const msg = 'Image too large for processing';
      console.error('[process-photo-jobs-background]', msg);
      await markFailed(supabase, claimedJob.id, msg);
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

    // Background functions have up to 15 minutes — use a generous timeout
    const controller = new AbortController();
    const timeoutMs = 180000; // 3 minutes
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log('[process-photo-jobs-background] Calling OpenAI images/edits...');
    console.log('[process-photo-jobs-background] before OpenAI call');
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

    console.log('[process-photo-jobs-background] after OpenAI call');
    console.log('[process-photo-jobs-background] OpenAI response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorPayload = await aiResponse.json().catch(() => ({}));
      const errorMessage = errorPayload?.error?.message || `OpenAI error ${aiResponse.status}`;
      console.error('[process-photo-jobs-background] OpenAI error:', errorMessage);
      await markFailed(supabase, claimedJob.id, errorMessage);
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    const aiData = await aiResponse.json();
    const b64 = aiData?.data?.[0]?.b64_json;
    if (!b64) {
      const msg = 'No image returned from AI';
      console.error('[process-photo-jobs-background]', msg);
      await markFailed(supabase, claimedJob.id, msg);
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    console.log('[process-photo-jobs-background] AI image received, uploading to storage...');
    const outputBuffer = Buffer.from(b64, 'base64');
    const outputPath = `ai-enhanced/${claimedJob.id}.png`;

    const { error: uploadError } = await supabase.storage
      .from('menu-videos')
      .upload(outputPath, outputBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      const msg = `Image upload failed: ${uploadError.message}`;
      console.error('[process-photo-jobs-background]', msg);
      await markFailed(supabase, claimedJob.id, msg);
      return jsonResponse(200, { processed: true, jobId: claimedJob.id, status: 'failed' });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('menu-videos').getPublicUrl(outputPath);

    console.log('[process-photo-jobs-background] Upload complete. Updating job to done. publicUrl:', publicUrl);

    const { error: doneErr } = await supabase
      .from('photo_jobs')
      .update({
        status: 'done',
        enhanced_image_url: publicUrl,
        error_message: null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', claimedJob.id);

    if (doneErr) console.error('[process-photo-jobs-background] Failed to mark job done:', doneErr.message);
    console.log('[process-photo-jobs-background] final status update:', doneErr ? 'done-update-error' : 'done');

    return jsonResponse(200, {
      processed: true,
      jobId: claimedJob.id,
      status: 'done',
      enhancedImageUrl: publicUrl,
    });
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    console.error('[process-photo-jobs-background] Caught error:', error?.message || error);
    if (claimedJobId) {
      await markFailed(
        supabase,
        claimedJobId,
        isTimeout ? 'Worker timed out while processing AI image' : (error?.message || 'Unexpected worker error')
      );
      console.log('[process-photo-jobs-background] final status update: failed');
    }
    return jsonResponse(500, {
      error: isTimeout ? 'Worker timed out while processing AI image' : (error.message || 'Unexpected worker error'),
    });
  }
};
