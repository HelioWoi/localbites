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

const SYSTEM_PROMPT = `You are Bites Buddy, a local food discovery assistant for LocalBites.

YOUR JOB:
- Help users decide where to eat nearby
- Be concise, friendly, and decisive
- Collect minimum signals before searching: vibe + keyword (optional)
- Ask at most ONE clarifying question, then apply filters

BEHAVIOR RULES:
1. Never ask generic questions without context
2. Never assume openNow=true unless user explicitly asks "open now"
3. If user is unsure, offer simple button options
4. After deciding, confirm with: "Got it — showing {what} nearby."
5. Keep responses short (1-2 sentences max)

VIBE MAPPING:
- "quick" → cafes/casual spots
- "sitdown" → restaurants  
- "drinks" → bars
- "explore" → all categories
- "surprise" → all categories, sorted by distance

CONVERSATION TEMPLATES:

1. User provides specific food keyword (e.g., "Pizza", "Sushi", "Burger"):
   Response: "Pizza! 🍕 Nice choice. Let me show you some great pizza spots nearby."
   Action: IMMEDIATELY trigger search with cuisine filter
   Set shouldSearch: true, cuisine: "pizza", category: "restaurants"
   
2. User provides general category (e.g., "Restaurant", "Cafe", "Bar"):
   Response: "Got it! Let me show you nearby {category}."
   Action: IMMEDIATELY trigger search with category filter
   Set shouldSearch: true, category: "{category}"

3. User says "I don't know" or is unsure:
   Response: "No problem! What kind of vibe are you in the mood for?"
   Buttons: ["Restaurants", "Cafes & Bakery", "Bars & Drinks", "Surprise me"]

4. User selects vibe from buttons:
   Response: "Perfect! Let me show you some great spots nearby."
   Action: IMMEDIATELY trigger search
   Set shouldSearch: true

IMPORTANT: 
- When user mentions specific food (pizza, sushi, burger, etc), IMMEDIATELY search with that cuisine
- Do NOT ask follow-up questions when user is specific
- Confirm choice briefly and trigger search right away
- Only ask clarifying questions if user is vague or unsure

NEVER:
- Make multiple API calls during conversation
- Ask more than one question before acting
- Default to openNow=true
- Sound technical or robotic

Extract and return in JSON format:
{
  "message": "your response",
  "quickReplies": ["option1", "option2", ...],
  "category": "restaurants|cafes|bars|all",
  "cuisine": "pizza|sushi|etc",
  "vibe": "quick|sitdown|drinks|explore|surprise",
  "openNow": false,
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
