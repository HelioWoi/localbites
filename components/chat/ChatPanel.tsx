import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { ChatMessage as ChatMessageType, QuickAction } from '../../types/chat';
import ChatMessage from './ChatMessage';
import { sendChatMessage } from '../../services/geminiChatService';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onShowContent: (data: any) => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'upload', label: 'Upload Video', icon: '', prompt: 'How do I upload a video to my menu?' },
  { id: 'analytics', label: 'View Analytics', icon: '', prompt: 'Explain my analytics dashboard' },
  { id: 'qr', label: 'QR Code Help', icon: '', prompt: 'How do I use my QR code?' },
  { id: 'reports', label: 'Download Reports', icon: '', prompt: 'How do I download analytics reports?' },
];

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, onShowContent }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm LoveBot, your MenuLove assistant. I'm here to help you with anything related to your restaurant dashboard.\n\nYou can ask me about:\n• Uploading videos and photos\n• Understanding your analytics\n• Managing your menu\n• Using QR codes\n• Downloading reports\n• And much more!\n\nWhat would you like help with today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      // Focus input when panel opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { response, contentPanel } = await sendChatMessage(messages, textToSend);

      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        contentPanelData: contentPanel,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 bottom-4 w-[400px] bg-white rounded-2xl shadow-xl z-50 transition-all duration-300 flex flex-col overflow-hidden ${
        isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5">
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/favcon.png" 
              alt="MenuLove" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">LoveBot</h3>
            <p className="text-white/80 text-xs">Always here to help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Close chat"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-zinc-50 to-white" style={{ minHeight: 0 }}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onShowContent={onShowContent}
          />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-zinc-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-zinc-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 py-3 bg-white border-t border-zinc-200">
          <p className="text-xs text-zinc-500 mb-2 font-medium">Quick actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-xs font-medium text-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-4 bg-white border-t border-zinc-100">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-2 text-center">
          Powered by AI • Always learning to help you better
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
