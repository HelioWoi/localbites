import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  onShowContent?: (data: any) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onShowContent }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-orange-500 text-white rounded-br-sm'
              : 'bg-zinc-100 text-zinc-900 rounded-bl-sm'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap">
            {message.content}
          </div>
          
          {/* Show content button if available */}
          {!isUser && message.contentPanelData && onShowContent && (
            <button
              onClick={() => onShowContent(message.contentPanelData)}
              className="mt-3 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <span>See More</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        
        <div className={`text-xs text-zinc-400 mt-1 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
