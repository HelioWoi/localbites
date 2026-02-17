import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Eye, Video, QrCode, Navigation, TrendingUp, Smartphone, Monitor, Tablet,
  Calendar, Loader2, Sparkles
} from 'lucide-react';
import {
  getRestaurantMetrics,
  getRestaurantDailyPerformance,
  getDeviceBreakdown,
  RestaurantMetrics,
  DailyActivity
} from '../../services/eventsService';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];

interface RestaurantAnalyticsProps {
  restaurantId: string;
}

const RestaurantAnalytics: React.FC<RestaurantAnalyticsProps> = ({ restaurantId }) => {
  const [dateRange, setDateRange] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState<RestaurantMetrics>({
    profileViews: 0,
    videoPlays: 0,
    qrScans: 0,
    directionsClicks: 0,
  });
  
  const [dailyPerformance, setDailyPerformance] = useState<DailyActivity[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [restaurantId, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [metricsData, performanceData, devicesData] = await Promise.all([
        getRestaurantMetrics(restaurantId, dateRange),
        getRestaurantDailyPerformance(restaurantId, dateRange),
        getDeviceBreakdown()
      ]);

      setMetrics(metricsData);
      setDailyPerformance(performanceData);
      setDeviceData(devicesData);
    } catch (error) {
      console.error('Error loading restaurant analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate engagement rate
  const engagementRate = metrics.videoPlays > 0 
    ? ((metrics.profileViews / metrics.videoPlays) * 100).toFixed(1)
    : '0';

  // Generate insights
  const insights = [];
  
  if (metrics.videoPlays > 0) {
    insights.push(`Your videos were played ${metrics.videoPlays} times this week!`);
  }
  
  const topDevice = deviceData.length > 0 ? deviceData[0] : null;
  if (topDevice) {
    insights.push(`Most traffic comes from ${topDevice.device} devices (${topDevice.percentage.toFixed(0)}%)`);
  }
  
  if (metrics.directionsClicks > 0) {
    insights.push(`${metrics.directionsClicks} people clicked for directions - great location visibility!`);
  }

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
          <h2 className="text-2xl font-bold text-zinc-900">Your Analytics</h2>
          <p className="text-sm text-zinc-500 mt-1">Track your restaurant's performance</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setDateRange(7)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === 7
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange(30)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === 30
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-orange-600" />
            <h3 className="text-lg font-bold text-zinc-900">Insights</h3>
          </div>
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="text-sm text-zinc-700 flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Views */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Eye size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.profileViews}</p>
          <p className="text-sm text-zinc-500">Profile Views</p>
        </div>

        {/* Video Plays */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Video size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.videoPlays}</p>
          <p className="text-sm text-zinc-500">Video Plays</p>
        </div>

        {/* QR Scans */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <QrCode size={20} className="text-pink-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.qrScans}</p>
          <p className="text-sm text-zinc-500">QR Scans</p>
        </div>

        {/* Directions Clicks */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Navigation size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.directionsClicks}</p>
          <p className="text-sm text-zinc-500">Directions</p>
        </div>
      </div>

      {/* Daily Performance Chart */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Daily Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e4e4e7',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="pageViews" stroke="#f97316" strokeWidth={2} name="Profile Views" />
            <Line type="monotone" dataKey="videoPlays" stroke="#10b981" strokeWidth={2} name="Video Plays" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement Rate */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Engagement Rate</h3>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 mb-4">
            <div className="text-4xl font-bold text-orange-600">{engagementRate}%</div>
          </div>
          <p className="text-sm text-zinc-500">
            Profile views to video plays ratio
          </p>
        </div>
      </div>

      {/* Device Breakdown */}
      {deviceData.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Device Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deviceData.map((device, index) => {
              const Icon = device.device === 'mobile' ? Smartphone : device.device === 'tablet' ? Tablet : Monitor;
              return (
                <div key={index} className="p-4 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-zinc-200">
                      <Icon size={20} className="text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 capitalize">{device.device}</p>
                      <p className="text-xs text-zinc-500">{device.count} views</p>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-600 mt-2 text-right font-medium">{device.percentage.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {metrics.profileViews === 0 && metrics.videoPlays === 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
          <TrendingUp size={48} className="text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-900 mb-2">No data yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Your analytics will appear here once people start viewing your profile and videos.
            Share your MenuLove page to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default RestaurantAnalytics;
