import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

const CrispChatWithAI = () => {
  useEffect(() => {
    const websiteId = import.meta.env.VITE_CRISP_WEBSITE_ID;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    console.log('[CrispChat] Initializing...', { websiteId, supabaseUrl });
    
    if (!websiteId) {
      console.error('[CrispChat] VITE_CRISP_WEBSITE_ID not found in environment variables');
      return;
    }

    // Initialize Crisp
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;
    
    console.log('[CrispChat] Crisp initialized with ID:', websiteId);

    // Load Crisp script
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    // Configure Crisp with MenuLove branding and AI integration
    script.onload = () => {
      console.log('[CrispChat] Script loaded successfully');
      
      // Set primary color to MenuLove orange (#f97316 - orange-500)
      window.$crisp.push(['config', 'color:theme', ['#f97316']]);
      
      // Set position (right side, bottom)
      window.$crisp.push(['config', 'position:reverse', [false]]);
      
      // Disable Crisp's default automated messages
      window.$crisp.push(['config', 'hide:on:away', [true]]);
      window.$crisp.push(['config', 'hide:on:mobile', [false]]);
      
      // Set default operator nickname to LoveBot AI
      window.$crisp.push(['set', 'session:data', [[['operator_nickname', 'LoveBot AI']]]]);
      
      // Note: When a human operator (Helio Woi) joins, their name will automatically replace LoveBot AI
      // Welcome message should be configured in Crisp dashboard to avoid duplicates
      
      // Add soft pulse animation to chat icon only (not the chat box)
      const addPulseAnimation = () => {
        // Add keyframes to document
        const style = document.createElement('style');
        style.textContent = `
          @keyframes crisp-icon-pulse {
            0%, 100% { 
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(249, 115, 22, 0.5);
            }
            50% { 
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 8px rgba(249, 115, 22, 0);
            }
          }
        `;
        document.head.appendChild(style);
        
        // Find and animate the chat bubble icon
        const findAndAnimateIcon = () => {
          // Try multiple selectors to find the floating chat button
          const selectors = [
            '.crisp-client [data-chat-status]',
            '.crisp-client .cc-unoo',
            '.crisp-client .cc-1xry .cc-unoo',
            '.crisp-client div[role="button"]'
          ];
          
          for (const selector of selectors) {
            const icon = document.querySelector(selector);
            if (icon && icon instanceof HTMLElement) {
              console.log('[CrispChat] Found chat icon, applying pulse animation');
              icon.style.animation = 'crisp-icon-pulse 2.5s ease-in-out infinite';
              return true;
            }
          }
          return false;
        };
        
        // Try to find icon immediately
        if (!findAndAnimateIcon()) {
          // If not found, observe DOM changes
          const observer = new MutationObserver(() => {
            if (findAndAnimateIcon()) {
              observer.disconnect();
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          // Stop observing after 10 seconds
          setTimeout(() => observer.disconnect(), 10000);
        }
      };
      
      // Apply pulse animation after Crisp loads
      setTimeout(addPulseAnimation, 2000);

      // Track if human operator is active
      let humanOperatorActive = false;
      
      // Listen for operator availability changes
      window.$crisp.push(['on', 'session:loaded', () => {
        // Check if any operator is online
        window.$crisp.push(['is', 'website:available', (available: boolean) => {
          if (available) {
            console.log('[CrispChat] Human operator is available');
          }
        }]);
      }]);
      
      // Listen for messages from operators (human joining conversation)
      window.$crisp.push(['on', 'message:received', (message: any) => {
        if (message.origin === 'operator') {
          console.log('[CrispChat] Human operator joined - pausing AI');
          humanOperatorActive = true;
        }
      }]);

      // Listen for user messages and send to AI (only if human not active)
      window.$crisp.push(['on', 'message:sent', async (message: any) => {
        // Only process user messages (not bot messages) and only if human operator hasn't taken over
        if (message.origin === 'user' && message.type === 'text' && !humanOperatorActive) {
          try {
            console.log('[CrispChat] Processing user message with AI:', message.content);
            
            // Get conversation history from Crisp
            const conversationHistory: any[] = [];
            
            // Call LoveBot Edge Function
            const response = await fetch(`${supabaseUrl}/functions/v1/lovebot-chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: message.content,
                conversationHistory: conversationHistory
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            
            if (data.success && data.reply) {
              // Send AI response back to Crisp
              console.log('[CrispChat] Sending AI response:', data.reply);
              window.$crisp.push(['do', 'message:send', ['text', data.reply]]);
            }
          } catch (error) {
            console.error('[CrispChat] Error getting AI response:', error);
            // Fallback message if AI fails
            window.$crisp.push(['do', 'message:send', ['text', 'I\'m having trouble connecting right now. A MenuLove team member will be with you shortly!']]);
          }
        } else if (humanOperatorActive) {
          console.log('[CrispChat] Human operator active - skipping AI response');
        }
      }]);
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

export default CrispChatWithAI;
