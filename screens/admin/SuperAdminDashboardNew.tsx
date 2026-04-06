import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, Video, DollarSign, TrendingUp, Search, Bell, LogOut,
  Home, FileText, Settings, BarChart3, Crown, Clock, CheckCircle,
  MoreVertical, TrendingDown, Activity, Menu, X, ShieldAlert, Trash2, Check,
  ChevronLeft, ChevronRight, UserPlus, MessageCircle, Link2, Banknote
} from 'lucide-react';
import SuperAdminAnalytics from './SuperAdminAnalytics';
import AffiliatesAdminTab from './AffiliatesAdminTab';
import ConfirmationModal from '../../components/ConfirmationModal';
import GoogleAnalyticsWidget from '../../components/GoogleAnalyticsWidget';
import { getOnlineVisitors } from '../../services/eventsService';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission,
  sendTestNotification 
} from '../../services/notificationService';
import { 
  sendVisitorAlertSMS, 
  sendTestSMS, 
  isValidPhoneNumber, 
  formatPhoneNumber 
} from '../../services/smsService';

interface Partner {
  id: string;
  restaurant_name: string;
  email: string;
  slug: string;
  created_at: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  subscription_status: 'trial' | 'active' | 'cancelled' | 'expired';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  total_videos: number;
  total_views: number;
  main_photo_url: string | null;
}

interface Metrics {
  totalPartners: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalVideos: number;
  totalViews: number;
  conversionRate: number;
  churnRate: number;
  restaurantesLocais: number;
}

interface TeamMember {
  id: string;
  email: string;
  phone_number: string | null;
  created_at: string;
  last_login: string | null;
  sms_notifications_enabled: boolean;
}

type TabType = 'overview' | 'partners' | 'revenue' | 'content' | 'analytics' | 'team' | 'chat' | 'affiliates';

interface SuperAdminDashboardNewProps {
  user: any;
  onLogout: () => void;
}

