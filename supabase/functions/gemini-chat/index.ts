// LoveBot Chat Edge Function
// Partner Assistant for MenuLove Dashboard
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface ChatRequest {
  systemPrompt: string;
  history: ChatMessage[];
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { systemPrompt, history, message }: ChatRequest = await req.json();

    // Build contents array for Gemini (history + new message)
    const contents: ChatMessage[] = [
      ...history,
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    // Call Gemini API with system instruction
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: contents
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LoveBot] API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response from Gemini');
    }

    return new Response(
      JSON.stringify({
        response: responseText,
        text: responseText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[LoveBot] Error:', error);
    
    // Fallback response
    return new Response(
      JSON.stringify({
        response: "I'm having trouble connecting right now. Please try again in a moment, or contact support if the issue persists.",
        text: "I'm having trouble connecting right now. Please try again in a moment, or contact support if the issue persists."
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
