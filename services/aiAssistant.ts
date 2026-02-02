import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Update triage data
    const updatedTriageData: TriageData = {
      category: parsed.category || currentTriageData.category,
      cuisine: parsed.cuisine || currentTriageData.cuisine,
      budget: parsed.budget || currentTriageData.budget,
      isComplete: parsed.shouldSearch || false,
    };

    return {
      message: parsed.message,
      quickReplies: parsed.quickReplies || [],
      triageData: updatedTriageData,
      shouldSearch: parsed.shouldSearch || false,
    };
  } catch (error) {
    console.error('Bites Buddy error:', error);
    
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
