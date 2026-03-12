import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

const CrispChat = () => {
  useEffect(() => {
    const websiteId = import.meta.env.VITE_CRISP_WEBSITE_ID;
    
    if (!websiteId) {
      console.warn('Crisp Website ID not found in environment variables');
      return;
    }

    // Initialize Crisp
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;

    // Load Crisp script
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    // Configure Crisp with MenuLove branding
    script.onload = () => {
      // Set primary color to MenuLove orange
      window.$crisp.push(['config', 'color:theme', ['orange']]);
      
      // Set position (right side, bottom)
      window.$crisp.push(['config', 'position:reverse', [false]]);
      
      // Set chatbox name to LoveBot
      window.$crisp.push(['set', 'user:nickname', ['LoveBot']]);
      
      // Auto-show welcome message after 5 seconds
      setTimeout(() => {
        window.$crisp.push(['do', 'message:show', ['text', '👋 Hi! I\'m LoveBot, your MenuLove assistant. Need help creating your video menu?']]);
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window.$crisp;
      delete window.CRISP_WEBSITE_ID;
    };
  }, []);

  return null;
};

export default CrispChat;