const SuperAdminDashboardNew: React.FC<SuperAdminDashboardNewProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalPartners: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalVideos: 0,
    totalViews: 0,
    conversionRate: 0,
    churnRate: 0,
    restaurantesLocais: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchResults, setSearchResults] = useState<Partner[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<number>(0);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newPartners, setNewPartners] = useState<Partner[]>([]);
  const [removalRequests, setRemovalRequests] = useState<any[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState(0);
  const [onlineVisitors, setOnlineVisitors] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [previousVisitorCount, setPreviousVisitorCount] = useState(0);
  const [activeChatsCount, setActiveChatsCount] = useState(0);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadNotifications();
    loadActivityLog();
    loadRemovalRequests();
    loadOnlineVisitors();
    loadActiveChats();
    loadTeamMembers();
    checkNotificationPermission();
  }, [activeTab]);

  // Auto-refresh online visitors and active chats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadOnlineVisitors();
      loadActiveChats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkNotificationPermission = () => {
    if (isNotificationSupported()) {
      const permission = getNotificationPermission();
      setNotificationsEnabled(permission.granted);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationsEnabled(true);
      await sendTestNotification();
      alert('Notifications enabled! You will receive alerts when visitors access the site.');
    } else {
      alert('Notification permission denied. Please enable it in your browser settings.');
    }
  };

  const handleSavePhoneNumber = async () => {
    const formatted = formatPhoneNumber(phoneNumber);
    
    if (!isValidPhoneNumber(formatted)) {
      alert('Invalid phone number. Use international format: +61412345678');
      return;
    }

    try {
      // Save phone number to database
      const { error } = await supabase
        .from('super_admins')
        .update({ 
          phone_number: formatted,
          sms_notifications_enabled: true 
        })
        .eq('email', user.email);

      if (error) throw error;

      setSmsNotificationsEnabled(true);
      setPhoneNumber(formatted);
      setShowPhoneInput(false);

      // Send test SMS
      const sent = await sendTestSMS(formatted);
      if (sent) {
        alert('✅ Test SMS sent! Check your phone.');
      } else {
        alert('⚠️ Number saved, but could not send test SMS. Check your Twilio credentials.');
      }
    } catch (error) {
      console.error('Error saving phone number:', error);
      alert('Error saving phone number.');
    }
  };

  const handleToggleSMS = async () => {
    if (!smsNotificationsEnabled) {
      setShowPhoneInput(true);
    } else {
      // Disable SMS notifications
      try {
        const { error } = await supabase
          .from('super_admins')
          .update({ sms_notifications_enabled: false })
          .eq('email', user.email);

        if (error) throw error;
        setSmsNotificationsEnabled(false);
        alert('SMS notifications disabled.');
      } catch (error) {
        console.error('Error disabling SMS:', error);
      }
    }
  };

  const loadActiveChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .in('status', ['bot_only', 'human_takeover']);

      if (error) throw error;
      
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      // Only count users CURRENTLY ACTIVE (last message within 5 minutes)
      const activeUsers = data?.filter(conv => {
        const messages = conv.messages || [];
        if (messages.length <= 1) return false; // Exclude welcome-only
        
        const lastMessageTime = new Date(conv.last_message_at).getTime();
        return lastMessageTime > fiveMinutesAgo; // Active in last 5 minutes
      }) || [];
      
      setActiveChatsCount(activeUsers.length);
    } catch (error) {
      console.error('Error loading active chats:', error);
    }
  };

  const loadOnlineVisitors = async () => {
    try {
      // Fetch from GA4 Edge Function for accurate real-time data
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ga4-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const result = await response.json();
        const count = result.data?.activeUsers || 0;
        
        // Send notifications if visitor count increased from 0
        if (count > 0 && previousVisitorCount === 0) {
          // Browser notification
          if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const registration = await navigator.serviceWorker.ready;
              await registration.showNotification('🔥 Visitor Alert', {
                body: `${count} visitor${count > 1 ? 's' : ''} online now!`,
                tag: 'visitor-alert',
                icon: '/menulove-logo.png',
              });
            } catch (error) {
              console.error('Error showing notification:', error);
            }
          }
          
          // SMS notification
          if (smsNotificationsEnabled && phoneNumber) {
            await sendVisitorAlertSMS(phoneNumber, count);
          }
        }
        
        setPreviousVisitorCount(count);
        setOnlineVisitors(count);
      } else {
        // Fallback to Supabase events if GA4 fails
        const count = await getOnlineVisitors();
        setOnlineVisitors(count);
      }
    } catch (error) {
      console.error('Error loading online visitors:', error);
      // Fallback to Supabase events on error
      try {
        const count = await getOnlineVisitors();
        setOnlineVisitors(count);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const filtered = partners.filter(p => 
        p.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [searchQuery, partners]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select(`
          *,
          menu_items(count)
        `)
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;

      const processedPartners: Partner[] = (partnersData || []).map((p: any) => ({
        id: p.id,
        restaurant_name: p.restaurant_name,
        email: p.email,
        slug: p.slug,
        created_at: p.created_at,
        trial_start_date: p.trial_start_date,
        trial_end_date: p.trial_end_date,
        subscription_status: getSubscriptionStatus(p),
        stripe_customer_id: p.stripe_customer_id,
        stripe_subscription_id: p.stripe_subscription_id,
        total_videos: p.menu_items?.[0]?.count || 0,
        total_views: 0,
        main_photo_url: p.main_photo_url,
      }));

      setPartners(processedPartners);

      const activeCount = processedPartners.filter(p => p.subscription_status === 'active').length;
      const trialCount = processedPartners.filter(p => p.subscription_status === 'trial').length;
      const totalVideos = processedPartners.reduce((sum, p) => sum + p.total_videos, 0);
      const monthlyRevenue = activeCount * 39;
      const totalRevenue = monthlyRevenue;
      const totalConverted = activeCount;
      const totalEligible = processedPartners.length;
      const conversionRate = totalEligible > 0 ? (totalConverted / totalEligible) * 100 : 0;
      const cancelledCount = processedPartners.filter(p => p.subscription_status === 'cancelled').length;
      const churnRate = (activeCount + cancelledCount) > 0 
        ? (cancelledCount / (activeCount + cancelledCount)) * 100 
        : 0;

      setMetrics({
        totalPartners: processedPartners.length,
        activeSubscriptions: activeCount,
        trialUsers: trialCount,
        totalRevenue,
        monthlyRevenue,
        totalVideos,
        totalViews: 0,
        conversionRate,
        churnRate,
        restaurantesLocais: 2,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionStatus = (partner: any): 'trial' | 'active' | 'cancelled' | 'expired' => {
    if (partner.stripe_subscription_id) {
      return 'active';
    }
    if (partner.trial_end_date) {
      const trialEnd = new Date(partner.trial_end_date);
      const now = new Date();
      if (now < trialEnd) {
        return 'trial';
      } else {
        return 'expired';
      }
    }
    return 'cancelled';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handle select all partners
  const handleSelectAll = () => {
    if (selectedPartners.size === partners.length) {
      setSelectedPartners(new Set());
    } else {
      setSelectedPartners(new Set(partners.map(p => p.id)));
    }
  };

  // Handle individual partner selection
  const handleSelectPartner = (partnerId: string) => {
    const newSelected = new Set(selectedPartners);
    if (newSelected.has(partnerId)) {
      newSelected.delete(partnerId);
    } else {
      newSelected.add(partnerId);
    }
    setSelectedPartners(newSelected);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Load notifications (count of new partners in last 7 days)
  const loadNotifications = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const processedNew = data.map((p: any) => ({
          id: p.id,
          restaurant_name: p.restaurant_name,
          email: p.email,
          slug: p.slug,
          created_at: p.created_at,
          trial_start_date: p.trial_start_date,
          trial_end_date: p.trial_end_date,
          subscription_status: getSubscriptionStatus(p),
          stripe_customer_id: p.stripe_customer_id,
          stripe_subscription_id: p.stripe_subscription_id,
          total_videos: 0,
          total_views: 0,
          main_photo_url: p.main_photo_url,
        }));
        setNewPartners(processedNew);
        setNotifications(data.length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Load removal requests
  const loadRemovalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('removal_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setRemovalRequests(data);
        setPendingRemovals(data.filter((r: any) => r.status === 'pending').length);
      }
    } catch (error) {
      console.error('Error loading removal requests:', error);
    }
  };

  // Load team members
  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('super_admins')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setTeamMembers(data);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  // Add team member
  const handleAddTeamMember = async () => {
    if (!newMemberEmail || !newMemberEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setIsAddingMember(true);
    try {
      const { data, error } = await supabase
        .from('super_admins')
        .insert([{
          email: newMemberEmail.toLowerCase().trim(),
          sms_notifications_enabled: false,
        }])
        .select();

      if (error) {
        console.error('Error adding team member:', error);
        if (error.code === '23505') {
          alert('This email is already registered as a team member');
        } else {
          alert(`Failed to add team member: ${error.message || 'Unknown error'}`);
        }
        setIsAddingMember(false);
        return;
      }

      // Send invitation email
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-team-invitation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: newMemberEmail.toLowerCase().trim(),
            invitedBy: currentUser?.email || 'Admin',
          }),
        });

        if (!emailResponse.ok) {
          console.error('Failed to send invitation email');
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
      }

      alert(`Team member added! An invitation email has been sent to: ${newMemberEmail}`);
      setNewMemberEmail('');
      loadTeamMembers();
    } catch (error: any) {
      console.error('Error adding team member:', error);
      alert(`Failed to add team member: ${error?.message || 'Please try again'}`);
    } finally {
      setIsAddingMember(false);
    }
  };

  // Resend password reset email
  const handleResendPassword = async (email: string) => {
    try {
      // Use production domain for password reset redirect
      const redirectUrl = window.location.hostname === 'localhost' 
        ? 'https://menulove.com.au/admin/reset-password'
        : `${window.location.origin}/admin/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      alert(`Password reset email sent to ${email}!\n\nThey will receive an email with instructions to set a new password.`);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      alert(`Failed to send password reset email: ${error?.message || 'Please try again'}`);
    }
  };

  // Remove team member
  const handleRemoveTeamMember = async (id: string, email: string) => {
    if (email === user.email) {
      alert('You cannot remove yourself from the team');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${email} from the team?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('super_admins')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Team member removed successfully');
      loadTeamMembers();
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Failed to remove team member. Please try again.');
    }
  };

  const handleRemovalAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const request = removalRequests.find(r => r.id === id);
      
      const { error } = await supabase
        .from('removal_requests')
        .update({ status: action, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      // If approved, add to blocked_places
      if (action === 'approved' && request?.google_place_id) {
        await supabase.from('blocked_places').insert({
          google_place_id: request.google_place_id,
          business_name: request.business_name,
          reason: 'Owner requested removal',
        });
      }
      
      // Reload
      loadRemovalRequests();
      alert(`Request ${action} successfully.`);
    } catch (error) {
      console.error('Error updating removal request:', error);
      alert('Error processing request.');
    }
  };

  // Load activity log (simple placeholder)
  const loadActivityLog = () => {
    // Placeholder: últimas ações do admin
    const mockActivity = [
      {
        id: '1',
        action: 'Confirmed on',
        email: user.email,
        time: '2 hours ago',
        type: 'confirmation'
      }
    ];
    setActivityLog(mockActivity);
  };

  // Confirm and delete partner
  const confirmDeletePartner = async () => {
    if (!partnerToDelete) return;
    setShowDeleteModal(false);
    await handleDeletePartner(partnerToDelete.id, partnerToDelete.name);
    setPartnerToDelete(null);
  };

  // Confirm and bulk delete partners - Complete deletion using Edge Function
  const confirmBulkDelete = async () => {
    setShowBulkDeleteModal(false);
    
    let successCount = 0;
    let failCount = 0;
    
    // Get current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    
    for (const partnerId of selectedPartners) {
      try {
        const partner = partners.find(p => p.id === partnerId);
        if (!partner) continue;

        console.log(`[Admin] Bulk deleting partner: ${partner.restaurant_name}`);

        // Call Edge Function for complete deletion with auth
        const { data, error } = await supabase.functions.invoke('delete-partner', {
          body: { partnerId },
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        });

        if (error || data?.error) {
          console.error(`Error deleting ${partner.restaurant_name}:`, error || data?.error);
          failCount++;
          continue;
        }

        console.log(`[Admin] Successfully deleted: ${partner.restaurant_name}`);
        successCount++;
      } catch (error) {
        console.error('Error in bulk delete:', error);
        failCount++;
      }
    }
    
    // Clear selection
    setSelectedPartners(new Set());
    
    // Show result
    if (failCount === 0) {
      alert(`✅ Successfully deleted ${successCount} partner${successCount > 1 ? 's' : ''} completely!\n\nAll data, files, and auth accounts removed.`);
    } else {
      alert(`⚠️ Deleted ${successCount} partner${successCount > 1 ? 's' : ''}. Failed to delete ${failCount}.`);
    }
    
    // Reload dashboard
    loadDashboardData();
  };

  // Delete partner - Complete deletion including auth account and storage files
  const handleDeletePartner = async (partnerId: string, restaurantName: string) => {
    try {
      console.log(`[Admin] Starting complete deletion for partner: ${partnerId}`);

      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call Edge Function for complete deletion with auth
      const { data, error } = await supabase.functions.invoke('delete-partner', {
        body: { partnerId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) {
        console.error('[Admin] Error calling delete-partner function:', error);
        alert('Failed to delete partner. Please try again.');
        return;
      }

      if (data?.error) {
        console.error('[Admin] Delete function returned error:', data.error);
        alert(`Failed to delete partner: ${data.error}`);
        return;
      }

      // Success - show detailed results
      const deleted = data?.deleted || {};
      console.log('[Admin] Deletion results:', deleted);
      
      alert(
        `✅ ${restaurantName} completely deleted!\n\n` +
        `• Menu items: ${deleted.menuItems || 0}\n` +
        `• Storage files: ${deleted.storageFiles ? 'Yes' : 'No'}\n` +
        `• Partner record: ${deleted.partnerRecord ? 'Yes' : 'No'}\n` +
        `• Auth account: ${deleted.authAccount ? 'Yes' : 'No'}`
      );
      
      loadDashboardData();
    } catch (error) {
      console.error('[Admin] Error deleting partner:', error);
      alert('Failed to delete partner. Please try again.');
    }
  };

  // Handle partner actions
  const handlePartnerAction = (partnerId: string, action: string) => {
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return;

    switch(action) {
      case 'view':
        // Impersonate partner and open their dashboard
        if (!confirm(`Edit ${partner.restaurant_name}'s menu?\n\nThis will open their Partner Dashboard in a new tab.`)) return;
        
        localStorage.setItem('admin_impersonate_partner_id', partner.id);
        localStorage.setItem('admin_impersonate_partner_email', partner.email);
        localStorage.setItem('admin_return_email', user?.email || 'admin');
        
        window.open('/partner?impersonate=true', '_blank');
        break;
      case 'stripe':
        if (partner.stripe_customer_id) {
          window.open(`https://dashboard.stripe.com/customers/${partner.stripe_customer_id}`, '_blank');
        } else {
          alert('No Stripe customer ID found');
        }
        break;
      case 'email':
        alert(`Email feature coming soon!\nWill send to: ${partner.email}`);
        break;
      case 'delete':
        setPartnerToDelete({ id: partner.id, name: partner.restaurant_name });
        setShowDeleteModal(true);
        break;
      case 'suspend':
        if (confirm(`Suspend ${partner.restaurant_name}?`)) {
          alert('Suspend feature coming soon!');
        }
        break;
      default:
        break;
    }
    setOpenActionMenu(null);
  };

  const MiniLineChart = ({ color }: { color: string }) => (
    <svg width="80" height="30" viewBox="0 0 80 30" fill="none">
      <path
        d="M0 25 L20 15 L40 20 L60 10 L80 15"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-zinc-200 flex flex-col transition-all duration-300 ${
        isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center w-full'}`}>
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
                alt="MenuLove" 
                className="w-10 h-10 rounded-xl flex-shrink-0 object-contain"
              />
              {isSidebarOpen && <span className="text-lg font-bold text-zinc-900 whitespace-nowrap">Super Admin</span>}
            </div>
            {/* Toggle Sidebar Button - Desktop only */}
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden lg:block p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>
        </div>
        
        {/* Expand Button - Only visible when collapsed */}
        {!isSidebarOpen && (
          <div className="hidden lg:flex justify-center p-4 border-b border-zinc-200">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: Home },
            { id: 'partners', label: 'Partners', icon: Crown },
            { id: 'revenue', label: 'Revenue', icon: DollarSign },
            { id: 'content', label: 'Content', icon: Video },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'team', label: 'Team', icon: UserPlus },
            { id: 'affiliates', label: 'Affiliates', icon: Link2 },
            { id: 'chat', label: 'Live Chat', icon: MessageCircle, badge: activeChatsCount },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'chat') {
                  window.location.href = '/admin/live-chat';
                } else {
                  setActiveTab(item.id as TabType);
                }
              }}
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-orange-500 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              } relative`}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon size={18} />
              {isSidebarOpen && item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === item.id ? 'bg-white text-green-500' : 'bg-green-500 text-white'
                } animate-pulse`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-zinc-200">
          <button
            onClick={onLogout}
            className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors`}
            title={!isSidebarOpen ? 'Logout' : ''}
          >
            <LogOut size={18} />
            {isSidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-white border-b border-zinc-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors mr-3"
            >
              <Menu size={24} />
            </button>
            
            <h1 className="text-xl lg:text-2xl font-bold text-zinc-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>

            <div className="flex items-center gap-4">
              {/* Search - Hidden on mobile */}
              <div className="relative hidden md:block">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search for restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length > 2 && setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  className="pl-10 pr-4 py-2 w-60 lg:w-80 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          window.open(`/r/${result.slug}`, '_blank');
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="w-full px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-left border-b border-zinc-100 last:border-0"
                      >
                        {result.main_photo_url ? (
                          <img src={result.main_photo_url} alt={result.restaurant_name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{getInitials(result.restaurant_name)}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm text-zinc-900">{result.restaurant_name}</p>
                          <p className="text-xs text-zinc-500">{result.email}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          result.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                          result.subscription_status === 'trial' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {result.subscription_status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {showSearchResults && searchResults.length === 0 && searchQuery.length > 2 && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-zinc-200 rounded-lg shadow-lg p-4 z-50">
                    <p className="text-sm text-zinc-500 text-center">No results found</p>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-lg transition-colors ${
                    notificationsEnabled 
                      ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                  title={notificationsEnabled ? 'Notificações ativadas' : `${notifications} new partners in last 7 days`}
                >
                  <Bell size={20} fill={notificationsEnabled ? 'currentColor' : 'none'} />
                  {(notifications > 0 || pendingRemovals > 0) && (
                    <>
                      <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {notifications + pendingRemovals}
                      </span>
                    </>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-zinc-200">
                      <h3 className="font-bold text-zinc-900">Notifications</h3>
                      <p className="text-xs text-zinc-500 mt-1">{notifications} new partners · {pendingRemovals} removal requests</p>
                      
                      {/* Visitor Notifications Toggle */}
                      {isNotificationSupported() && (
                        <button
                          onClick={handleEnableNotifications}
                          className={`w-full mt-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                            notificationsEnabled
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Bell size={14} fill={notificationsEnabled ? 'currentColor' : 'none'} />
                            Browser Alerts
                          </span>
                          <span className="text-xs">
                            {notificationsEnabled ? 'ON' : 'OFF'}
                          </span>
                        </button>
                      )}
                      
                      {/* SMS Notifications Toggle */}
                      <button
                        onClick={handleToggleSMS}
                        className={`w-full mt-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                          smsNotificationsEnabled
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          📱 SMS Alerts
                        </span>
                        <span className="text-xs">
                          {smsNotificationsEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                      
                      {/* Phone Number Input */}
                      {showPhoneInput && (
                        <div className="mt-2 p-3 bg-zinc-50 rounded-lg">
                          <label className="text-xs font-medium text-zinc-700 block mb-2">
                            Phone Number (format: +61412345678)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="+61412345678"
                              className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={handleSavePhoneNumber}
                              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
                            >
                              Save
                            </button>
                          </div>
                          <p className="text-xs text-zinc-500 mt-2">
                            You will receive a test SMS after saving
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Pending Removal Requests */}
                    {removalRequests.filter(r => r.status === 'pending').length > 0 && (
                      <div className="border-b border-zinc-200">
                        <div className="px-4 py-2 bg-red-50">
                          <p className="text-xs font-bold text-red-600 flex items-center gap-1"><ShieldAlert size={12} /> Removal Requests</p>
                        </div>
                        {removalRequests.filter(r => r.status === 'pending').map((req) => (
                          <div key={req.id} className="p-4 hover:bg-zinc-50 border-b border-zinc-100">
                            <p className="font-medium text-sm text-zinc-900">{req.business_name}</p>
                            <p className="text-xs text-zinc-500">ABN: {req.abn} · {req.contact_email}</p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleRemovalAction(req.id, 'approved')} className="px-2 py-1 bg-red-500 text-white text-xs rounded-md flex items-center gap-1"><Check size={10} /> Approve</button>
                              <button onClick={() => handleRemovalAction(req.id, 'rejected')} className="px-2 py-1 bg-zinc-200 text-zinc-700 text-xs rounded-md">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {newPartners.length > 0 ? (
                      <div className="divide-y divide-zinc-100">
                        {newPartners.map((partner) => (
                          <div key={partner.id} className="p-4 hover:bg-zinc-50">
                            <div className="flex items-start gap-3">
                              {partner.main_photo_url ? (
                                <img src={partner.main_photo_url} alt={partner.restaurant_name} className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-bold text-sm">{getInitials(partner.restaurant_name)}</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-zinc-900 truncate">{partner.restaurant_name}</p>
                                <p className="text-xs text-zinc-500 truncate">{partner.email}</p>
                                <p className="text-xs text-zinc-400 mt-1">
                                  {new Date(partner.created_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                                partner.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                                partner.subscription_status === 'trial' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {partner.subscription_status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <Bell size={32} className="text-zinc-300 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">No new notifications</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-zinc-900">{user.email}</p>
                  <p className="text-xs text-zinc-500">Administrator</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs - Scrollable on mobile */}
          <div className="px-4 lg:px-8 flex gap-4 lg:gap-6 border-t border-zinc-100 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'partners', label: 'Partners', icon: Users },
              { id: 'revenue', label: 'Revenue', icon: DollarSign },
              { id: 'content', label: 'Content', icon: Video },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'affiliates', label: 'Affiliates', icon: Link2 },
              { id: 'chat', label: 'Live Chat', icon: MessageCircle, badge: activeChatsCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'chat') {
                    window.location.href = '/admin/live-chat';
                  } else {
                    setActiveTab(tab.id as TabType);
                  }
                }}
                className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 lg:p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Online Visitors - Live Indicator */}
              <div className={`rounded-xl border-2 p-4 lg:p-6 transition-all duration-500 ${
                onlineVisitors > 0 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                  : 'bg-gradient-to-br from-zinc-50 to-zinc-100 border-zinc-200'
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors duration-500 ${
                        onlineVisitors > 0 ? 'bg-green-500' : 'bg-zinc-400'
                      }`}>
                        <Users size={20} className="text-white lg:w-6 lg:h-6" />
                      </div>
                      {onlineVisitors > 0 && (
                        <div className="absolute inset-0 w-10 h-10 lg:w-12 lg:h-12 bg-green-500 rounded-full animate-ping opacity-75"></div>
                      )}
                    </div>
                    <div>
                      <p className={`text-2xl lg:text-3xl font-bold transition-colors duration-500 ${
                        onlineVisitors > 0 ? 'text-green-700' : 'text-zinc-500'
                      }`}>{onlineVisitors}</p>
                      <p className={`text-xs lg:text-sm font-medium transition-colors duration-500 ${
                        onlineVisitors > 0 ? 'text-green-600' : 'text-zinc-400'
                      }`}>
                        {onlineVisitors > 0 ? 'Online Now' : 'No visitors'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors duration-500 ${
                    onlineVisitors > 0 ? 'bg-green-500' : 'bg-zinc-400'
                  }`}>
                    <div className={`w-2 h-2 bg-white rounded-full ${onlineVisitors > 0 ? 'animate-pulse' : ''}`}></div>
                    <span className="text-xs font-bold text-white uppercase">Live</span>
                  </div>
                </div>
                <p className={`text-xs mt-3 transition-colors duration-500 ${
                  onlineVisitors > 0 ? 'text-green-600' : 'text-zinc-400'
                }`}>
                  Real-time from Google Analytics • Updates every 30s
                </p>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Partners */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200 group relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <Users size={24} className="text-zinc-600" />
                    </div>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 mb-1">{metrics.totalPartners}</p>
                  <p className="text-sm text-zinc-500 mb-3">Total Partners</p>
                  <MiniLineChart color="#71717a" />
                  
                  {/* Tooltip */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                      Total number of restaurant partners registered on the platform
                    </div>
                  </div>
                </div>

                {/* Active Subscriptions */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200 group relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <Crown size={24} className="text-zinc-600" />
                    </div>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 mb-1">{metrics.activeSubscriptions}</p>
                  <p className="text-sm text-zinc-500 mb-3">Active Subscriptions</p>
                  <MiniLineChart color="#71717a" />
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                      Partners currently paying for premium subscription plans
                    </div>
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200 group relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <DollarSign size={24} className="text-zinc-600" />
                    </div>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 mb-1">{formatCurrency(metrics.monthlyRevenue)}</p>
                  <p className="text-sm text-zinc-500 mb-3">Monthly Revenue</p>
                  <MiniLineChart color="#71717a" />
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                      Total recurring revenue from all active subscriptions this month
                    </div>
                  </div>
                </div>

                {/* Total Videos */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200 group relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <Video size={24} className="text-zinc-600" />
                    </div>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 mb-1">{metrics.totalVideos}</p>
                  <p className="text-sm text-zinc-500 mb-3">Total Videos</p>
                  <MiniLineChart color="#71717a" />
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                      Total number of menu videos uploaded across all restaurants
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Trial Users */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200 group relative">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock size={20} className="text-blue-500" />
                    <p className="text-sm font-medium text-zinc-600">Trial Users</p>
                  </div>
                  <p className="text-4xl font-bold text-zinc-900">{metrics.trialUsers}</p>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                      Partners currently on free trial period before subscription
                    </div>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200 group relative">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp size={20} className="text-green-500" />
                    <p className="text-sm font-medium text-zinc-600">Conversion Rate</p>
                  </div>
                  <p className="text-4xl font-bold text-zinc-900">{metrics.conversionRate.toFixed(1)}%</p>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                      Percentage of trial users who converted to paid subscriptions
                    </div>
                  </div>
                </div>

                {/* Churn Rate */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200 group relative">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingDown size={20} className="text-red-500" />
                    <p className="text-sm font-medium text-zinc-600">Churn Rate</p>
                  </div>
                  <p className="text-4xl font-bold text-zinc-900">{metrics.churnRate.toFixed(1)}%</p>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                      Percentage of paying customers who cancelled their subscription
                    </div>
                  </div>
                </div>

                {/* Restaurantes Locais */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200 group relative">
                  <div className="flex items-center gap-3 mb-2">
                    <Users size={20} className="text-orange-500" />
                    <p className="text-sm font-medium text-zinc-600">Restaurantes Locais</p>
                  </div>
                  <p className="text-4xl font-bold text-zinc-900">{metrics.restaurantesLocais}</p>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                      Local restaurants discovered from Google Places API in the area
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Analytics Widget */}
              <GoogleAnalyticsWidget />

              {/* Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Videos Populares */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <h3 className="text-lg font-bold text-zinc-900 mb-4">Videos Populares</h3>
                  <div className="space-y-3">
                    {partners.slice(0, 3).map((partner) => (
                      <div key={partner.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {partner.main_photo_url ? (
                            <img src={partner.main_photo_url} alt={partner.restaurant_name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{getInitials(partner.restaurant_name)}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm text-zinc-900">{partner.restaurant_name}</p>
                            <p className="text-xs text-zinc-500">{partner.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Videos</p>
                            <p className="text-sm font-bold text-zinc-900">{partner.total_videos}</p>
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <CheckCircle size={12} />
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Partners */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <h3 className="text-lg font-bold text-zinc-900 mb-4">Recent Partners</h3>
                  <div className="space-y-3">
                    {partners.slice(0, 3).map((partner) => (
                      <div key={partner.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {partner.main_photo_url ? (
                            <img src={partner.main_photo_url} alt={partner.restaurant_name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{getInitials(partner.restaurant_name)}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm text-zinc-900">{partner.restaurant_name}</p>
                            <p className="text-xs text-zinc-500">{partner.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <p className="text-xs text-zinc-500">Videos</p>
                            <p className="text-sm font-bold text-zinc-900">{partner.total_videos}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            partner.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                            partner.subscription_status === 'trial' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {partner.subscription_status}
                          </span>
                          {/* Action Dropdown */}
                          <div className="relative">
                            <button 
                              onClick={() => setOpenActionMenu(openActionMenu === partner.id ? null : partner.id)}
                              className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
                            >
                              Action
                            </button>
                            {openActionMenu === partner.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg z-50">
                                <button
                                  onClick={() => handlePartnerAction(partner.id, 'view')}
                                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                                >
                                  <Users size={14} />
                                  View Profile
                                </button>
                                <button
                                  onClick={() => handlePartnerAction(partner.id, 'stripe')}
                                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                                  disabled={!partner.stripe_customer_id}
                                >
                                  <DollarSign size={14} />
                                  Open Stripe
                                </button>
                                <button
                                  onClick={() => handlePartnerAction(partner.id, 'email')}
                                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                                >
                                  <FileText size={14} />
                                  Send Email
                                </button>
                                <button
                                  onClick={() => handlePartnerAction(partner.id, 'suspend')}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-zinc-100"
                                >
                                  <X size={14} />
                                  Suspend
                                </button>
                              </div>
                            )}
                          </div>
                          <button className="p-1 text-zinc-400 hover:text-zinc-600">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Removal Requests */}
              {removalRequests.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                      <ShieldAlert size={20} className="text-red-500" />
                      Removal Requests
                    </h3>
                    {pendingRemovals > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">{pendingRemovals} pending</span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {removalRequests.slice(0, 5).map((req) => (
                      <div key={req.id} className={`flex items-center justify-between p-4 rounded-lg ${req.status === 'pending' ? 'bg-red-50 border border-red-100' : 'bg-zinc-50'}`}>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-zinc-900">{req.business_name}</p>
                          <p className="text-xs text-zinc-500">ABN: {req.abn} · {req.contact_email}</p>
                          {req.verified_business_name && (
                            <p className="text-xs text-green-600 mt-0.5">Verified: {req.verified_business_name}</p>
                          )}
                          {req.reason && <p className="text-xs text-zinc-400 mt-1 italic">"{req.reason}"</p>}
                          <p className="text-[10px] text-zinc-400 mt-1">
                            {new Date(req.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {req.status === 'pending' ? (
                            <>
                              <button onClick={() => handleRemovalAction(req.id, 'approved')} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                              <button onClick={() => handleRemovalAction(req.id, 'rejected')} className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-medium rounded-lg">Reject</button>
                            </>
                          ) : (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              req.status === 'approved' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'
                            }`}>{req.status}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Atividade Recente */}
              <div className="bg-white rounded-xl p-6 border border-zinc-200">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Atividade Recente</h3>
                <div className="space-y-4">
                  {activityLog.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-zinc-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Activity size={20} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900">
                          {activity.action}: for <span className="font-bold">{activity.email}</span>
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">{activity.time}</p>
                      </div>
                      <button 
                        onClick={() => alert('Campaigns feature coming soon!')}
                        className="text-orange-500 text-sm font-medium hover:text-orange-600"
                        title="Email campaigns - Coming soon"
                      >
                        Campaigns
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Partners Tab */}
          {activeTab === 'partners' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">Partners</h2>
                  <p className="text-sm text-zinc-500 mt-1">Manage all registered partners</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      {partners.filter(p => p.subscription_status === 'active').length} Active
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {partners.filter(p => p.subscription_status === 'trial').length} Trial
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                      {partners.filter(p => p.subscription_status === 'expired' || p.subscription_status === 'cancelled').length} Inactive
                    </span>
                  </div>
                </div>
              </div>

              {/* Bulk Actions Toolbar */}
              {selectedPartners.size > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-orange-900">
                        {selectedPartners.size} partner{selectedPartners.size > 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={() => setSelectedPartners(new Set())}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Bulk email feature coming soon!')}
                        className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-medium rounded-lg border border-zinc-200 transition-colors"
                      >
                        Email Selected
                      </button>
                      <button
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Delete Selected
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Partners Table */}
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="py-3 px-4 w-12">
                          <input
                            type="checkbox"
                            checked={selectedPartners.size === partners.length && partners.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-orange-600 bg-zinc-100 border-zinc-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Restaurant</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Email</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Status</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Videos</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Joined</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Trial Ends</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.map((partner) => (
                        <tr key={partner.id} className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${
                          selectedPartners.has(partner.id) ? 'bg-orange-50' : ''
                        }`}>
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedPartners.has(partner.id)}
                              onChange={() => handleSelectPartner(partner.id)}
                              className="w-4 h-4 text-orange-600 bg-zinc-100 border-zinc-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {partner.main_photo_url ? (
                                <img src={partner.main_photo_url} alt={partner.restaurant_name} className="w-9 h-9 rounded-lg object-cover" />
                              ) : (
                                <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-bold text-xs">{getInitials(partner.restaurant_name)}</span>
                                </div>
                              )}
                              <span className="font-medium text-sm text-zinc-900">{partner.restaurant_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-500">{partner.email}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              partner.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                              partner.subscription_status === 'trial' ? 'bg-blue-100 text-blue-700' :
                              partner.subscription_status === 'expired' ? 'bg-red-100 text-red-700' :
                              'bg-zinc-100 text-zinc-600'
                            }`}>
                              {partner.subscription_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-sm font-medium text-zinc-900">{partner.total_videos}</td>
                          <td className="py-3 px-4 text-sm text-zinc-500">
                            {new Date(partner.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-500">
                            {partner.trial_end_date 
                              ? new Date(partner.trial_end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'
                            }
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handlePartnerAction(partner.id, 'view')}
                                className="px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handlePartnerAction(partner.id, 'stripe')}
                                className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                disabled={!partner.stripe_customer_id}
                              >
                                Stripe
                              </button>
                              <button
                                onClick={() => handlePartnerAction(partner.id, 'email')}
                                className="px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                              >
                                Email
                              </button>
                              <button
                                onClick={() => handlePartnerAction(partner.id, 'delete')}
                                className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {partners.length === 0 && (
                  <div className="p-12 text-center">
                    <Users size={40} className="text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500">No partners registered yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Revenue Tab */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">Revenue</h2>
                  <p className="text-sm text-zinc-500 mt-1">Track subscription revenue and financial metrics</p>
                </div>
              </div>

              {/* Revenue Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign size={20} className="text-green-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">{formatCurrency(metrics.monthlyRevenue)}</p>
                  <p className="text-sm text-zinc-500 mt-1">Monthly Recurring Revenue</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TrendingUp size={20} className="text-blue-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">{formatCurrency(metrics.monthlyRevenue * 12)}</p>
                  <p className="text-sm text-zinc-500 mt-1">Annual Run Rate</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-purple-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">{metrics.activeSubscriptions}</p>
                  <p className="text-sm text-zinc-500 mt-1">Paying Subscribers</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <DollarSign size={20} className="text-orange-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">
                    {metrics.activeSubscriptions > 0 
                      ? formatCurrency(metrics.monthlyRevenue / metrics.activeSubscriptions)
                      : formatCurrency(0)
                    }
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">Avg Revenue Per User</p>
                </div>
              </div>

              {/* Subscription Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <h3 className="text-lg font-bold text-zinc-900 mb-4">Subscription Breakdown</h3>
                  <div className="space-y-4">
                    {/* Active */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-zinc-700">Active Subscriptions</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-900">{metrics.activeSubscriptions}</span>
                        <div className="w-32 bg-zinc-100 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all" 
                            style={{ width: `${metrics.totalPartners > 0 ? (metrics.activeSubscriptions / metrics.totalPartners) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {/* Trial */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-zinc-700">Trial Users</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-900">{metrics.trialUsers}</span>
                        <div className="w-32 bg-zinc-100 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all" 
                            style={{ width: `${metrics.totalPartners > 0 ? (metrics.trialUsers / metrics.totalPartners) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {/* Expired/Cancelled */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-zinc-700">Expired / Cancelled</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-900">
                          {partners.filter(p => p.subscription_status === 'expired' || p.subscription_status === 'cancelled').length}
                        </span>
                        <div className="w-32 bg-zinc-100 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all" 
                            style={{ width: `${metrics.totalPartners > 0 ? (partners.filter(p => p.subscription_status === 'expired' || p.subscription_status === 'cancelled').length / metrics.totalPartners) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <h3 className="text-lg font-bold text-zinc-900 mb-4">Key Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                      <span className="text-sm text-zinc-600">Conversion Rate</span>
                      <span className="text-sm font-bold text-zinc-900">{metrics.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                      <span className="text-sm text-zinc-600">Churn Rate</span>
                      <span className="text-sm font-bold text-zinc-900">{metrics.churnRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                      <span className="text-sm text-zinc-600">Plan Price</span>
                      <span className="text-sm font-bold text-zinc-900">$39/month</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                      <span className="text-sm text-zinc-600">Trial Period</span>
                      <span className="text-sm font-bold text-zinc-900">14 days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue by Partner */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Paying Partners</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Restaurant</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Email</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Status</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Monthly</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Stripe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.filter(p => p.subscription_status === 'active').map((partner) => (
                        <tr key={partner.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {partner.main_photo_url ? (
                                <img src={partner.main_photo_url} alt={partner.restaurant_name} className="w-8 h-8 rounded-lg object-cover" />
                              ) : (
                                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">{getInitials(partner.restaurant_name)}</span>
                                </div>
                              )}
                              <span className="font-medium text-sm text-zinc-900">{partner.restaurant_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-500">{partner.email}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-bold text-zinc-900">$39.00</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handlePartnerAction(partner.id, 'stripe')}
                              className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              Open Stripe
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {partners.filter(p => p.subscription_status === 'active').length === 0 && (
                  <div className="p-8 text-center">
                    <DollarSign size={32} className="text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No paying subscribers yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">Content</h2>
                  <p className="text-sm text-zinc-500 mt-1">Overview of all platform content</p>
                </div>
              </div>

              {/* Content Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Video size={20} className="text-purple-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">{metrics.totalVideos}</p>
                  <p className="text-sm text-zinc-500 mt-1">Total Videos</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-orange-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">
                    {partners.filter(p => p.total_videos > 0).length}
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">Partners with Content</p>
                </div>

                <div className="bg-white rounded-xl border border-zinc-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 size={20} className="text-blue-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">
                    {partners.length > 0 
                      ? (metrics.totalVideos / partners.length).toFixed(1)
                      : '0'
                    }
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">Avg Videos per Partner</p>
                </div>
              </div>

              {/* Content by Partner */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Content by Partner</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Restaurant</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Videos</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Joined</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...partners].sort((a, b) => b.total_videos - a.total_videos).map((partner) => (
                        <tr key={partner.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {partner.main_photo_url ? (
                                <img src={partner.main_photo_url} alt={partner.restaurant_name} className="w-9 h-9 rounded-lg object-cover" />
                              ) : (
                                <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-bold text-xs">{getInitials(partner.restaurant_name)}</span>
                                </div>
                              )}
                              <span className="font-medium text-sm text-zinc-900">{partner.restaurant_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-sm font-bold ${partner.total_videos > 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>
                              {partner.total_videos}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {partner.total_videos > 0 ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Has Content</span>
                            ) : (
                              <span className="px-2 py-1 bg-zinc-100 text-zinc-500 text-xs font-medium rounded-full">No Content</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-500">
                            {new Date(partner.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handlePartnerAction(partner.id, 'view')}
                              className="px-3 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            >
                              Edit Menu
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {partners.length === 0 && (
                  <div className="p-8 text-center">
                    <Video size={32} className="text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No content uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <SuperAdminAnalytics />
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">Team Management</h2>
                <p className="text-sm text-zinc-500 mt-1">Manage admin panel access for your team</p>
              </div>

              {/* Add Team Member */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Add Team Member</h3>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="team@example.com"
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleAddTeamMember}
                  disabled={isAddingMember || !newMemberEmail}
                  className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  {isAddingMember ? 'Adding...' : 'Add Team Member'}
                </button>
                <p className="text-xs text-zinc-500 mt-3">
                  Team members will be able to access the admin panel using their email address.
                </p>
              </div>

              {/* Team Members List */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">
                  Team Members ({teamMembers.length})
                </h3>
                {teamMembers.length > 0 ? (
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 rounded-lg gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-zinc-900 truncate">
                              {member.email}
                            </p>
                            {member.email === user.email && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-zinc-400">
                              Added {new Date(member.created_at).toLocaleDateString()}
                            </span>
                            {member.last_login && (
                              <span className="text-xs text-zinc-400">
                                • Last login {new Date(member.last_login).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResendPassword(member.email)}
                            className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            Resend Password
                          </button>
                          <button
                            onClick={() => handleRemoveTeamMember(member.id, member.email)}
                            disabled={member.email === user.email}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserPlus size={48} className="text-zinc-300 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No team members yet</p>
                    <p className="text-xs text-zinc-400 mt-1">Add team members to give them admin access</p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <ShieldAlert size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">Admin Access</h4>
                    <p className="text-xs text-blue-700">
                      Team members will have full access to the admin panel. They can view all partners, 
                      analytics, revenue data, and manage content. Only add trusted team members.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Affiliates Tab */}
          {activeTab === 'affiliates' && (
            <AffiliatesAdminTab />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPartnerToDelete(null);
        }}
        onConfirm={confirmDeletePartner}
        title={`Delete ${partnerToDelete?.name || 'Partner'}`}
        message="⚠️ This will permanently delete:"
        type="danger"
        confirmText="Delete"
        cancelText="Cancel"
        details={[
          'Partner account',
          'All menu videos',
          'All analytics data',
          'This action CANNOT be undone!'
        ]}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedPartners.size} Partners`}
        message="⚠️ This will permanently delete:"
        type="danger"
        confirmText="Delete All"
        cancelText="Cancel"
        details={[
          `${selectedPartners.size} partner account${selectedPartners.size > 1 ? 's' : ''}`,
          'All their menu videos',
          'All their analytics data',
          'This action CANNOT be undone!'
        ]}
      />
    </div>
  );
};

export default SuperAdminDashboardNew;
