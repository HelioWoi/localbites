import { supabase } from '../lib/supabase';
import { UserIntent, initializeIntent, isIntentActionable, vibeToCategory } from '../types/intent';

// Gemini API is now protected via Supabase Edge Function
// API key stays on server, client calls Edge Function

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TriageData {
  category?: 'restaurants' | 'cafes' | 'bars' | 'all';
  cuisine?: string;
  budget?: '$' | '$$' | '$$$';
  isComplete: boolean;
}

export interface AssistantResponse {
  message: string;
  quickReplies?: string[];
  triageData: TriageData;
  shouldSearch: boolean;
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

1. User provides keyword (e.g., "Pizza"):
   Response: "Pizza, yum 😋\nDo you want it quick and casual, or somewhere to sit and enjoy?"
   Buttons: ["Quick & casual", "Sit-down", "Bars & drinks", "Surprise me"]

2. User says "I don't know":
   Response: "No stress — tell me the vibe:\nquick bite, sit-down meal, or drinks?"
   Buttons: ["Quick bite", "Sit-down meal", "Drinks", "Surprise me"]

3. User selects vibe:
   Response: "Perfect. Any must-have cuisine, or should I surprise you?"
   If no answer in one turn → proceed with "surprise" defaults

4. Action confirmation:
   - With keyword: "Got it — showing pizza spots nearby. 🍕"
   - With keyword + openNow: "Got it — showing pizza spots open now nearby. 🍕"
   - Without keyword: "Got it — showing nearby places. 🍽️"

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

export async function chatWithBitesBuddy(
  userMessage: string,
  conversationHistory: ChatMessage[],
  currentTriageData: TriageData
): Promise<AssistantResponse> {
  try {
    console.log('[Bites Buddy] Calling Edge Function with message:', userMessage);
    
    // Call Supabase Edge Function (API key protected on server)
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: {
        userMessage,
        conversationHistory,
        currentTriageData,
      },
    });

    if (error) {
      console.error('[Bites Buddy] Edge Function error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No response from Edge Function');
    }

    console.log('[Bites Buddy] Response:', data);

    return {
      message: data.message,
      quickReplies: data.quickReplies || [],
      triageData: data.triageData,
      shouldSearch: data.shouldSearch || false,
    };
  } catch (error: any) {
    console.error('[Bites Buddy] Error:', error);
    
    // Log specific error details for debugging
    if (error?.message) {
      console.error('[Bites Buddy] Error message:', error.message);
    }
    if (error?.status) {
      console.error('[Bites Buddy] HTTP status:', error.status);
    }
    
    // Fallback response
    return {
      message: "Oops, something went wrong on my end. Let's try again — what are you craving? 😊",
      quickReplies: ['Restaurants', 'Cafes & Bakery', 'Bars & Drinks', 'Surprise me'],
      triageData: currentTriageData,
      shouldSearch: false,
    };
  }
}

export function getInitialMessage(): AssistantResponse {
  const now = new Date();
  const hour = now.getHours();
  
  // Context-aware greeting based on time
  let timeContext = '';
  if (hour >= 5 && hour < 12) {
    timeContext = 'this morning';
  } else if (hour >= 12 && hour < 17) {
    timeContext = 'for lunch';
  } else if (hour >= 17 && hour < 21) {
    timeContext = 'for dinner';
  } else {
    timeContext = 'right now';
  }
  
  return {
    message: `Hey! Not sure what to eat around here ${timeContext}?\nI can help you decide 😊\nAre you in the mood for something quick, a proper sit-down, or just exploring?`,
    quickReplies: ['Quick & casual', 'Sit-down meal', 'Bars & drinks', 'Surprise me'],
    triageData: {
      isComplete: false,
    },
    shouldSearch: false,
  };
}

// Debug flag - set to true to enable detailed logs
const DEBUG_BUDDY = false;

export function logBuddyIntent(intent: UserIntent) {
  if (DEBUG_BUDDY) {
    console.log('[BUDDY] intent updated:', JSON.stringify(intent, null, 2));
  }
}

export function logBuddyAction(action: string, data: any) {
  if (DEBUG_BUDDY) {
    console.log(`[BUDDY] ${action}:`, JSON.stringify(data, null, 2));
  }
}

export function logFeedUpdate(raw: number, displayed: number) {
  if (DEBUG_BUDDY) {
    console.log(`[FEED] fetched count: raw=${raw} displayed=${displayed}`);
  }
}
