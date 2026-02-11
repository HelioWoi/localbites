import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, Video, DollarSign, TrendingUp, Search, Bell, LogOut,
  Home, FileText, Settings, BarChart3, Crown, Clock, CheckCircle,
  MoreVertical, TrendingDown, Activity, Menu, X, ShieldAlert, Trash2, Check
} from 'lucide-react';

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

type TabType = 'overview' | 'restaurants' | 'videos' | 'menus' | 'partners' | 'revenue' | 'analytics' | 'settings';

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

  useEffect(() => {
    loadDashboardData();
    loadNotifications();
    loadActivityLog();
    loadRemovalRequests();
  }, []);

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
      const monthlyRevenue = activeCount * 29;
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

  // Handle partner actions
  const handlePartnerAction = (partnerId: string, action: string) => {
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return;

    switch(action) {
      case 'view':
        window.open(`/r/${partner.slug}`, '_blank');
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
      {/* Sidebar */}
      <div className={`w-64 bg-white border-r border-zinc-200 fixed h-full flex flex-col transition-transform duration-300 z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-64'
      } lg:translate-x-0`}>
        {/* Logo */}
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <Crown size={20} className="text-white" />
              </div>
              <span className="text-lg font-bold text-zinc-900">Super Admin</span>
            </div>
            {/* Toggle Sidebar Button - Desktop only */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:block p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Home size={18} />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'restaurants'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Users size={18} />
            Restaurants
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'videos'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Video size={18} />
            Videos
          </button>

          <button
            onClick={() => setActiveTab('menus')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'menus'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <FileText size={18} />
            Menus
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'partners'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Crown size={18} />
            Partners
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'revenue'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <DollarSign size={18} />
            Revenue
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <BarChart3 size={18} />
            Analytics
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Settings size={18} />
            Settings
          </button>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        {/* Top Bar */}
        <div className="bg-white border-b border-zinc-200 sticky top-0 z-30">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
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
                  className="relative p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  title={`${notifications} new partners in last 7 days`}
                >
                  <Bell size={20} />
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
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 lg:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Partners */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <Users size={24} className="text-zinc-600" />
                    </div>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 mb-1">{metrics.totalPartners}</p>
                  <p className="text-sm text-zinc-500 mb-3">Total Partners</p>
                  <MiniLineChart color="#71717a" />
                </div>

                {/* Active Subscriptions */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <Crown size={24} className="text-zinc-600" />
                    </div>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 mb-1">{metrics.activeSubscriptions}</p>
                  <p className="text-sm text-zinc-500 mb-3">Active Subscriptions</p>
                  <MiniLineChart color="#71717a" />
                </div>

                {/* Monthly Revenue */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <DollarSign size={24} className="text-zinc-600" />
                    </div>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 mb-1">{formatCurrency(metrics.monthlyRevenue)}</p>
                  <p className="text-sm text-zinc-500 mb-3">Monthly Revenue</p>
                  <MiniLineChart color="#71717a" />
                </div>

                {/* Total Videos */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                      <Video size={24} className="text-zinc-600" />
                    </div>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 mb-1">{metrics.totalVideos}</p>
                  <p className="text-sm text-zinc-500 mb-3">Total Videos</p>
                  <MiniLineChart color="#71717a" />
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Trial Users */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock size={20} className="text-blue-500" />
                    <p className="text-sm font-medium text-zinc-600">Trial Users</p>
                  </div>
                  <p className="text-4xl font-bold text-zinc-900">{metrics.trialUsers}</p>
                </div>

                {/* Conversion Rate */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp size={20} className="text-green-500" />
                    <p className="text-sm font-medium text-zinc-600">Conversion Rate</p>
                  </div>
                  <p className="text-4xl font-bold text-zinc-900">{metrics.conversionRate.toFixed(1)}%</p>
                </div>

                {/* Churn Rate */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingDown size={20} className="text-red-500" />
                    <p className="text-sm font-medium text-zinc-600">Churn Rate</p>
                  </div>
                  <p className="text-4xl font-bold text-zinc-900">{metrics.churnRate.toFixed(1)}%</p>
                </div>

                {/* Restaurantes Locais */}
                <div className="bg-white rounded-xl p-6 border border-zinc-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Users size={20} className="text-orange-500" />
                    <p className="text-sm font-medium text-zinc-600">Restaurantes Locais</p>
                  </div>
                  <p className="text-4xl font-bold text-zinc-900">{metrics.restaurantesLocais}</p>
                </div>
              </div>

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
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardNew;
