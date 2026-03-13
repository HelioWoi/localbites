import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, Users, TrendingUp, X, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  session_id: string;
  messages: ChatMessage[];
  status: 'bot_only' | 'human_takeover' | 'closed';
  user_info: any;
  keywords_detected: string[];
  is_lead: boolean;
  assigned_agent: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

const AdminLiveChat: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [agentName, setAgentName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newConversationAlert, setNewConversationAlert] = useState<string | null>(null);
  const previousConversationCount = React.useRef<number>(0);

  // Load conversations
  useEffect(() => {
    loadConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin_chat_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_conversations'
        },
        (payload: any) => {
          console.log('[Admin] New conversation detected!', payload);
          
          // Show notification
          setNewConversationAlert(payload.new.session_id);
          
          // Play notification sound
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8LJnHgU2jdXvzHkpBSh+zPDckTsKE1y06+qnVBIJRp/g8r5sIAUrgc7y2Yk2CBhkuezooVARCw==');
          audio.play().catch(() => {});
          
          // Clear notification after 5 seconds
          setTimeout(() => setNewConversationAlert(null), 5000);
          
          // Reload conversations
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
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinConversation = async (conversation: Conversation) => {
    if (!agentName.trim()) {
      alert('Please enter your name first!');
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          status: 'human_takeover',
          assigned_agent: agentName
        })
        .eq('id', conversation.id);

      if (error) throw error;

      setSelectedConversation({ ...conversation, status: 'human_takeover', assigned_agent: agentName });
      
      // Play notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8LJnHgU2jdXvzHkpBSh+zPDckTsKE1y06+qnVBIJRp/g8r5sIAUrgc7y2Yk2CBhkuezooVARCw==');
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Error joining conversation:', error);
    }
  };

  const sendAdminMessage = async () => {
    if (!selectedConversation || !adminMessage.trim()) return;

    try {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `[${agentName}]: ${adminMessage}`,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...selectedConversation.messages, newMessage];

      const { error } = await supabase
        .from('chat_conversations')
        .update({
          messages: updatedMessages,
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

      if (error) throw error;

      setSelectedConversation({
        ...selectedConversation,
        messages: updatedMessages
      });
      setAdminMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const closeConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status: 'closed' })
        .eq('id', conversationId);

      if (error) throw error;
      setSelectedConversation(null);
    } catch (error) {
      console.error('Error closing conversation:', error);
    }
  };

  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status === 'bot_only').length,
    leads: conversations.filter(c => c.is_lead).length,
    humanTakeover: conversations.filter(c => c.status === 'human_takeover').length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-zinc-900">Live Chat Monitor</h1>
          <p className="text-sm text-zinc-600">Real-time customer conversations</p>
        </div>
      </div>

      {/* New Conversation Alert */}
      {newConversationAlert && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
              <p className="text-white font-semibold">🔔 New visitor started a conversation!</p>
            </div>
            <button
              onClick={() => setNewConversationAlert(null)}
              className="text-white hover:text-zinc-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-zinc-200">
            <div className="flex items-center gap-3">
              <MessageCircle className="text-blue-500" size={24} />
              <div>
                <p className="text-sm text-zinc-600">Total Chats</p>
                <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-zinc-200">
            <div className="flex items-center gap-3">
              <Users className="text-green-500" size={24} />
              <div>
                <p className="text-sm text-zinc-600">Active</p>
                <p className="text-2xl font-bold text-zinc-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-zinc-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-orange-500" size={24} />
              <div>
                <p className="text-sm text-zinc-600">Leads</p>
                <p className="text-2xl font-bold text-zinc-900">{stats.leads}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-zinc-200">
            <div className="flex items-center gap-3">
              <MessageCircle className="text-purple-500" size={24} />
              <div>
                <p className="text-sm text-zinc-600">Human Takeover</p>
                <p className="text-2xl font-bold text-zinc-900">{stats.humanTakeover}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Name Input */}
        {!agentName && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-900 font-medium mb-2">Enter your name to join conversations:</p>
            <input
              type="text"
              placeholder="Your name (e.g., John Smith)"
              className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setAgentName((e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
        )}

        {agentName && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-green-900">Logged in as: <strong>{agentName}</strong></p>
          </div>
        )}

        {/* Conversations Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="col-span-1 bg-white rounded-lg border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50">
              <h2 className="font-semibold text-zinc-900">Conversations</h2>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        Session {conv.session_id.slice(-8)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(conv.last_message_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {conv.is_lead && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                        🔥 LEAD
                      </span>
                    )}
                  </div>
                  {conv.status === 'human_takeover' && (
                    <p className="text-xs text-green-600 font-medium">🟢 {conv.assigned_agent}</p>
                  )}
                  {conv.keywords_detected.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {conv.keywords_detected.slice(0, 3).map((keyword, i) => (
                        <span key={i} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="col-span-2 bg-white rounded-lg border border-zinc-200 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-900">
                      Session {selectedConversation.session_id.slice(-8)}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {selectedConversation.messages.length} messages
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.status === 'bot_only' && agentName && (
                      <button
                        onClick={() => joinConversation(selectedConversation)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                      >
                        Join Conversation
                      </button>
                    )}
                    {selectedConversation.status === 'human_takeover' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                        🟢 Live
                      </span>
                    )}
                    <button
                      onClick={() => closeConversation(selectedConversation.id)}
                      className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-orange-500 text-white'
                            : 'bg-zinc-100 text-zinc-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-orange-100' : 'text-zinc-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Admin Input */}
                {selectedConversation.status === 'human_takeover' && (
                  <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={adminMessage}
                        onChange={(e) => setAdminMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendAdminMessage()}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        onClick={sendAdminMessage}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-400">
                <div className="text-center">
                  <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveChat;
