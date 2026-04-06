import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Sparkles, Paperclip } from 'lucide-react';
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
  const [lastQuestionContext, setLastQuestionContext] = useState<string | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [conversationStatus, setConversationStatus] = useState<'bot_only' | 'human_takeover' | 'closed'>('bot_only');
  const [agentName, setAgentName] = useState<string>('');
  const [conversationMode, setConversationMode] = useState<'AI_MODE' | 'HUMAN_MODE' | 'ASSIST_MODE'>('AI_MODE');
  const [lastAgentMessageTime, setLastAgentMessageTime] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    notificationSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8LJnHgU2jdXvzHkpBSh+zPDckTsKE1y06+qnVBIJRp/g8r5sIAUrgc7y2Yk2CBhkuezooVARCw==');
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session and create conversation in database
  useEffect(() => {
    if (isOpen && !sessionId) {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      // Create conversation in database with welcome message
      const initConversation = async () => {
        try {
          const welcomeMessage = {
            id: '1',
            role: 'assistant',
            content: "👋 Hi! I'm LoveBot, your MenuLove assistant. Need help creating your video menu?",
            timestamp: new Date().toISOString()
          };

          const { error } = await supabase
            .from('chat_conversations')
            .insert({
              session_id: newSessionId,
              messages: [welcomeMessage],
              status: 'bot_only',
              user_info: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                timestamp: new Date().toISOString()
              }
            });
          
          if (error) {
            console.error('[LoveBot] Error creating conversation:', error);
          } else {
            // Set welcome message in UI
            setMessages([{
              id: '1',
              role: 'assistant',
              content: "👋 Hi! I'm LoveBot, your MenuLove assistant. Need help creating your video menu?",
              timestamp: new Date()
            }]);
          }
        } catch (err) {
          console.error('[LoveBot] Error:', err);
        }
      };
      
      initConversation();
    }
  }, [isOpen, sessionId]);

  // Subscribe to conversation status changes (human takeover) and new messages
  useEffect(() => {
    if (!sessionId) return;

    console.log('[LoveBot] Subscribing to realtime updates for session:', sessionId);

    const channel = supabase
      .channel(`conversation_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
          filter: `session_id=eq.${sessionId}`
        },
        (payload: any) => {
          console.log('[LoveBot] Received UPDATE event:', payload);
          
          // Update status if human takeover
          if (payload.new.status === 'human_takeover' && conversationStatus !== 'human_takeover') {
            console.log('[LoveBot] Human takeover detected!');
            setConversationStatus('human_takeover');
            setAgentName(payload.new.assigned_agent || 'Support Agent');
            setConversationMode('HUMAN_MODE');
          }
          
          // Update status if returned to AI
          if (payload.new.status === 'bot_only' && conversationStatus === 'human_takeover') {
            console.log('[LoveBot] Returned to AI mode!');
            setConversationStatus('bot_only');
            setConversationMode('AI_MODE');
            setLastAgentMessageTime(null);
          }
          
          // Update messages if new messages from admin
          if (payload.new.messages && payload.new.messages.length > messages.length) {
            console.log('[LoveBot] New messages detected from admin');
            const newMessages = payload.new.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              ...(msg.attachment_url && { attachment_url: msg.attachment_url })
            }));
            
            // Play notification sound for new assistant messages
            const lastMessage = payload.new.messages[payload.new.messages.length - 1];
            if (lastMessage.role === 'assistant' && soundEnabled && notificationSound.current) {
              notificationSound.current.play().catch(() => {});
            }
            
            // Check if last message is from human agent
            if (lastMessage.content.includes('[') && lastMessage.role === 'assistant') {
              // Human agent message detected - switch to HUMAN_MODE
              console.log('[LoveBot] Human agent message detected - switching to HUMAN_MODE');
              setConversationMode('HUMAN_MODE');
              setConversationStatus('human_takeover');
              setAgentName(payload.new.assigned_agent || 'Support Agent');
              setLastAgentMessageTime(Date.now());
            }
            
            setMessages(newMessages);
          }
        }
      )
      .subscribe((status) => {
        console.log('[LoveBot] Subscription status:', status);
      });

    return () => {
      console.log('[LoveBot] Unsubscribing from realtime');
      supabase.removeChannel(channel);
    };
  }, [sessionId, conversationStatus, messages.length]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingFile(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionId}_${Date.now()}.${fileExt}`;
      const filePath = `chat-attachments/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      // Save attachment record
      const messageId = Date.now().toString();
      await supabase.from('chat_attachments').insert({
        session_id: sessionId,
        message_id: messageId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: filePath,
        public_url: urlData.publicUrl,
        uploaded_by: 'user'
      });

      // Add message with attachment
      const newMessage: Message = {
        id: messageId,
        role: 'user',
        content: `📎 Sent an attachment: ${file.name}`,
        timestamp: new Date()
      };

      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);

      // Save to database
      await saveMessageToDatabase(newMessage, urlData.publicUrl);
      
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('[LoveBot] Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Auto-resume AI after 2 minutes of agent inactivity (2 minutes)
  useEffect(() => {
    if (conversationMode === 'HUMAN_MODE' && lastAgentMessageTime) {
      const checkInactivity = setInterval(() => {
        const timeSinceLastMessage = Date.now() - lastAgentMessageTime;
        const twoMinutes = 2 * 60 * 1000;
        
        if (timeSinceLastMessage > twoMinutes) {
          console.log('[LoveBot] Agent inactive for 2 minutes - resuming AI_MODE');
          setConversationMode('AI_MODE');
          setLastAgentMessageTime(null);
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(checkInactivity);
    }
  }, [conversationMode, lastAgentMessageTime]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save message to database and detect keywords
  const saveMessageToDatabase = async (message: Message, attachment_url?: string) => {
    if (!sessionId) return;

    try {
      // Get current conversation
      const { data: conversation } = await supabase
        .from('chat_conversations')
        .select('messages, keywords_detected')
        .eq('session_id', sessionId)
        .single();

      if (!conversation) return;

      const updatedMessages = [...(conversation.messages || []), {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        ...(attachment_url && { attachment_url })
      }];

      // Detect keywords for lead qualification
      const leadKeywords = [
        'meeting', 'demo', 'partnership', 'talk to sales', 'talk to team',
        'cafe', 'café', 'restaurant', 'food truck', 'bar',
        'interested', 'pricing', 'how much', 'cost'
      ];

      const messageText = message.content.toLowerCase();
      const detectedKeywords = leadKeywords.filter(keyword => messageText.includes(keyword));
      const allKeywords = [...new Set([...(conversation.keywords_detected || []), ...detectedKeywords])];
      const isLead = allKeywords.length > 0;

      // Update conversation
      await supabase
        .from('chat_conversations')
        .update({
          messages: updatedMessages,
          keywords_detected: allKeywords,
          is_lead: isLead,
          last_message_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

    } catch (error) {
      console.error('[LoveBot] Error saving message:', error);
    }
  };

  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the element briefly
      element.style.transition = 'all 0.3s ease';
      element.style.transform = 'scale(1.05)';
      element.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.5)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.boxShadow = '';
      }, 2000);
    }
  };

  const getSmartFallbackResponse = (message: string, context: string | null, lastMessage: string): { text: string; action?: () => void; setContext?: string | null } => {
    const lowerMessage = message.toLowerCase();
    const isShortReply = message.trim().split(' ').length <= 3;
    
    // SHORT REPLY CONTEXTUAL INTERPRETATION - Handle answers to previous questions
    
    if (isShortReply && lastMessage) {
      const lastLower = lastMessage.toLowerCase();
      
      // Answering "What type of venue do you run?"
      if (lastLower.includes('what type of venue') || lastLower.includes('what type of business')) {
        if (lowerMessage.includes('cafe') || lowerMessage.includes('café')) {
          return {
            text: "Perfect — MenuLove works especially well for cafés! Many cafés use it to showcase drinks, desserts and specials through short videos. Customers can explore the menu visually and then order through your existing system.\n\n**Great content ideas for cafés:**\n• Coffee preparation & latte art\n• Desserts & pastries\n• Breakfast plates\n• Seasonal specials\n\nWould you like to see a live example, or learn about pricing and setup?",
            setContext: null
          };
        } else if (lowerMessage.includes('restaurant')) {
          return {
            text: "Excellent! MenuLove is perfect for restaurants. You can showcase your signature dishes, daily specials, and full menu through engaging videos that help customers decide faster.\n\n**Great content ideas for restaurants:**\n• Signature dishes & chef plating moments\n• Kitchen preparation clips\n• Specials of the day\n• Close-ups of the final dish\n\nWould you like to see a live example, or learn about pricing and how to get started?",
            setContext: null
          };
        } else if (lowerMessage.includes('food truck') || lowerMessage.includes('truck')) {
          return {
            text: "Great! MenuLove works perfectly for food trucks. You can showcase your menu items through videos and share your menu via QR code on your truck or social media.\n\n**Great content ideas for food trucks:**\n• Quick preparation clips\n• Close-ups of the final dish\n• Customer favorites\n• Behind-the-scenes cooking\n\nWant to see how it works, or learn about pricing and setup?",
            setContext: null
          };
        } else if (lowerMessage.includes('bar') || lowerMessage.includes('pub')) {
          return {
            text: "Perfect for bars! MenuLove helps you showcase cocktails, drinks, and food specials through engaging videos. Great for promoting happy hour specials and signature drinks.\n\n**Great content ideas for bars:**\n• Cocktail preparation\n• Drink presentations\n• Food specials\n• Happy hour highlights\n\nWould you like to see an example or learn about pricing?",
            setContext: null
          };
        }
      }
      
      // Answering yes/no to availability questions
      if (lastLower.includes('can be used') && lastLower.includes('world')) {
        if (lowerMessage === 'yes' || lowerMessage === 'yeah' || lowerMessage === 'yep') {
          return {
            text: "Yes — MenuLove is web-based, so it can be used globally. Businesses in different countries can use it to create video menus and share them through QR codes or direct links.\n\nWhat country are you in? I can help you get started!",
            setContext: null
          };
        }
      }
      
      // Answering country name after being asked
      if (lastLower.includes('what country') || lastLower.includes('where are you')) {
        return {
          text: `Great! MenuLove works perfectly in ${message}. Since it's a web-based platform, you can create your video menu in your local language and currency.\n\nWould you like to know about pricing, or see how to get started?`,
          setContext: null
        };
      }
      
      // Answering what they want to know more about
      if (lastLower.includes('would you like to know') || lastLower.includes('what would you like')) {
        if (lowerMessage.includes('pricing') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
          return {
            text: "We offer a 30-day free trial with no credit card required. After that, plans start at $39/month. You can cancel anytime - no contracts, no hidden fees.\n\nReady to try it out? I can scroll you to the signup form.",
            action: () => scrollToElement('signup-form'),
            setContext: null
          };
        } else if (lowerMessage.includes('setup') || lowerMessage.includes('start') || lowerMessage.includes('get started')) {
          return {
            text: "Getting started is super easy! Let me scroll you to the signup form. Just add your venue details and you'll be creating your video menu in minutes.\n\nThe whole process takes about 10 minutes, and you can start uploading dish videos right away.",
            action: () => scrollToElement('signup-form'),
            setContext: null
          };
        } else if (lowerMessage.includes('order') || lowerMessage.includes('payment') || lowerMessage.includes('checkout')) {
          return {
            text: "Great question! MenuLove doesn't process payments directly. Instead, each dish can include a checkout button that connects to your existing ordering system, such as Square, Bopple or your website.\n\nThis allows customers to watch the dish and then go straight to checkout in one click. You keep full control of your payment system.",
            setContext: null
          };
        } else if (lowerMessage.includes('demo') || lowerMessage.includes('example') || lowerMessage.includes('live')) {
          return {
            text: "I'd love to show you! Let me scroll you to a live example where you can see how MenuLove works for real venues. You'll see the video menu in action and how customers interact with it.",
            action: () => {
              const heroSection = document.querySelector('h1');
              if (heroSection) {
                heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            },
            setContext: null
          };
        }
      }
    }
    
    // MEANING INTERPRETATION LAYER - Understand imperfect English and detect intention
    
    // Global availability / Country / Location questions
    if ((lowerMessage.includes('brazil') || lowerMessage.includes('country') || lowerMessage.includes('location') || 
         lowerMessage.includes('australia') || lowerMessage.includes('international') || lowerMessage.includes('global')) &&
        (lowerMessage.includes('possible') || lowerMessage.includes('can') || lowerMessage.includes('available') || 
         lowerMessage.includes('use') || lowerMessage.includes('get') || lowerMessage.includes('work'))) {
      return {
        text: "Yes — MenuLove can be used anywhere in the world! The platform works online, so restaurants, cafés and food businesses from different countries can use it to showcase their menus through video.\n\nAre you asking for a restaurant or café in Brazil (or another country)? I'd love to help you get started!",
        setContext: null
      };
    }
    
    // "Can I use in my country?" - imperfect grammar
    if ((lowerMessage.includes('my country') || lowerMessage.includes('in my country')) ||
        (lowerMessage.includes('use') && lowerMessage.includes('country'))) {
      return {
        text: "Yes! MenuLove is designed to work globally since it is a web-based platform. Businesses from different countries can create video menus and share them through QR codes or links.\n\nWhat country are you in? I can help you understand how MenuLove works for your location!",
        setContext: null
      };
    }
    
    // Language questions
    if (lowerMessage.includes('language') || lowerMessage.includes('english') || lowerMessage.includes('portuguese') || 
        lowerMessage.includes('spanish') || lowerMessage.includes('translate')) {
      return {
        text: "MenuLove works in any language! You can create your menu in Portuguese, English, Spanish, or any language your customers speak.\n\nYou control all the text - dish names, descriptions, and prices can be in your preferred language. The platform itself is currently in English, but your menu content is completely up to you!",
        setContext: null
      };
    }
    
    // CONTEXT-AWARE RESPONSES - Handle follow-up answers to clarification questions
    
    if (context === 'payment_clarification') {
      // User is answering the payment clarification question
      if (lowerMessage.includes('1') || lowerMessage.includes('subscription') || lowerMessage.includes('plan') || lowerMessage.includes('pricing')) {
        return {
          text: "I understand your question! There are two different payments:\n\n1️⃣ **Your MenuLove subscription**: You pay $39/month (after 30-day free trial) to use the platform.\n\n2️⃣ **Customer payments**: Your customers pay YOU directly through your existing system (Square, Bopple, etc). MenuLove doesn't take any commission from customer orders.\n\nSo you only pay the monthly subscription - that's it! No hidden fees, no commission on sales.",
          action: () => scrollToElement('signup-form'),
          setContext: null
        };
      } else if (lowerMessage.includes('2') || lowerMessage.includes('customer') || lowerMessage.includes('dish') || lowerMessage.includes('food')) {
        return {
          text: "Great question! MenuLove doesn't process payments directly. Instead, each dish can include a checkout button that connects to your existing ordering system, such as Square, Bopple or your website.\n\nThis allows customers to watch the dish and then go straight to checkout in one click. You keep full control of your payment system.",
          setContext: null
        };
      }
    }
    
    if (context === 'cost_clarification') {
      if (lowerMessage.includes('1') || lowerMessage.includes('subscription') || lowerMessage.includes('menulove')) {
        return {
          text: "We offer a 30-day free trial with no credit card required. After that, plans start at $39/month. You can cancel anytime - no contracts, no hidden fees.\n\nReady to try it out? I can scroll you to the signup form.",
          action: () => scrollToElement('signup-form'),
          setContext: null
        };
      } else if (lowerMessage.includes('2') || lowerMessage.includes('dish') || lowerMessage.includes('menu')) {
        return {
          text: "You can set any price you want for your dishes! When uploading a dish video, you simply add the name, description, and price. Your customers will see the price displayed on the video.\n\nYou have full control over your menu pricing!",
          setContext: null
        };
      }
    }
    
    if (context === 'how_clarification') {
      if (lowerMessage.includes('1') || lowerMessage.includes('owner') || lowerMessage.includes('restaurant')) {
        return {
          text: "MenuLove™ is a video-menu platform that helps restaurants showcase their dishes using short videos, similar to social media feeds. Customers can explore your dishes visually and then connect directly to your existing ordering system.\n\nIt's simple: customers watch → decide → order.\n\nWould you like to see how a café is using this today?",
          setContext: null
        };
      } else if (lowerMessage.includes('2') || lowerMessage.includes('customer') || lowerMessage.includes('user')) {
        return {
          text: "Customers simply scan your QR code or click your menu link. They'll see your dishes in a beautiful video feed - they can swipe through, watch videos, see prices, and click 'Order' to go straight to checkout.\n\nIt's just like browsing social media, but for food! Super easy and engaging.",
          setContext: null
        };
      }
    }
    
    // INTENT RECOGNITION LAYER - Detect ambiguous questions first
    
    // Ambiguous: "payment" without clear context
    if ((lowerMessage === 'payment' || lowerMessage === 'payment?' || lowerMessage === 'how about payment' || lowerMessage === 'how about payment?') ||
        (lowerMessage.includes('payment') && lowerMessage.split(' ').length <= 3 && 
         !lowerMessage.includes('customer') && !lowerMessage.includes('subscription') && 
         !lowerMessage.includes('plan') && !lowerMessage.includes('dish'))) {
      return {
        text: "Just to make sure I understand correctly — are you asking about:\n\n1️⃣ The MenuLove subscription plans and pricing?\n\nor\n\n2️⃣ How customers pay for food from the menu?\n\nLet me know and I'll explain!",
        setContext: 'payment_clarification'
      };
    }
    
    // Ambiguous: "cost" without context
    if ((lowerMessage === 'cost' || lowerMessage === 'cost?' || lowerMessage === 'price' || lowerMessage === 'price?') && 
        lowerMessage.split(' ').length <= 2) {
      return {
        text: "Are you asking about:\n\n1️⃣ MenuLove subscription pricing for your restaurant?\n\nor\n\n2️⃣ How to set prices for dishes on your menu?\n\nLet me know!",
        setContext: 'cost_clarification'
      };
    }
    
    // Ambiguous: "how it works" - could be platform or customer flow
    if (lowerMessage === 'how' || lowerMessage === 'how?' || lowerMessage === 'how does it work' || lowerMessage === 'how does it work?') {
      return {
        text: "I can explain! Would you like to know:\n\n1️⃣ How MenuLove works for restaurant owners?\n\nor\n\n2️⃣ How customers use the video menu?\n\nWhich one?",
        setContext: 'how_clarification'
      };
    }
    
    // How MenuLove works
    if ((lowerMessage.includes('how') && lowerMessage.includes('work')) || 
        (lowerMessage.includes('what') && (lowerMessage.includes('menulove') || lowerMessage.includes('menu love')))) {
      return {
        text: "MenuLove™ is a video-menu platform that helps restaurants showcase their dishes using short videos, similar to social media feeds. Customers can explore your dishes visually and then connect directly to your existing ordering system.\n\nIt's simple: customers watch → decide → order.\n\nWould you like to see how a café is using this today?"
      };
    }
    
    // CONTEXT: Subscription / Billing for restaurant owner
    if (lowerMessage.includes('subscription') || 
        lowerMessage.includes('billing') ||
        lowerMessage.includes('plan') ||
        lowerMessage.includes('trial') ||
        lowerMessage.includes('membership') ||
        lowerMessage.includes('upgrade') ||
        (lowerMessage.includes('pay') && (lowerMessage.includes('week') || lowerMessage.includes('month') || lowerMessage.includes('yearly'))) ||
        (lowerMessage.includes('my') && lowerMessage.includes('pay')) ||
        (lowerMessage.includes('i') && lowerMessage.includes('pay')) ||
        lowerMessage.includes('platform cost')) {
      return {
        text: "I understand your question! There are two different payments:\n\n1️⃣ **Your MenuLove subscription**: You pay $39/month (after 30-day free trial) to use the platform.\n\n2️⃣ **Customer payments**: Your customers pay YOU directly through your existing system (Square, Bopple, etc). MenuLove doesn't take any commission from customer orders.\n\nSo you only pay the monthly subscription - that's it! No hidden fees, no commission on sales.",
        action: () => scrollToElement('signup-form')
      };
    }
    
    // CONTEXT: Customer checkout / How customers pay for food
    if (lowerMessage.includes('customer') && (lowerMessage.includes('pay') || lowerMessage.includes('order')) ||
        lowerMessage.includes('checkout') ||
        lowerMessage.includes('ordering system') ||
        lowerMessage.includes('square') ||
        lowerMessage.includes('bopple') ||
        (lowerMessage.includes('dish') && lowerMessage.includes('pay'))) {
      return {
        text: "Great question! MenuLove doesn't process payments directly. Instead, each dish can include a checkout button that connects to your existing ordering system, such as Square, Bopple or your website.\n\nThis allows customers to watch the dish and then go straight to checkout in one click. You keep full control of your payment system."
      };
    }
    
    // Pricing / Cost
    if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('pricing') || lowerMessage.includes('much')) {
      return {
        text: "We offer a 30-day free trial with no credit card required. After that, plans start at $39/month. You can cancel anytime - no contracts, no hidden fees.\n\nReady to try it out? I can scroll you to the signup form.",
        action: () => scrollToElement('signup-form')
      };
    }
    
    // Free trial
    if (lowerMessage.includes('trial') || lowerMessage.includes('free')) {
      return {
        text: "Yes! We offer a full 30-day free trial - no credit card required. You get access to all features: unlimited video uploads, QR codes, analytics, and direct ordering links.\n\nWould you like to get started?",
        action: () => scrollToElement('signup-form')
      };
    }
    
    // See it live / Demo / Example
    if ((lowerMessage.includes('see') && lowerMessage.includes('live')) || 
        lowerMessage.includes('demo') || 
        lowerMessage.includes('example') ||
        lowerMessage.includes('show me')) {
      return {
        text: "I'd love to show you! Let me scroll you to a live example where you can see how MenuLove works for real venues. You'll see the video menu in action and how customers interact with it.",
        action: () => {
          const heroSection = document.querySelector('h1');
          if (heroSection) {
            heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      };
    }
    
    // How to start / Sign up
    if (lowerMessage.includes('start') || lowerMessage.includes('begin') || lowerMessage.includes('sign up') || lowerMessage.includes('create') || lowerMessage.includes('register') || lowerMessage.includes('join')) {
      return {
        text: "Getting started is super easy! Let me scroll you to the signup form. Just add your venue details and you'll be creating your video menu in minutes.\n\nThe whole process takes about 10 minutes, and you can start uploading dish videos right away.",
        action: () => scrollToElement('signup-form')
      };
    }
    
    // Videos/Upload/Content creation
    if (lowerMessage.includes('video') || lowerMessage.includes('upload') || lowerMessage.includes('photo') || 
        lowerMessage.includes('content') || lowerMessage.includes('what to film') || lowerMessage.includes('what kind of')) {
      return {
        text: "You can upload short videos of your dishes (15-60 seconds work best) or high-quality photos. Just film your dishes on your phone, upload them to your dashboard, add names, prices, and optional checkout links.\n\n**Content tips:**\n• Film in good lighting (natural light works great)\n• Show the dish from different angles\n• Capture preparation moments or plating\n• Keep videos short and engaging\n• Focus on your best sellers and specials\n\nWould you like to see a live example of how venues showcase their dishes?"
      };
    }
    
    // Onboarding / How to start / Setup process
    if (lowerMessage.includes('onboard') || lowerMessage.includes('setup') || 
        (lowerMessage.includes('how') && (lowerMessage.includes('start') || lowerMessage.includes('begin') || lowerMessage.includes('create')))) {
      return {
        text: "Getting started with MenuLove is simple! Here's the process:\n\n**Step 1:** Sign up and create your venue profile\n**Step 2:** Upload short videos of your dishes (film on your phone)\n**Step 3:** Add dish names, descriptions, and prices\n**Step 4:** Get your unique QR code\n**Step 5:** (Optional) Link your ordering system (Square, Bopple, etc)\n**Step 6:** Share your menu with customers!\n\nThe whole process takes about 10-15 minutes. Ready to get started? I can scroll you to the signup form!",
        action: () => scrollToElement('signup-form')
      };
    }
    
    // QR Code
    if (lowerMessage.includes('qr') || lowerMessage.includes('code')) {
      return {
        text: "Every venue gets a unique QR code that customers can scan to view your video menu. You can download it from your dashboard and print it for tables, windows, or anywhere you like.\n\nCustomers can also share your menu link on social media!"
      };
    }
    
    // Connect existing system
    if (lowerMessage.includes('connect') || lowerMessage.includes('integrate') || lowerMessage.includes('square') || lowerMessage.includes('bopple')) {
      return {
        text: "Yes! MenuLove connects seamlessly with your existing ordering system. Whether you use Square, Bopple, or your own website checkout, you can add a direct link to each dish.\n\nCustomers watch your dish video and click straight through to order. You maintain full control of your payment system."
      };
    }
    
    // Benefits / Why / Features
    if (lowerMessage.includes('benefit') || lowerMessage.includes('why') || lowerMessage.includes('feature')) {
      return {
        text: "MenuLove helps you:\n\n• Increase customer engagement with visual menus\n• Help customers decide faster\n• Promote dishes more effectively\n• Modernize traditional menus\n• Connect social-style discovery with real ordering\n\nPlus you get QR codes, analytics, and direct ordering links. Want to see all features?",
        action: () => {
          const featuresSection = document.querySelector('h2');
          if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      };
    }
    
    // What type of venue
    if (lowerMessage.includes('café') || lowerMessage.includes('cafe') || lowerMessage.includes('restaurant') || lowerMessage.includes('food truck') || lowerMessage.includes('venue')) {
      return {
        text: "MenuLove works great for cafés, restaurants, food trucks, dessert shops, market vendors, and all hospitality venues!\n\nWhat type of venue do you run? I can show you specific examples for your business type."
      };
    }
    
    // App or website
    if (lowerMessage.includes('app') || lowerMessage.includes('website') || lowerMessage.includes('platform')) {
      return {
        text: "MenuLove is a web-based platform - no app download needed! Your video menu works perfectly on any device through a simple web link or QR code.\n\nCustomers just scan your QR code or click your link, and they're instantly browsing your dishes. Simple and fast!"
      };
    }
    
    // Help/Support/Contact
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('contact') || lowerMessage.includes('talk') || lowerMessage.includes('speak') || lowerMessage.includes('email')) {
      setShowEmailCapture(true);
      return {
        text: "I'm here to help! You can ask me anything about MenuLove.\n\nIf you'd like the team to reach out to you directly, feel free to leave your email below and we'll get back to you within 24 hours.\n\nWhat would you like to know?"
      };
    }
    
    // Greeting
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon)$/)) {
      return {
        text: "Hi there! I'm LoveBot, your MenuLove assistant. I'm here to help you understand how MenuLove can transform your menu into an engaging video experience.\n\nWhat type of venue do you run? (café, restaurant, food truck, bar, etc.) I can show you specific examples for your business!"
      };
    }
    
    // Meeting / Demo / Partnership request
    if (lowerMessage.includes('meeting') || lowerMessage.includes('call') || lowerMessage.includes('talk to team') || 
        lowerMessage.includes('partnership') || lowerMessage.includes('speak to someone')) {
      return {
        text: "I can also connect you with the MenuLove team if you'd like a quick demo or personal walkthrough!\n\nYou can email us at contact@menulove.com.au and we'll set up a time to show you the platform in detail.\n\nIn the meantime, is there anything else I can help you understand about MenuLove?"
      };
    }
    
    // Video menu education - when user doesn't understand concept
    if (lowerMessage.includes('what is video menu') || lowerMessage.includes('video menu') || 
        (lowerMessage.includes('understand') && lowerMessage.includes('concept'))) {
      return {
        text: "Great question! A video menu is a modern way to showcase your dishes.\n\nInstead of static photos or text descriptions, MenuLove allows venues to showcase dishes through short videos (like social media feeds). Customers can swipe through videos of your food, see dishes being prepared or plated, and get a much better sense of what they're ordering.\n\nIt creates a more visual and engaging menu experience - customers can literally see the food in motion before they order!\n\nWould you like to see a live example?"
      };
    }
    
    // Proactive guidance when user seems unsure
    if (lowerMessage.includes('not sure') || lowerMessage.includes('unsure') || lowerMessage.includes('confused') || 
        lowerMessage === 'idk' || lowerMessage === 'i don\'t know') {
      return {
        text: "No worries! Let me help you explore MenuLove.\n\nI can quickly explain:\n\n**For venue owners:**\nHow MenuLove helps you showcase your dishes through video and increase customer engagement\n\n**For curious visitors:**\nHow the video menu experience works and why it's better than traditional menus\n\nWhich one sounds more relevant to you?"
      };
    }
    
    // Default friendly response with proactive guidance
    return {
      text: "That's a great question! I'm here to help you understand MenuLove.\n\nIf you'd like, I can quickly explain how MenuLove works for cafés and restaurants - it only takes a minute!\n\nOr I can answer specific questions about:\n• Pricing & free trial\n• How customers pay\n• Getting started\n• Live examples\n\nWhat would be most helpful for you?"
    };
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

    // Save user message to database immediately
    await saveMessageToDatabase(userMessage);

    // HUMAN AGENT CONTROL LAYER - Check conversation mode
    if (conversationMode === 'HUMAN_MODE') {
      console.log('[LoveBot] HUMAN_MODE active - AI auto-reply paused. Waiting for human agent.');
      setIsLoading(false);
      return; // Do not send AI response - human agent is handling conversation
    }

    try {
      // AI_MODE - Use smart pattern-matching responses with context awareness and conversation memory
      const response = getSmartFallbackResponse(inputMessage, lastQuestionContext, lastAssistantMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      
      // Save bot message to database
      saveMessageToDatabase(botMessage);
      
      // Save this assistant message for context in next user reply
      setLastAssistantMessage(response.text);
      
      // Update context if response sets a new context
      if (response.setContext !== undefined) {
        setLastQuestionContext(response.setContext);
      }
      
      // Execute action if present (scroll, highlight, etc)
      if (response.action) {
        setTimeout(() => {
          response.action!();
        }, 500); // Small delay for better UX
      }
    } catch (error) {
      console.error('[LoveBot] Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm here to help! Ask me about MenuLove pricing, features, or how to get started.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessageToDatabase(errorMessage);
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
                {conversationStatus === 'human_takeover' ? (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <p className="text-white/90 text-xs font-medium">🟢 {agentName} (Live Agent)</p>
                  </div>
                ) : (
                  <p className="text-white/80 text-xs">MenuLove Assistant</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-white/80 hover:text-white transition-colors p-2"
                title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
              >
                {soundEnabled ? '🔔' : '🔕'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
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
                  {/* Show attachment if message has one */}
                  {(message as any).attachment_url && (
                    <div className="mt-2">
                      {(message as any).attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img 
                          src={(message as any).attachment_url} 
                          alt="Attachment" 
                          className="max-w-full rounded-lg"
                          style={{ maxHeight: '200px' }}
                        />
                      ) : (
                        <a 
                          href={(message as any).attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-xs"
                        >
                          📎 View attachment
                        </a>
                      )}
                    </div>
                  )}
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
          <div className="bg-white border-t border-zinc-200">
            {/* Email Banner - Discrete */}
            <div className="px-4 pt-2 pb-2 bg-zinc-50 border-b border-zinc-200">
              {!showEmailInput ? (
                <button
                  onClick={() => setShowEmailInput(true)}
                  className="w-full text-left text-xs text-zinc-400 hover:text-zinc-600 transition-colors py-1"
                >
                  Click here to leave your email for follow-up
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (userEmail.trim() && sessionId) {
                        try {
                          await supabase
                            .from('chat_conversations')
                            .update({
                              user_info: {
                                email: userEmail,
                                email_captured_at: new Date().toISOString()
                              }
                            })
                            .eq('session_id', sessionId);
                          
                          const confirmMsg: Message = {
                            id: Date.now().toString(),
                            role: 'assistant',
                            content: "✅ Thanks! We'll reach out to you at " + userEmail + " within 24 hours.",
                            timestamp: new Date()
                          };
                          setMessages(prev => [...prev, confirmMsg]);
                          setUserEmail('');
                          setShowEmailInput(false);
                        } catch (error) {
                          console.error('[LoveBot] Error saving email:', error);
                        }
                      }
                    }}
                    disabled={!userEmail.trim()}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => {
                      setShowEmailInput(false);
                      setUserEmail('');
                    }}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-4">
            
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || isLoading}
                className="bg-zinc-100 text-zinc-700 p-2 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach file"
              >
                <Paperclip size={20} />
              </button>
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
        </div>
      )}

    </>
  );
};

export default LoveBotChat;
