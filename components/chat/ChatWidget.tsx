import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import ContentSlidePanel from './ContentSlidePanel';
import { ContentPanelData } from '../../types/chat';

const ChatWidget: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [contentPanel, setContentPanel] = useState<ContentPanelData | null>(null);
  const [isContentPanelOpen, setIsContentPanelOpen] = useState(false);

  const handleShowContent = (data: ContentPanelData) => {
    setContentPanel(data);
    setIsContentPanelOpen(true);
  };

  const handleCloseContentPanel = () => {
    setIsContentPanelOpen(false);
    setTimeout(() => setContentPanel(null), 300);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    // Also close content panel when chat closes
    handleCloseContentPanel();
  };

  return (
    <>
      {/* Floating Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-40 group"
          title="Open LoveBot"
        >
          <img 
            src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/favcon.png" 
            alt="MenuLove" 
            className="w-7 h-7 group-hover:scale-110 transition-transform"
          />
          
          {/* Pulse animation */}
          <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20" />
          
          {/* Badge */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            ?
          </span>
        </button>
      )}

      {/* Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        onShowContent={handleShowContent}
      />

      {/* Content Slide Panel */}
      <ContentSlidePanel
        content={contentPanel}
        isOpen={isContentPanelOpen}
        onClose={handleCloseContentPanel}
      />
    </>
  );
};

export default ChatWidget;
