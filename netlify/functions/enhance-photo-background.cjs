'use strict';

const { createClient } = require('@supabase/supabase-js');

const PARTNER_VERTICAL_PROMPT = `Transform this image into a premium commercial-style visual for a modern restaurant video menu feed (vertical 9:16), while preserving the original item exactly as it is.

The uploaded image may show food, drinks, coffee, dessert, packaging, a menu item, or a casual restaurant photo. The image may be low-quality, poorly lit, or taken casually with a phone.

Your task is to enhance the image and adapt it to a vertical 9:16 format suitable for a mobile scrolling experience, without altering the actual product.

Core rules:
- Do NOT change the structure, ingredients, shape, size, or identity of the item
- Do NOT create a different version of the product
- Do NOT add new ingredients, props, logos, text, labels, or overlays
- Only enhance lighting, clarity, color balance, depth, and presentation
- Keep the result believable and true to the original item

Framing & composition (VERTICAL FEED MODE):
- Convert the image into vertical 9:16 format
- Reframe the composition to center the subject naturally
- The main item must fill approximately 70–85% of the frame
- If needed, extend the background naturally to fit the vertical format
- Do NOT distort or stretch the subject
- Maintain natural proportions at all times
- Avoid cutting important parts of the item

Lighting & quality:
- Correct poor lighting, exposure, shadows, and color cast
- Apply cinematic lighting with a slightly darker, high-end restaurant mood
- Use directional light with soft shadows to create depth and contrast
- Slightly reduce overall brightness while preserving details
- Increase contrast subtly to enhance textures and visual impact
- Avoid flat or evenly lit appearance
- Improve sharpness and clarity without making the image look artificial
- Add subtle depth of field for separation when appropriate

If the subject is food:
- Enhance texture, freshness, layers, sauce, crust, softness, crispness, and natural color
- Emphasize depth and structure of ingredients
- Make the food look appetizing but realistic

If the subject is a drink, coffee, cocktail, smoothie, or beverage:
- Enhance glass clarity, reflections, transparency, foam, bubbles, ice, condensation, and liquid gradients
- Emphasize light passing naturally through the liquid
- Keep the drink realistic and authentic

Background:
- Simplify and clean distractions
- If extending background, keep it natural, minimal, and slightly blurred
- Maintain a premium restaurant atmosphere
- Do NOT create artificial or unrealistic environments

Camera & depth:
- Simulate a professional food photography angle
- Improve foreground, midground, and background separation subtly
- Maintain realistic perspective

Style:
- Premium, high-end restaurant photography
- Vertical TikTok-style visual composition
- Slightly dramatic lighting (not overly bright)
- Rich tones, depth, and contrast
- Warm highlights and controlled shadows
- Clean, minimal, professional, appetizing
- Avoid washed-out or overly bright results

Output:
A high-quality vertical 9:16 image optimized for a mobile video-style menu feed, visually immersive and premium, while preserving the original product integrity.`;

const FOOD_PROMPT = PARTNER_VERTICAL_PROMPT;

const DRINK_PROMPT = PARTNER_VERTICAL_PROMPT;

const CLASSIFIER_PROMPT = `Classify the uploaded menu photo.

Rules:
- Return only one token: DRINK or FOOD.
- Return DRINK when the main subject is any beverage (coffee, tea, juice, soda, cocktail, beer, wine, smoothie, milkshake, etc.).
- Return FOOD for everything else.
- Do not output explanations.`;

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
  const originalDataUrl = `data:${mimeType};base64,${base64Data}`;

  const detectImageType = async () => {
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
            content: [{ type: 'input_text', text: CLASSIFIER_PROMPT }],
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Classify this uploaded menu image.' },
              { type: 'input_image', image_url: originalDataUrl },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Classifier error ${response.status}`);
    }

    const data = await response.json();
    const outputText = String(data.output_text || '').toUpperCase();
    return outputText.includes('DRINK') ? 'drink' : 'food';
  };

  const callOpenAI = async (model, size, quality, prompt) => {
    const formData = new FormData();
    formData.append('image', originalBlob, 'photo.jpg');
    formData.append('prompt', prompt);
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

    let imageType = 'food';
    try {
      imageType = await detectImageType();
    } catch (classifyError) {
      console.warn('[enhance-photo-background] classifier failed, defaulting to food prompt:', classifyError.message || classifyError);
    }
    const selectedPrompt = imageType === 'drink' ? DRINK_PROMPT : FOOD_PROMPT;

    let usedModel = 'gpt-image-2';
    let b64Image = null;
    try {
      b64Image = await callOpenAI('gpt-image-2', '1024x1536', 'medium', selectedPrompt);
    } catch (err) {
      if (err.isAccessError) {
        console.log('[enhance-photo-background] gpt-image-2 access denied, falling back to gpt-image-1');
        usedModel = 'gpt-image-1';
        b64Image = await callOpenAI('gpt-image-1', '1024x1536', 'low', selectedPrompt);
      } else {
        throw err;
      }
    }

    if (!b64Image) throw new Error('No image returned from OpenAI');

    let outputBuffer = Buffer.from(b64Image, 'base64');
    let outputContentType = 'image/png';

    const extension = outputContentType.includes('png') ? 'png' : 'jpg';
    const outputPath = `ai-enhanced/${jobId}.${extension}`;
    await supabase.storage.from('menu-videos').upload(outputPath, outputBuffer, {
      contentType: outputContentType,
      upsert: true,
    });
    const { data: { publicUrl } } = supabase.storage.from('menu-videos').getPublicUrl(outputPath);

    await saveJob({ status: 'done', enhancedImage: publicUrl, modelUsed: usedModel, detectedType: imageType });

  } catch (error) {
    console.error('[enhance-photo-background] error:', error);
    await saveJob({ status: 'error', error: error.message || 'Enhancement failed' });
  }
};
