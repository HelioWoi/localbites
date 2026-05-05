'use strict';

const { createClient } = require('@supabase/supabase-js');

const DEMO_PROMPT = `Transform this image into a premium commercial-style visual for a modern restaurant menu, while preserving the original item exactly as it is.

The uploaded image may show food, drinks, coffee, dessert, packaging, a menu item, or a casual restaurant photo. The image may be low-quality, poorly lit, or taken casually with a phone.

Your task is to improve the visual quality and commercial appeal without changing the actual product.

Core rules:
- Do NOT change the structure, ingredients, shape, size, or identity of the item
- Do NOT create a different version of the product
- Do NOT add new ingredients, props, logos, text, labels, or overlays
- Only enhance lighting, clarity, color balance, depth, and presentation
- Keep the result believable and true to the original image

Size & composition:
- Maintain the original image aspect ratio and dimensions as much as possible
- Do NOT force the image into 9:16
- Do NOT crop, stretch, or reframe aggressively
- Preserve the original composition unless a very subtle adjustment improves balance
- Keep the main subject visually clear and dominant

Lighting & quality:
- Correct poor lighting, exposure, shadows, and color cast
- Apply natural cinematic lighting with soft highlights and realistic shadows
- Improve sharpness and clarity without making the image look artificial
- Add subtle depth of field only if it improves the image naturally

If the subject is food:
- Enhance texture, freshness, layers, sauce, crust, softness, crispness, and natural color
- Make the food look appetizing but realistic

If the subject is a drink, coffee, cocktail, smoothie, or beverage:
- Enhance glass clarity, reflections, transparency, foam, bubbles, ice, condensation, and liquid gradients
- Emphasize light passing naturally through the liquid
- Keep the drink realistic and authentic

Background:
- Reduce visual distractions gently
- Do NOT replace or fully reconstruct the background unless absolutely necessary
- Softly blur or clean the existing scene while preserving realism

Style:
- Premium restaurant menu photography
- Clean, minimal, professional, appetizing
- Natural colors, not oversaturated
- No fake or overly generated look

Output:
A professional, realistic, visually enhanced version of the original image, suitable for a modern restaurant menu, while preserving the original product and image proportions.

Lighting & quality:
- Apply cinematic lighting with a slightly darker, high-end restaurant mood
- Use directional light with soft shadows to create depth and contrast
- Slightly reduce overall brightness while preserving details
- Increase contrast subtly to enhance textures and visual impact
- Avoid flat or evenly lit appearance

Style:
- Premium, high-end restaurant photography
- Slightly dramatic lighting (not overly bright)
- Rich tones and depth
- Warm highlights and controlled shadows
- Avoid washed-out or overly bright results`;

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  const { imageBase64, mimeType = 'image/jpeg', jobId } = JSON.parse(event.body || '{}');

  if (!jobId || !imageBase64) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'jobId and imageBase64 are required' }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Supabase env vars are not configured' }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const saveJob = async (payload) => {
    const { error } = await supabase.storage.from('menu-videos').upload(
      `ai-jobs/${jobId}.json`,
      JSON.stringify(payload),
      { contentType: 'application/json', upsert: true }
    );
    if (error) {
      console.error('[enhance-photo-demo-background] saveJob storage error:', error.message);
      throw new Error(`Storage write failed: ${error.message}`);
    }
  };

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const originalBuffer = Buffer.from(base64Data, 'base64');
  const originalBlob = new Blob([originalBuffer], { type: mimeType });

  const callOpenAI = async (model, quality, prompt) => {
    const formData = new FormData();
    formData.append('image', originalBlob, 'photo.jpg');
    formData.append('prompt', prompt);
    formData.append('model', model);
    formData.append('n', '1');
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

    let usedModel = 'gpt-image-2';
    let b64Image = null;

    try {
      b64Image = await callOpenAI('gpt-image-2', 'medium', DEMO_PROMPT);
    } catch (err) {
      if (err.isAccessError) {
        console.log('[enhance-photo-demo-background] gpt-image-2 access denied, falling back to gpt-image-1');
        usedModel = 'gpt-image-1';
        b64Image = await callOpenAI('gpt-image-1', 'low', DEMO_PROMPT);
      } else {
        throw err;
      }
    }

    if (!b64Image) throw new Error('No image returned from OpenAI');

    let outputBuffer = Buffer.from(b64Image, 'base64');
    let outputContentType = 'image/png';

    const extension = outputContentType.includes('png') ? 'png' : 'jpg';
    const outputPath = `ai-enhanced/${jobId}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('menu-videos').upload(outputPath, outputBuffer, {
      contentType: outputContentType,
      upsert: true,
    });
    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
    const { data: { publicUrl } } = supabase.storage.from('menu-videos').getPublicUrl(outputPath);

    await saveJob({ status: 'done', enhancedImage: publicUrl, modelUsed: usedModel, promptProfile: 'demo-size-preserve-v2' });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'accepted', jobId }),
    };

  } catch (error) {
    console.error('[enhance-photo-demo-background] error:', error.message || error);
    try {
      await saveJob({ status: 'error', error: error.message || 'Enhancement failed' });
    } catch (saveErr) {
      console.error('[enhance-photo-demo-background] saveJob also failed:', saveErr.message);
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ status: 'error', error: error.message || 'Enhancement failed' }),
    };
  }
};
