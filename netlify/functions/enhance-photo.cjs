'use strict';

const MASTER_PROMPT = `You are editing an existing image.

STRICT REQUIREMENT:
- The original image MUST be preserved.
- Do NOT change the subject, products, or composition.
- Do NOT replace items with different food or objects.
- This is NOT a generation task. It is an enhancement task.

TASK:
Enhance the provided image to look like a premium commercial food photograph.

RULES:
- Keep all original items exactly the same (same drinks, same shapes, same layout)
- Do not add or remove objects
- Do not hallucinate new food
- Only improve lighting, contrast, sharpness, and depth

VISUAL IMPROVEMENTS:
- Convert to vertical 9:16 format
- Reframe to better center the subject
- Optimize composition for TikTok/Reels-style full-screen vertical feed
- Keep the main subject fully inside a centered 9:16 safe area to avoid crop loss in app display
- Ensure the dish fills most of the frame (around 70-85% of the image height), avoiding excessive empty space above or below
- Extend background naturally if needed
- Apply soft cinematic lighting
- Add subtle depth of field (background blur)
- Enhance textures and clarity

STYLE:
- Clean, minimal, high-end restaurant photography
- Natural colors (no oversaturation)
- Realistic and authentic

OUTPUT:
The SAME image, professionally enhanced, not replaced.`;

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'OPENAI_API_KEY is not configured in environment variables' }),
    };
  }

  let imageBase64, mimeType;
  try {
    const body = JSON.parse(event.body || '{}');
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType || 'image/jpeg';
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!imageBase64) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'imageBase64 is required' }) };
  }

  try {
    // Strip data-URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([imageBuffer], { type: mimeType });

    const formData = new FormData();
    formData.append('image', blob, 'photo.jpg');
    formData.append('prompt', MASTER_PROMPT);
    formData.append('model', 'gpt-image-1');
    formData.append('n', '1');
    formData.append('size', '1024x1536');
    formData.append('quality', 'low');

    const controller = new AbortController();
    const timeoutMs = 28000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI error ${response.status}`);
    }

    const data = await response.json();
    const b64Image = data.data?.[0]?.b64_json;

    if (!b64Image) {
      throw new Error('No image returned from OpenAI');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ enhancedImage: `data:image/png;base64,${b64Image}` }),
    };
  } catch (error) {
    console.error('[enhance-photo] error:', error);
    const isTimeout = error?.name === 'AbortError';
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: isTimeout
          ? 'AI request timed out. Try again with another photo.'
          : error.message || 'Enhancement failed',
      }),
    };
  }
};
