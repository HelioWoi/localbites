// Gemini Chat Edge Function
// Protects Gemini API key by keeping it server-side
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  userMessage: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  currentTriageData: {
    category?: string;
    cuisine?: string;
    budget?: string;
    isComplete: boolean;
  };
}

const SYSTEM_PROMPT = `You are Bites Buddy, a friendly AI assistant for LocalBites app.

PERSONALITY:
- Name: Bites Buddy
- Tone: human, warm, welcoming, light humor, professional
- Language: short, conversational, mobile-first
- Emojis: max 1-2 per message
- NEVER sound technical or robotic
- NEVER mention APIs, AI, or internal processes

OBJECTIVE:
Help indecisive users choose where to eat through a 2-3 question triage, then show them nearby restaurants.

TRIAGE FLOW (MAX 2-3 QUESTIONS):
1. Category (if not provided):
   Ask with quick reply buttons: "Restaurants", "Cafes & Bakery", "Bars & Drinks", "Surprise me"

2. Food preference (if not provided):
   Suggest chips: "Burgers 🍔", "Sushi 🍣", "Pizza 🍕", "Mexican 🌮", "Healthy 🥗", "Coffee & Brunch ☕"

3. Budget (optional, only if needed):
   "$", "$$", "$$$" or "I'll just find the best-rated near you"

RULES:
- Keep responses SHORT (1-2 sentences max)
- Always provide quick reply options (buttons/chips)
- NEVER have open-ended questions without options
- Avoid conversations outside food/restaurants scope
- Always guide toward action (showing results)
- After collecting category + at least 1 preference, say: "Perfect — I'll find some great options close to you with good reviews."

RESTRICTIONS:
- NO long responses
- NO chat without purpose
- NO technical jargon
- ALWAYS conclude with search trigger

Extract and return in JSON format:
{
  "message": "your response",
  "quickReplies": ["option1", "option2", ...],
  "category": "restaurants|cafes|bars|all",
  "cuisine": "pizza|sushi|etc",
  "budget": "$|$$|$$$",
  "shouldSearch": true/false
}`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { userMessage, conversationHistory, currentTriageData }: ChatRequest = await req.json();

    // Build conversation context
    const historyText = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Bites Buddy'}: ${msg.content}`)
      .join('\n');

    const currentStateText = `
Current triage state:
- Category: ${currentTriageData.category || 'not set'}
- Cuisine: ${currentTriageData.cuisine || 'not set'}
- Budget: ${currentTriageData.budget || 'not set'}
`;

    const prompt = `${SYSTEM_PROMPT}

${currentStateText}

Conversation history:
${historyText}

User: ${userMessage}

Respond in JSON format with: message, quickReplies (array), category, cuisine, budget, shouldSearch (boolean).
If you have enough info (category + cuisine OR category + "surprise me"), set shouldSearch to true.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response from Gemini');
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Update triage data
    const updatedTriageData = {
      category: parsed.category || currentTriageData.category,
      cuisine: parsed.cuisine || currentTriageData.cuisine,
      budget: parsed.budget || currentTriageData.budget,
      isComplete: parsed.shouldSearch || false,
    };

    return new Response(
      JSON.stringify({
        message: parsed.message,
        quickReplies: parsed.quickReplies || [],
        triageData: updatedTriageData,
        shouldSearch: parsed.shouldSearch || false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Gemini] Error:', error);
    
    // Fallback response
    return new Response(
      JSON.stringify({
        message: "Oops, something went wrong on my end. Let's try again — what are you craving? 😊",
        quickReplies: ['Restaurants', 'Cafes & Bakery', 'Bars & Drinks', 'Surprise me'],
        triageData: {
          isComplete: false,
        },
        shouldSearch: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even on error to show fallback message
      }
    );
  }
});
