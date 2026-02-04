import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Sparkles, Send } from 'lucide-react';
import { chatWithBitesBuddy, getInitialMessage, ChatMessage, TriageData, logBuddyIntent, logBuddyAction } from '../services/aiAssistant';
import { UserIntent, initializeIntent } from '../types/intent';

interface BitesAIProps {
  onClose: () => void;
  onSearchTrigger: (triageData: TriageData) => void;
  onApplyIntent?: (intent: {
    keyword?: string;
    vibe?: 'quick' | 'sitdown' | 'drinks' | 'explore' | 'surprise';
    category?: 'restaurants' | 'cafes' | 'bars' | 'all';
    openNow?: boolean;
    radiusKm?: number;
  }) => void;
  mode?: 'voice' | 'chat'; // voice = Start talking screen, chat = Direct chat
}

const BitesAI: React.FC<BitesAIProps> = ({ onClose, onSearchTrigger, onApplyIntent, mode = 'voice' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [triageData, setTriageData] = useState<TriageData>({ isComplete: false });
  const [hasStarted, setHasStarted] = useState(mode === 'chat'); // Auto-start if chat mode
  const [isListening, setIsListening] = useState(false);
  const [userIntent, setUserIntent] = useState<UserIntent>(initializeIntent()); // Intent Engine
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auto-start conversation if chat mode
  useEffect(() => {
    if (mode === 'chat' && messages.length === 0) {
      const initial = getInitialMessage();
      setMessages([
        {
          role: 'assistant',
          content: initial.message,
          timestamp: new Date(),
        },
      ]);
      setQuickReplies(initial.quickReplies || []);
    }
  }, [mode]);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
        // Auto-send after voice input
        setTimeout(() => handleSendMessage(transcript), 100);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Initialize conversation when user starts
  const startConversation = () => {
    setHasStarted(true);
    const initial = getInitialMessage();
    setMessages([
      {
        role: 'assistant',
        content: initial.message,
        timestamp: new Date(),
      },
    ]);
    setQuickReplies(initial.quickReplies || []);
  };

  // Handle voice input
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      if (!hasStarted) {
        startConversation();
      }
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setQuickReplies([]);
    setIsTyping(true);

    try {
      // Get AI response
      const response = await chatWithBitesBuddy(text, messages, triageData);

      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setQuickReplies(response.quickReplies || []);
      setTriageData(response.triageData);
      setIsTyping(false);

      // If search should be triggered, close modal and trigger search
      if (response.shouldSearch) {
        setTimeout(() => {
          onSearchTrigger(response.triageData);
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Oops, something went wrong. Let's try that again! 😊",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Backdrop for chat mode */}
      {mode === 'chat' && (
        <div 
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}
      
      {/* Modal */}
      <div className={`fixed z-[100] flex flex-col animate-in duration-300 ${
        mode === 'chat' 
          ? 'bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-[40px] shadow-2xl slide-in-from-bottom' 
          : 'inset-0 bg-white fade-in'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Bites <span className="text-zinc-400 font-normal">Buddy</span></h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
        >
          <X size={20} className="text-zinc-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {!hasStarted ? (
          /* Initial State - ChatGPT Voice Style */
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <button
              onClick={handleVoiceInput}
              className={`mb-8 w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform ${
                isListening ? 'animate-pulse' : ''
              }`}
            >
              <Mic size={48} className="text-white" strokeWidth={2} />
            </button>
            <h1 className="text-2xl font-light text-zinc-400 mb-2">
              {isListening ? 'Listening...' : 'Start talking'}
            </h1>
            <p className="text-sm text-zinc-400 text-center max-w-xs mb-6">
              Tell me what you're craving and I'll find the perfect spot for you
            </p>
            
            {/* Text input option */}
            <div className="w-full max-w-md">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Or type your message..."
                    className="w-full px-5 py-3 bg-zinc-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                    disabled={isTyping}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-100 text-zinc-900'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Quick replies */}
          {quickReplies.length > 0 && !isTyping && (
            <div className="flex flex-wrap gap-2 pt-2">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply)}
                  className="px-4 py-2 bg-white border-2 border-orange-500 text-orange-500 rounded-full text-sm font-bold hover:bg-orange-50 active:scale-95 transition-all"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - Only show when conversation started */}
      {hasStarted && (
        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type"
                className="w-full px-5 py-3 bg-zinc-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                disabled={isTyping}
              />
            </div>
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              className="w-11 h-11 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send size={18} />
            </button>
            <button
              onClick={handleVoiceInput}
              className={`w-11 h-11 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all ${
                isListening ? 'animate-pulse' : ''
              }`}
              title="Voice input"
            >
              <Mic size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default BitesAI;
