import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, Users, Clock, TrendingUp, Bot, User, X, Send, ArrowRight, CheckCircle, XCircle, ArrowLeft, Paperclip, Image as ImageIcon } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  session_id: string;
  messages: Message[];
  status: 'bot_only' | 'human_takeover' | 'closed';
  user_info: any;
  keywords_detected: string[];
  is_lead: boolean;
  assigned_agent: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

const AGENTS = ['Helio'];

const AdminLiveChatV2: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [adminMessage, setAdminMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newConversationAlert, setNewConversationAlert] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8LJnHgU2jdXvzHkpBSh+zPDckTsKE1y06+qnVBIJRp/g8r5sIAUrgc7y2Yk2CBhkuezooVARCw==');
    audio.volume = 0.5;
    notificationSound.current = audio;
  }, []);

  // Load conversations
  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('[Admin] Error loading conversations:', error);
      setIsLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status === 'bot_only' || c.status === 'human_takeover').length,
    waiting: conversations.filter(c => c.status === 'bot_only' && c.messages.length > 1).length,
    leads: conversations.filter(c => c.is_lead).length,
    humanTakeovers: conversations.filter(c => c.status === 'human_takeover').length
  };

  // Subscribe to realtime updates
  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel('admin_chat_updates_v2')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_conversations'
        },
        (payload: any) => {
          console.log('[Admin] New conversation detected!', payload);
          setNewConversationAlert(payload.new.session_id);
          if (soundEnabled && notificationSound.current) {
            console.log('[Admin] Playing notification sound for new conversation');
            notificationSound.current.play().catch((err) => console.error('[Admin] Sound error:', err));
          }
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations'
        },
        (payload: any) => {
          console.log('[Admin] Conversation updated:', payload);
          
          // Update selected conversation immediately if it matches
          if (selectedConversation && payload.new.session_id === selectedConversation.session_id) {
            console.log('[Admin] Updating selected conversation immediately');
            setSelectedConversation(payload.new);
          }
          
          // Play sound for new user messages
          if (soundEnabled && notificationSound.current && payload.new.messages) {
            const lastMessage = payload.new.messages[payload.new.messages.length - 1];
            if (lastMessage && lastMessage.role === 'user') {
              console.log('[Admin] Playing notification sound for user message');
              notificationSound.current.play().catch((err) => console.error('[Admin] Sound error:', err));
            }
          }
          
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, soundEnabled]);

  const refreshSelectedConversation = async () => {
    if (!selectedConversation) return;
    
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('session_id', selectedConversation.session_id)
      .single();
    
    if (data) {
      setSelectedConversation(data);
    }
  };

  // Take control (human takeover)
  const takeControl = async () => {
    if (!selectedConversation || !selectedAgent) {
      alert('Please select an agent first');
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          status: 'human_takeover',
          assigned_agent: selectedAgent
        })
        .eq('session_id', selectedConversation.session_id);

      if (error) throw error;
      await refreshSelectedConversation();
    } catch (error) {
      console.error('[Admin] Error taking control:', error);
    }
  };

  // Return to AI
  const returnToAI = async () => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          status: 'bot_only',
          assigned_agent: null
        })
        .eq('session_id', selectedConversation.session_id);

      if (error) throw error;
      await refreshSelectedConversation();
    } catch (error) {
      console.error('[Admin] Error returning to AI:', error);
    }
  };

  // Mark as lead
  const markAsLead = async () => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ is_lead: !selectedConversation.is_lead })
        .eq('session_id', selectedConversation.session_id);

      if (error) throw error;
      await refreshSelectedConversation();
    } catch (error) {
      console.error('[Admin] Error marking as lead:', error);
    }
  };

  // Close conversation
  const closeConversation = async () => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status: 'closed' })
        .eq('session_id', selectedConversation.session_id);

      if (error) throw error;
      setSelectedConversation(null);
      await loadConversations();
    } catch (error) {
      console.error('[Admin] Error closing conversation:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!adminMessage.trim() || !selectedConversation || !selectedAgent) return;

    try {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: `[${selectedAgent}]: ${adminMessage}`,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...selectedConversation.messages, newMessage];

      // Update local state immediately for instant UI feedback
      setSelectedConversation({
        ...selectedConversation,
        messages: updatedMessages,
        status: 'human_takeover',
        assigned_agent: selectedAgent
      });
      setAdminMessage('');

      // Then update database
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          messages: updatedMessages,
          last_message_at: new Date().toISOString(),
          status: 'human_takeover',
          assigned_agent: selectedAgent
        })
        .eq('session_id', selectedConversation.session_id);

      if (error) throw error;
    } catch (error) {
      console.error('[Admin] Error sending message:', error);
      // Revert on error
      await refreshSelectedConversation();
    }
  };

  // Get conversation status
  const getConversationStatus = (conv: Conversation) => {
    const lastMessageTime = new Date(conv.last_message_at).getTime();
    const now = Date.now();
    const timeDiff = now - lastMessageTime;
    const isRecent = timeDiff < 5 * 60 * 1000; // 5 minutes

    if (conv.status === 'closed') {
      return { label: 'CLOSED', color: 'bg-zinc-400', icon: '⚫' };
    }
    if (conv.status === 'human_takeover') {
      return { label: 'HUMAN', color: 'bg-blue-500', icon: '👤' };
    }
    if (isRecent && conv.messages.length > 1) {
      return { label: 'LIVE', color: 'bg-green-500', icon: '🟢' };
    }
    if (conv.messages.length > 1) {
      return { label: 'WAITING', color: 'bg-yellow-500', icon: '🟡' };
    }
    return { label: 'AI', color: 'bg-purple-500', icon: '🤖' };
  };

  // Get venue type from keywords
  const getVenueType = (conv: Conversation) => {
    const keywords = conv.keywords_detected || [];
    if (keywords.includes('cafe')) return '☕ Café';
    if (keywords.includes('restaurant')) return '🍽️ Restaurant';
    if (keywords.includes('food truck')) return '🚚 Food Truck';
    if (keywords.includes('bar')) return '🍺 Bar';
    return '🏪 Venue';
  };

  // Get last message preview
  const getLastMessagePreview = (conv: Conversation) => {
    if (conv.messages.length === 0) return 'No messages';
    const lastMsg = conv.messages[conv.messages.length - 1];
    return lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '');
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingFile(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedConversation.session_id}_${Date.now()}.${fileExt}`;
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
        session_id: selectedConversation.session_id,
        message_id: messageId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: filePath,
        public_url: urlData.publicUrl,
        uploaded_by: 'agent'
      });

      // Add message with attachment
      const newMessage = {
        id: messageId,
        role: 'assistant',
        content: `[${selectedAgent}]: 📎 Sent an attachment: ${file.name}`,
        timestamp: new Date().toISOString(),
        attachment_url: urlData.publicUrl
      };

      const updatedMessages = [...selectedConversation.messages, newMessage];

      await supabase
        .from('chat_conversations')
        .update({
          messages: updatedMessages,
          last_message_at: new Date().toISOString(),
          status: 'human_takeover',
          assigned_agent: selectedAgent
        })
        .eq('session_id', selectedConversation.session_id);

      await refreshSelectedConversation();
      
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('[Admin] Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Get visitor name
  const getVisitorName = (conv: Conversation) => {
    // Try to get name from user_info first
    if (conv.user_info?.name) return conv.user_info.name;
    if (conv.user_info?.email) return conv.user_info.email.split('@')[0];
    // Fallback to generating a friendly visitor ID
    const timestamp = conv.session_id.split('_')[1];
    return `Visitor ${timestamp ? timestamp.slice(-4) : 'Unknown'}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-8 py-6 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => window.location.href = '/admin'}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft size={24} className="text-zinc-600" />
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Live Chat Monitor</h1>
                <p className="text-sm text-zinc-600">Real-time customer conversations</p>
              </div>
            </div>
            
            {/* Agent Selection */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-zinc-700">Select Agent:</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">Choose agent...</option>
                {AGENTS.map(agent => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-xl"
                title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
              >
                {soundEnabled ? '🔔' : '🔕'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Users Banner */}
      {conversations.filter(c => {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        const lastMessageTime = new Date(c.last_message_at).getTime();
        return c.messages.length > 1 && lastMessageTime > fiveMinutesAgo && (c.status === 'bot_only' || c.status === 'human_takeover');
      }).length > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping"></div>
              </div>
              <p className="text-white font-semibold">
                👥 {conversations.filter(c => {
                  const now = Date.now();
                  const fiveMinutesAgo = now - (5 * 60 * 1000);
                  const lastMessageTime = new Date(c.last_message_at).getTime();
                  return c.messages.length > 1 && lastMessageTime > fiveMinutesAgo && (c.status === 'bot_only' || c.status === 'human_takeover');
                }).length} User{conversations.filter(c => {
                  const now = Date.now();
                  const fiveMinutesAgo = now - (5 * 60 * 1000);
                  const lastMessageTime = new Date(c.last_message_at).getTime();
                  return c.messages.length > 1 && lastMessageTime > fiveMinutesAgo && (c.status === 'bot_only' || c.status === 'human_takeover');
                }).length !== 1 ? 's' : ''} Online in Live Chat
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-500" />
            <span className="text-sm font-medium text-zinc-700">Total: <span className="text-zinc-900 font-bold">{stats.total}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-zinc-700">Active: <span className="text-zinc-900 font-bold">{stats.active}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-yellow-500" />
            <span className="text-sm font-medium text-zinc-700">Waiting: <span className="text-zinc-900 font-bold">{stats.waiting}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-red-500" />
            <span className="text-sm font-medium text-zinc-700">Leads: <span className="text-zinc-900 font-bold">{stats.leads}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-purple-500" />
            <span className="text-sm font-medium text-zinc-700">Human: <span className="text-zinc-900 font-bold">{stats.humanTakeovers}</span></span>
          </div>
        </div>
      </div>

      {/* 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1 - Conversations List */}
        <div className="w-80 bg-white border-r border-zinc-200 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-200 flex-shrink-0">
            <h2 className="font-semibold text-zinc-900">Conversations</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <MessageCircle size={48} className="mx-auto mb-3 text-zinc-300" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map(conv => {
                const status = getConversationStatus(conv);
                const venueType = getVenueType(conv);
                const lastMessage = getLastMessagePreview(conv);
                const time = formatTime(conv.last_message_at);
                const visitorName = getVisitorName(conv);
                const isSelected = selectedConversation?.session_id === conv.session_id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 border-b border-zinc-100 cursor-pointer transition-colors ${
                      isSelected ? 'bg-orange-50 border-l-4 border-l-orange-500' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                        {conv.is_lead && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            🔥 LEAD
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">{time}</span>
                    </div>
                    
                    <div className="font-medium text-zinc-900 mb-1">{visitorName}</div>
                    <div className="text-sm text-zinc-600 mb-2">{venueType}</div>
                    <div className="text-sm text-zinc-500 truncate">{lastMessage}</div>
                    
                    {conv.keywords_detected && conv.keywords_detected.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {conv.keywords_detected.slice(0, 3).map(keyword => (
                          <span key={keyword} className="px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-600">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2 - Chat Window */}
        <div className="flex-1 flex flex-col bg-white">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <MessageCircle size={64} className="mx-auto mb-4 text-zinc-300" />
                <p className="text-lg">Select a conversation to view</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-zinc-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-zinc-900">{getVisitorName(selectedConversation)}</h2>
                      <span className="text-sm text-zinc-600">{getVenueType(selectedConversation)}</span>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                        <div className="relative">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                        </div>
                        <span className="text-sm font-medium text-green-700">Online Now</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-600">
                        Mode: <span className="font-semibold">{selectedConversation.status === 'human_takeover' ? '👤 HUMAN' : '🤖 AI'}</span>
                      </span>
                      {selectedConversation.assigned_agent && (
                        <span className="text-sm text-zinc-600">
                          • Agent: <span className="font-semibold">{selectedConversation.assigned_agent}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {selectedConversation.status === 'bot_only' ? (
                      <button
                        onClick={takeControl}
                        disabled={!selectedAgent}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <User size={16} />
                        Take Control
                      </button>
                    ) : (
                      <button
                        onClick={returnToAI}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                      >
                        <Bot size={16} />
                        Return to AI
                      </button>
                    )}
                    
                    <button
                      onClick={markAsLead}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        selectedConversation.is_lead
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {selectedConversation.is_lead ? <CheckCircle size={16} /> : <TrendingUp size={16} />}
                      {selectedConversation.is_lead ? 'Lead' : 'Mark as Lead'}
                    </button>
                    
                    <button
                      onClick={closeConversation}
                      className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2"
                    >
                      <XCircle size={16} />
                      Close
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4" id="messages-container">
                {selectedConversation.messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const isAgent = msg.content.includes('[') && msg.content.includes(']:');
                  const isAI = !isUser && !isAgent;

                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md ${isUser ? 'ml-12' : 'mr-12'}`}>
                        {!isUser && (
                          <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                            {isAgent ? '👤 Agent' : '🤖 AI'}
                          </div>
                        )}
                        <div
                          className={`px-4 py-3 rounded-lg ${
                            isUser
                              ? 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                              : isAgent
                              ? 'bg-blue-50 text-blue-900 border border-blue-100'
                              : 'bg-zinc-50 text-zinc-700 border border-zinc-100'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          {/* Show attachment if message has one */}
                          {(msg as any).attachment_url && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-zinc-200">
                              <img 
                                src={(msg as any).attachment_url} 
                                alt="Attachment" 
                                className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxHeight: '150px' }}
                                onClick={() => setExpandedImage((msg as any).attachment_url)}
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-6 py-4 border-t border-zinc-200 flex-shrink-0">
                {selectedConversation.status === 'human_takeover' ? (
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
                      disabled={uploadingFile}
                      className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                      title="Attach file"
                    >
                      <Paperclip size={20} />
                    </button>
                    <input
                      type="text"
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!adminMessage.trim()}
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send size={18} />
                      Send
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700">🤖 AI is currently handling this conversation. Click "Take Control" to respond.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* COLUMN 3 - Visitor Context Panel */}
        <div className="w-80 bg-zinc-50 border-l border-zinc-200 flex flex-col overflow-y-auto">
          {!selectedConversation ? (
            <div className="p-8 text-center text-zinc-400">
              <Users size={48} className="mx-auto mb-3 text-zinc-300" />
              <p>Select a conversation to view visitor details</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Visitor Profile */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-zinc-900 mb-3">Visitor Profile</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Name:</span>
                    <span className="font-medium text-zinc-900">{getVisitorName(selectedConversation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Venue:</span>
                    <span className="font-medium text-zinc-900">{getVenueType(selectedConversation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Location:</span>
                    <span className="font-medium text-zinc-900">
                      {selectedConversation.user_info?.location || selectedConversation.user_info?.city || selectedConversation.user_info?.region || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Device:</span>
                    <span className="font-medium text-zinc-900">
                      {selectedConversation.user_info?.userAgent?.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Language:</span>
                    <span className="font-medium text-zinc-900">{selectedConversation.user_info?.language || 'en'}</span>
                  </div>
                </div>
              </div>

              {/* Conversation Insights */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-zinc-900 mb-3">Conversation Insights</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Messages:</span>
                    <span className="font-medium text-zinc-900">{selectedConversation.messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Lead Score:</span>
                    <span className={`font-medium ${selectedConversation.is_lead ? 'text-red-600' : 'text-zinc-900'}`}>
                      {selectedConversation.is_lead ? '🔥 High' : 'Low'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Status:</span>
                    <span className="font-medium text-zinc-900">
                      {selectedConversation.status === 'human_takeover' ? '👤 Human' : '🤖 AI'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Duration:</span>
                    <span className="font-medium text-zinc-900">
                      {Math.round((new Date(selectedConversation.updated_at).getTime() - new Date(selectedConversation.created_at).getTime()) / 60000)} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Keywords Detected */}
              {selectedConversation.keywords_detected && selectedConversation.keywords_detected.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-zinc-900 mb-3">Keywords Detected</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedConversation.keywords_detected.map(keyword => (
                      <span key={keyword} className="px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-700 font-medium">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-zinc-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium">
                    📧 Send Email
                  </button>
                  <button className="w-full px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium">
                    📅 Schedule Call
                  </button>
                  <button className="w-full px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium">
                    📝 Add Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Expansion Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300 transition-colors"
          >
            <X size={32} />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded attachment" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default AdminLiveChatV2;
