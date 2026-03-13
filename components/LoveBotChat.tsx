import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const LoveBotChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "👋 Hi! I'm LoveBot, your MenuLove assistant. Need help creating your video menu?",
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSmartFallbackResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    // What is MenuLove
    if (lowerMessage.includes('what') && (lowerMessage.includes('menulove') || lowerMessage.includes('menu love'))) {
      return "MenuLove™ is a video-based menu platform for restaurants, cafés, and food venues. We help you showcase your dishes through short videos in a TikTok-style feed, making it easier for customers to discover and order food. Each venue gets a unique video menu page with QR codes for easy sharing!";
    }
    
    // Pricing
    if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('pricing') || lowerMessage.includes('much')) {
      return "Great question! We offer a 30-day free trial with no credit card required. After that, our plans start at just $29/month. You can cancel anytime - no contracts, no hidden fees. Want to try it out? Click 'Create My Video Menu' to get started!";
    }
    
    // How to start
    if (lowerMessage.includes('start') || lowerMessage.includes('begin') || lowerMessage.includes('sign up') || lowerMessage.includes('create')) {
      return "Getting started is super easy! Just click the 'Create My Video Menu' button on this page. You'll create your account, add your restaurant details, and start uploading dish videos or photos. The whole process takes about 10 minutes. Want me to walk you through it?";
    }
    
    // Free trial
    if (lowerMessage.includes('trial') || lowerMessage.includes('free')) {
      return "Yes! We offer a full 30-day free trial - no credit card required. You get access to all features: unlimited video uploads, QR codes, analytics, and more. Try it risk-free and see how MenuLove can boost your sales!";
    }
    
    // Videos/Upload
    if (lowerMessage.includes('video') || lowerMessage.includes('upload') || lowerMessage.includes('photo')) {
      return "You can upload both videos and photos of your dishes! Videos work best (15-60 seconds), but high-quality photos work great too. Just film your dishes on your phone, upload them to your dashboard, add names and prices, and you're done. We'll handle the rest!";
    }
    
    // QR Code
    if (lowerMessage.includes('qr') || lowerMessage.includes('code') || lowerMessage.includes('share')) {
      return "Every restaurant gets a unique QR code that customers can scan to view your video menu. You can download it from your dashboard and print it for tables, windows, or anywhere you like. Customers can also share your menu link on social media!";
    }
    
    // Help/Support
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('contact')) {
      return "I'm here to help! You can ask me anything about MenuLove, or email us at contact@menulove.com.au. Our team typically responds within 24 hours. What would you like to know?";
    }
    
    // Default friendly response
    return "That's a great question! While I'm learning to answer that better, I can tell you that MenuLove helps restaurants create beautiful video menus that customers love. We offer a 30-day free trial, easy video uploads, QR codes, and analytics. Want to know more about pricing, how to get started, or our features?";
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history in Gemini format
      const history = messages
        .filter(m => m.role !== 'assistant' || m.id !== '1') // Exclude welcome message
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

      // Call Gemini Chat Edge Function using Supabase SDK
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          systemPrompt: `You are LoveBot, the official assistant of MenuLove™.

Your role is to provide friendly, human-like assistance to visitors, restaurant owners, café managers, food vendors and partners using the MenuLove platform.

Your mission is to help users understand how MenuLove works, guide partners through using the platform, answer questions clearly, and help people solve problems in a supportive and conversational way.

Always communicate in clear, natural English.

ABOUT MENULOVE

MenuLove is a video-based menu platform designed for cafés, restaurants, food trucks, dessert shops and hospitality venues.

The platform allows businesses to showcase their dishes using short videos or photos in a vertical scrolling feed similar to social media.

Each venue receives its own unique video menu page that can be shared through QR codes, social media, website links, and direct sharing.

MenuLove helps customers discover dishes visually and make faster, more confident ordering decisions.

YOUR RESPONSIBILITIES

• Explain how MenuLove works
• Guide restaurant owners on how to start using the platform
• Answer questions about uploading videos or photos
• Explain how to share a video menu
• Help users solve problems step-by-step
• Encourage restaurants to try the platform
• Provide clear and friendly assistance

Always try to solve the user's question directly in the conversation.

COMMUNICATION STYLE

Your tone must always be friendly, supportive, professional, and conversational. Avoid robotic language. Write like a helpful assistant speaking to a real person.

Keep responses clear and easy to understand. Prefer short explanations followed by helpful steps.`,
          history: history,
          message: inputMessage
        },
      });

      // Use smart fallback if API fails or returns error
      if (error || !data || (!data.response && !data.text)) {
        console.log('[LoveBot] Using smart fallback response');
        const fallbackResponse = getSmartFallbackResponse(inputMessage);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fallbackResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || data.text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('[LoveBot] Error:', error);
      // Use smart fallback on error
      const fallbackResponse = getSmartFallbackResponse(inputMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 group hover:scale-110"
          style={{
            animation: 'pulse-shadow 2.5s ease-in-out infinite'
          }}
        >
          <MessageCircle size={28} className="text-white" />
          
          {/* Pulse animation */}
          <style>{`
            @keyframes pulse-shadow {
              0%, 100% { 
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(249, 115, 22, 0.5);
              }
              50% { 
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 8px rgba(249, 115, 22, 0);
              }
            }
          `}</style>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-zinc-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">LoveBot AI</h3>
                <p className="text-white/80 text-xs">MenuLove Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-zinc-900 border border-zinc-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-white/70' : 'text-zinc-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-zinc-900 border border-zinc-200 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-zinc-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-orange-500 text-white p-2 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-2 text-center">
              Powered by MenuLove™ AI
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default LoveBotChat;
