import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Eye, Globe, Smartphone, Monitor, Tablet,
  ArrowUp, ArrowDown, Calendar, ExternalLink, Loader2
} from 'lucide-react';
import { 
  getAnalytics, 
  getTopPages, 
  getTopReferrers, 
  getDeviceBreakdown 
} from '../../services/analyticsService';

interface AnalyticsData {
  id: string;
  created_at: string;
  page_path: string;
  page_title: string;
  referrer: string;
  referrer_domain: string;
  device_type: string;
  browser: string;
  os: string;
  country: string;
  session_id: string;
}

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState(7); // Default 7 days
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsData, pages, referrers, devices] = await Promise.all([
        getAnalytics(timeRange),
        getTopPages(timeRange, 10),
        getTopReferrers(timeRange, 10),
        getDeviceBreakdown(timeRange)
      ]);

      setAnalytics(analyticsData);
      setTopPages(pages);
      setTopReferrers(referrers);
      setDeviceBreakdown(devices);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalViews = analytics.length;
  const uniqueSessions = new Set(analytics.map(a => a.session_id)).size;
  const avgViewsPerSession = uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : '0';

  // Device percentages
  const totalDeviceViews = deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
  const devicePercentages = deviceBreakdown.map(d => ({
    ...d,
    percentage: totalDeviceViews > 0 ? ((d.count / totalDeviceViews) * 100).toFixed(1) : '0'
  }));

  const getDeviceIcon = (device: string) => {
    if (device === 'mobile') return <Smartphone size={16} />;
    if (device === 'tablet') return <Tablet size={16} />;
    return <Monitor size={16} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Analytics Dashboard</h2>
          <p className="text-sm text-zinc-500 mt-1">Track visitor behavior and traffic sources</p>
        </div>
        
        {/* Time Range Selector */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-4 py-2 border border-zinc-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Views */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Eye size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{totalViews.toLocaleString()}</p>
          <p className="text-sm text-zinc-500">Total Page Views</p>
        </div>

        {/* Unique Sessions */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{uniqueSessions.toLocaleString()}</p>
          <p className="text-sm text-zinc-500">Unique Sessions</p>
        </div>

        {/* Avg Views per Session */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{avgViewsPerSession}</p>
          <p className="text-sm text-zinc-500">Avg Views/Session</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-orange-500" />
            Top Pages
          </h3>
          <div className="space-y-3">
            {topPages.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">No page data yet</p>
            ) : (
              topPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{page.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{page.path}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <span className="text-sm font-bold text-orange-600">{page.count}</span>
                    <span className="text-xs text-zinc-400">views</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <Globe size={20} className="text-blue-500" />
            Top Referrers
          </h3>
          <div className="space-y-3">
            {topReferrers.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">No referrer data yet</p>
            ) : (
              topReferrers.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ExternalLink size={14} className="text-zinc-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-zinc-900 truncate">{referrer.domain}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600">{referrer.count}</span>
                    <span className="text-xs text-zinc-400">visits</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Smartphone size={20} className="text-purple-500" />
          Device Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {devicePercentages.map((device, index) => (
            <div key={index} className="p-4 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-zinc-200">
                  {getDeviceIcon(device.device)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 capitalize">{device.device}</p>
                  <p className="text-xs text-zinc-500">{device.count} views</p>
                </div>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2 mt-3">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${device.percentage}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-2 text-right font-medium">{device.percentage}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-green-500" />
          Recent Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Page</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Device</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Browser</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Referrer</th>
              </tr>
            </thead>
            <tbody>
              {analytics.slice(0, 20).map((item, index) => (
                <tr key={item.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-3 px-4 text-xs text-zinc-600">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-900 font-medium truncate max-w-xs">
                    {item.page_title || item.page_path}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded text-xs font-medium text-zinc-700 capitalize">
                      {getDeviceIcon(item.device_type)}
                      {item.device_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-600">{item.browser}</td>
                  <td className="py-3 px-4 text-xs text-zinc-500 truncate max-w-xs">
                    {item.referrer_domain || 'Direct'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
