'use strict';

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  const jobId = event.queryStringParameters?.jobId;

  if (!jobId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'jobId is required' }) };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.storage
      .from('menu-videos')
      .download(`ai-jobs/${jobId}.json`);

    if (error || !data) {
      return { statusCode: 200, headers, body: JSON.stringify({ status: 'pending' }) };
    }

    const text = await data.text();
    return { statusCode: 200, headers, body: text };
  } catch (error) {
    console.error('[enhance-photo-status] error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ status: 'error', error: error.message }),
    };
  }
};
