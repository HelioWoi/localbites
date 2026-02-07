import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, DollarSign, TrendingUp, Video, Eye, Heart, 
  Search, Filter, Download, CheckCircle, XCircle, Clock,
  Crown, AlertCircle, BarChart3, PieChart, Calendar,
  RefreshCw, Settings, LogOut, Shield
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
}

type TabType = 'overview' | 'partners' | 'revenue' | 'content' | 'analytics';

interface SuperAdminDashboardProps {
  user: any;
  onLogout: () => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load all data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter partners based on search and status
  useEffect(() => {
    let filtered = partners;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.subscription_status === statusFilter);
    }

    setFilteredPartners(filtered);
  }, [searchQuery, statusFilter, partners]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load partners with their video counts
      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select(`
          *,
          menu_items(count)
        `)
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;

      // Process partners data
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
        total_views: 0, // Will be calculated from interactions
        main_photo_url: p.main_photo_url,
      }));

      setPartners(processedPartners);

      // Calculate metrics
      const activeCount = processedPartners.filter(p => p.subscription_status === 'active').length;
      const trialCount = processedPartners.filter(p => p.subscription_status === 'trial').length;
      const totalVideos = processedPartners.reduce((sum, p) => sum + p.total_videos, 0);
      
      // Revenue calculation (assuming $29/month per active subscription)
      const monthlyRevenue = activeCount * 29;
      const totalRevenue = monthlyRevenue; // For now, same as monthly

      // Conversion rate: active / (active + trial + cancelled)
      const totalConverted = activeCount;
      const totalEligible = processedPartners.length;
      const conversionRate = totalEligible > 0 ? (totalConverted / totalEligible) * 100 : 0;

      // Churn rate: cancelled / (active + cancelled)
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
        totalViews: 0, // Would need interactions table
        conversionRate,
        churnRate,
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

  const getStatusBadge = (status: string) => {
    const styles = {
      trial: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700',
    };

    const icons = {
      trial: Clock,
      active: CheckCircle,
      cancelled: XCircle,
      expired: AlertCircle,
    };

    const Icon = icons[status as keyof typeof icons] || AlertCircle;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const exportData = () => {
    const csv = [
      ['Restaurant', 'Email', 'Status', 'Videos', 'Created', 'Trial End'].join(','),
      ...filteredPartners.map(p => [
        p.restaurant_name,
        p.email,
        p.subscription_status,
        p.total_videos,
        formatDate(p.created_at),
        p.trial_end_date ? formatDate(p.trial_end_date) : 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localbites-partners-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={48} className="text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-zinc-900">Super Admin</h1>
                <p className="text-xs text-zinc-500">Local Bites Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-900">{user.email}</p>
                <p className="text-xs text-zinc-500">Administrator</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-blue-600" />
                  </div>
                  <TrendingUp size={16} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-zinc-900">{metrics.totalPartners}</p>
                <p className="text-xs text-zinc-500 mt-1">Total Partners</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Crown size={20} className="text-green-600" />
                  </div>
                  <TrendingUp size={16} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-zinc-900">{metrics.activeSubscriptions}</p>
                <p className="text-xs text-zinc-500 mt-1">Active Subscriptions</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <DollarSign size={20} className="text-orange-600" />
                  </div>
                  <Calendar size={16} className="text-zinc-400" />
                </div>
                <p className="text-2xl font-bold text-zinc-900">{formatCurrency(metrics.monthlyRevenue)}</p>
                <p className="text-xs text-zinc-500 mt-1">Monthly Revenue</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Video size={20} className="text-purple-600" />
                  </div>
                  <TrendingUp size={16} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-zinc-900">{metrics.totalVideos}</p>
                <p className="text-xs text-zinc-500 mt-1">Total Videos</p>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <div className="flex items-center gap-3 mb-2">
                  <Clock size={18} className="text-blue-500" />
                  <p className="text-sm font-medium text-zinc-900">Trial Users</p>
                </div>
                <p className="text-3xl font-bold text-zinc-900">{metrics.trialUsers}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={18} className="text-green-500" />
                  <p className="text-sm font-medium text-zinc-900">Conversion Rate</p>
                </div>
                <p className="text-3xl font-bold text-zinc-900">{metrics.conversionRate.toFixed(1)}%</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle size={18} className="text-red-500" />
                  <p className="text-sm font-medium text-zinc-900">Churn Rate</p>
                </div>
                <p className="text-3xl font-bold text-zinc-900">{metrics.churnRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Recent Partners */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Recent Partners</h3>
              <div className="space-y-3">
                {partners.slice(0, 5).map((partner) => (
                  <div key={partner.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {partner.main_photo_url ? (
                        <img src={partner.main_photo_url} alt={partner.restaurant_name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{partner.restaurant_name.charAt(0)}</span>
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
                      {getStatusBadge(partner.subscription_status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Partners Tab */}
        {activeTab === 'partners' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search partners..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Status</option>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
                <button
                  onClick={exportData}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>

            {/* Partners List */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">Restaurant</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">Videos</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">Created</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">Trial End</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {filteredPartners.map((partner) => (
                      <tr key={partner.id} className="hover:bg-zinc-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {partner.main_photo_url ? (
                              <img src={partner.main_photo_url} alt={partner.restaurant_name} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{partner.restaurant_name.charAt(0)}</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm text-zinc-900">{partner.restaurant_name}</p>
                              <p className="text-xs text-zinc-500">/{partner.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{partner.email}</td>
                        <td className="px-6 py-4">{getStatusBadge(partner.subscription_status)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-900">{partner.total_videos}</td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{formatDate(partner.created_at)}</td>
                        <td className="px-6 py-4 text-sm text-zinc-600">
                          {partner.trial_end_date ? formatDate(partner.trial_end_date) : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => window.open(`/r/${partner.slug}`, '_blank')}
                            className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredPartners.length === 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
                <Users size={48} className="text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">No partners found</p>
              </div>
            )}
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                <DollarSign size={32} className="mb-3 opacity-80" />
                <p className="text-3xl font-bold mb-1">{formatCurrency(metrics.totalRevenue)}</p>
                <p className="text-sm opacity-80">Total Revenue</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                <Calendar size={32} className="mb-3 opacity-80" />
                <p className="text-3xl font-bold mb-1">{formatCurrency(metrics.monthlyRevenue)}</p>
                <p className="text-sm opacity-80">Monthly Recurring</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
                <TrendingUp size={32} className="mb-3 opacity-80" />
                <p className="text-3xl font-bold mb-1">{formatCurrency(metrics.monthlyRevenue * 12)}</p>
                <p className="text-sm opacity-80">Annual Run Rate</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Revenue Breakdown</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-zinc-600">Active Subscriptions</span>
                    <span className="text-sm font-bold text-zinc-900">{metrics.activeSubscriptions} × $29</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(metrics.activeSubscriptions / metrics.totalPartners) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-zinc-600">Trial Users (Potential)</span>
                    <span className="text-sm font-bold text-zinc-900">{metrics.trialUsers} × $29</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(metrics.trialUsers / metrics.totalPartners) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 border border-zinc-200">
                <div className="flex items-center gap-3 mb-4">
                  <Video size={24} className="text-purple-500" />
                  <h3 className="text-lg font-bold text-zinc-900">Video Statistics</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Total Videos</span>
                    <span className="font-bold text-zinc-900">{metrics.totalVideos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Avg per Partner</span>
                    <span className="font-bold text-zinc-900">
                      {metrics.totalPartners > 0 ? (metrics.totalVideos / metrics.totalPartners).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Total Views</span>
                    <span className="font-bold text-zinc-900">{metrics.totalViews.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-zinc-200">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 size={24} className="text-orange-500" />
                  <h3 className="text-lg font-bold text-zinc-900">Top Performers</h3>
                </div>
                <div className="space-y-3">
                  {partners
                    .sort((a, b) => b.total_videos - a.total_videos)
                    .slice(0, 5)
                    .map((partner, index) => (
                      <div key={partner.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-400">#{index + 1}</span>
                          <span className="text-sm text-zinc-900">{partner.restaurant_name}</span>
                        </div>
                        <span className="text-sm font-bold text-orange-500">{partner.total_videos} videos</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <Eye size={20} className="text-blue-500 mb-2" />
                <p className="text-2xl font-bold text-zinc-900">{metrics.totalViews.toLocaleString()}</p>
                <p className="text-xs text-zinc-500 mt-1">Total Views</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <Heart size={20} className="text-red-500 mb-2" />
                <p className="text-2xl font-bold text-zinc-900">0</p>
                <p className="text-xs text-zinc-500 mt-1">Total Likes</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <Users size={20} className="text-green-500 mb-2" />
                <p className="text-2xl font-bold text-zinc-900">0</p>
                <p className="text-xs text-zinc-500 mt-1">Active Users</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-zinc-200">
                <TrendingUp size={20} className="text-purple-500 mb-2" />
                <p className="text-2xl font-bold text-zinc-900">{metrics.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-zinc-500 mt-1">Conversion Rate</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Growth Metrics</h3>
              <p className="text-zinc-500 text-sm">
                Analytics tracking will be available once the interactions table is implemented.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
