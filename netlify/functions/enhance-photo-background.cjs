'use strict';

const { createClient } = require('@supabase/supabase-js');

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
  const { imageBase64, mimeType = 'image/jpeg', jobId } = JSON.parse(event.body || '{}');

  if (!jobId || !imageBase64) return;

  const apiKey = process.env.OPENAI_API_KEY;
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const saveJob = async (payload) => {
    await supabase.storage.from('menu-videos').upload(
      `ai-jobs/${jobId}.json`,
      JSON.stringify(payload),
      { contentType: 'application/json', upsert: true }
    );
  };

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const originalBuffer = Buffer.from(base64Data, 'base64');
  const originalBlob = new Blob([originalBuffer], { type: mimeType });

  const isSubjectPreserved = async (enhancedB64) => {
    const originalDataUrl = `data:${mimeType};base64,${base64Data}`;
    const enhancedDataUrl = `data:image/png;base64,${enhancedB64}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_output_tokens: 8,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'You compare two food photos. Return only PASS when the enhanced image keeps the exact same main subject/items/layout with no replacement. Return only FAIL if subject/items are replaced or materially changed.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Image A is original. Image B is enhanced result. Has content been preserved?' },
              { type: 'input_image', image_url: originalDataUrl },
              { type: 'input_image', image_url: enhancedDataUrl },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Verification error ${response.status}`);
    }

    const data = await response.json();
    const outputText = typeof data.output_text === 'string' ? data.output_text : '';
    if (/\bPASS\b/i.test(outputText) && !/\bFAIL\b/i.test(outputText)) return true;
    if (/\bFAIL\b/i.test(outputText)) return false;
    return false;
  };

  const callOpenAI = async (model, size, quality) => {
    const formData = new FormData();
    formData.append('image', originalBlob, 'photo.jpg');
    formData.append('prompt', MASTER_PROMPT);
    formData.append('model', model);
    formData.append('n', '1');
    formData.append('size', size);
    formData.append('quality', quality);
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || `OpenAI error ${response.status}`;
      const isAccessError = msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('permission') || response.status === 403;
      throw Object.assign(new Error(msg), { isAccessError });
    }
    const data = await response.json();
    return data.data?.[0]?.b64_json || null;
  };

  try {
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    let b64Image = null;
    try {
      b64Image = await callOpenAI('gpt-image-2', '1024x1536', 'medium');
    } catch (err) {
      if (err.isAccessError) {
        console.log('[enhance-photo-background] gpt-image-2 access denied, falling back to gpt-image-1');
        b64Image = await callOpenAI('gpt-image-1', '1024x1536', 'low');
      } else {
        throw err;
      }
    }

    if (!b64Image) throw new Error('No image returned from OpenAI');

    let outputBuffer = Buffer.from(b64Image, 'base64');
    let outputContentType = 'image/png';
    let discardedReplacement = false;

    try {
      const preserved = await isSubjectPreserved(b64Image);
      if (!preserved) {
        discardedReplacement = true;
        outputBuffer = originalBuffer;
        outputContentType = mimeType;
      }
    } catch (verifyError) {
      // Verification API error — trust the strict prompt and use the enhanced image
      console.warn('[enhance-photo-background] verification skipped (API error):', verifyError.message || verifyError);
    }

    const extension = outputContentType.includes('png') ? 'png' : 'jpg';
    const outputPath = `ai-enhanced/${jobId}.${extension}`;
    await supabase.storage.from('menu-videos').upload(outputPath, outputBuffer, {
      contentType: outputContentType,
      upsert: true,
    });
    const { data: { publicUrl } } = supabase.storage.from('menu-videos').getPublicUrl(outputPath);

    await saveJob({ status: 'done', enhancedImage: publicUrl, discardedReplacement });

  } catch (error) {
    console.error('[enhance-photo-background] error:', error);
    await saveJob({ status: 'error', error: error.message || 'Enhancement failed' });
  }
};
