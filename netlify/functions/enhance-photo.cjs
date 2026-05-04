'use strict';

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

    const callOpenAI = async (model, quality, prompt) => {
      const formData = new FormData();
      formData.append('image', blob, 'photo.jpg');
      formData.append('prompt', prompt);
      formData.append('model', model);
      formData.append('n', '1');
      formData.append('size', '1024x1536');
      formData.append('quality', quality);

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
        const msg = errorData.error?.message || `OpenAI error ${response.status}`;
        const isAccessError = msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('permission') || response.status === 403;
        throw Object.assign(new Error(msg), { isAccessError });
      }

      const data = await response.json();
      return data.data?.[0]?.b64_json || null;
    };

    let imageType = 'food';
    try {
      imageType = await detectImageType();
    } catch (classifyError) {
      console.warn('[enhance-photo] classifier failed, defaulting to food prompt:', classifyError.message || classifyError);
    }
    const selectedPrompt = imageType === 'drink' ? DRINK_PROMPT : FOOD_PROMPT;

    let usedModel = 'gpt-image-2';
    let b64Image = null;

    try {
      b64Image = await callOpenAI('gpt-image-2', 'medium', selectedPrompt);
    } catch (err) {
      if (err.isAccessError) {
        console.log('[enhance-photo] gpt-image-2 access denied, falling back to gpt-image-1');
        usedModel = 'gpt-image-1';
        b64Image = await callOpenAI('gpt-image-1', 'low', selectedPrompt);
      } else {
        throw err;
      }
    }

    if (!b64Image) {
      throw new Error('No image returned from OpenAI');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ enhancedImage: `data:image/png;base64,${b64Image}`, modelUsed: usedModel, detectedType: imageType }),
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
