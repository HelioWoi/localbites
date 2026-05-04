'use strict';

const { createClient } = require('@supabase/supabase-js');

const FOOD_PROMPT = `Transform this image into a premium commercial-style visual for a modern restaurant menu, while preserving the original item exactly as it is.

The input image may be low-quality, poorly lit, or taken casually with a phone. Your task is to elevate it to a professional level without altering the actual product.

Core rules:
- Do NOT change the structure, ingredients, or shape of the item
- Do NOT create a different version of the product
- Only enhance presentation, lighting, and composition

Framing & composition:
- Convert to vertical 9:16 format
- Reframe the subject to be centered and visually dominant
- Adjust perspective if needed to create a natural, professional angle
- Ensure the item fills 70-85% of the frame
- Remove or soften distracting elements in the background
- Extend or recreate background naturally if necessary

Lighting correction:
- Fix poor lighting conditions (overexposed, underexposed, color cast)
- Apply soft cinematic lighting with natural highlights and shadows
- Simulate professional food photography lighting direction

Depth & focus:
- Add shallow depth of field (background blur)
- Keep the main subject sharp and detailed
- Create separation between subject and background

Enhancement by type:
- Enhance texture (crispy, juicy, fresh, soft layers)
- Improve color balance to look natural and appetizing

Style:
- Clean, minimal, premium restaurant aesthetic
- Natural look (avoid over-editing or artificial effects)
- High-end commercial food photography style

Constraints:
- No text, logos, or overlays
- No fake ingredients or unrealistic changes
- No oversaturation
- Keep everything believable and true to the original item

Output:
A professional, visually immersive image that looks like it was shot in a high-end food photoshoot, optimized for a vertical TikTok-style menu experience.

Scene refinement:
- Simplify and neutralize the background to remove environmental distractions
- Replace busy or low-quality surroundings with a clean, subtle, out-of-focus dining context or neutral surface
- Maintain realism while creating a premium restaurant atmosphere

Camera direction:
- Simulate a professional food photography angle (slightly low or eye-level perspective for burgers)
- Improve visual depth by subtly enhancing foreground, midground, and background separation

Surface & styling:
- Refine the plate or surface to look clean and premium, without changing its original shape
- Remove visual noise such as stains, crumbs, or distractions unless they add intentional realism`;

const DRINK_PROMPT = `Transform this drink image into a premium commercial-style visual for a modern restaurant menu, while preserving the original item exactly as it is.

The input image may be low-quality or casually taken. Your goal is to elevate it into a high-end beverage photography result.

Core rules:
- Do NOT change the structure, ingredients, or composition of the drink
- Do NOT replace or redesign the drink
- Only enhance lighting, composition, and visual appeal

Framing & composition:
- Convert to vertical 9:16 format
- Center the drink as the hero subject
- Ensure the glass fills 70-85% of the frame height
- Maintain a clean and balanced composition

Scene refinement:
- Simplify or neutralize the background
- Replace distracting environments with a soft, premium cafe or bar ambiance
- Maintain realism with subtle blur (bokeh effect)

Lighting:
- Use soft cinematic lighting with emphasis on highlights and reflections
- Simulate backlighting or side lighting to enhance liquid depth
- Create glow through the drink where applicable

Drink enhancement:
- Enhance glass clarity and reflections
- Highlight condensation (cold drinks), foam (coffee), or bubbles (sparkling drinks)
- Preserve realistic liquid color and transparency
- Improve layering visibility (for lattes, cocktails, etc.)

Depth & focus:
- Keep the drink ultra sharp
- Apply shallow depth of field to isolate the subject
- Create strong foreground and background separation

Style:
- Premium beverage photography
- Clean, minimal, elegant
- Natural tones (no oversaturation)

Constraints:
- No text, logos, or overlays
- No fake elements or unrealistic effects
- Maintain authenticity of the original drink

Output:
A visually immersive, high-end drink image that looks like a professional cafe or cocktail photoshoot, optimized for vertical mobile viewing.`;

const CLASSIFIER_PROMPT = `Classify the uploaded menu photo.

Rules:
- Return only one token: DRINK or FOOD.
- Return DRINK when the main subject is any beverage (coffee, tea, juice, soda, cocktail, beer, wine, smoothie, milkshake, etc.).
- Return FOOD for everything else.
- Do not output explanations.`;

const VERIFY_PROMPT = `You compare two menu photos. Return only PASS when the enhanced image keeps the exact same main subject/items/layout with no replacement. Return only FAIL if subject/items are replaced or materially changed.`;

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

  const isSubjectPreserved = async (enhancedB64) => {
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
                text: VERIFY_PROMPT,
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

    await saveJob({ status: 'done', enhancedImage: publicUrl, discardedReplacement, modelUsed: usedModel, detectedType: imageType });

  } catch (error) {
    console.error('[enhance-photo-background] error:', error);
    await saveJob({ status: 'error', error: error.message || 'Enhancement failed' });
  }
};
