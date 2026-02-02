import { supabase } from '../lib/supabase';

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
  return {
    message: "Hey! Not sure what to eat? I've got you 😊\nWhat kind of bite are you feeling today?",
    quickReplies: ['Restaurants', 'Cafes & Bakery', 'Bars & Drinks', 'Surprise me'],
    triageData: {
      isComplete: false,
    },
    shouldSearch: false,
  };
}
