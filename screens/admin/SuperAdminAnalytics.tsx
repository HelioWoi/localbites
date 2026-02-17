import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Search, Eye, Video, QrCode, Calendar,
  Smartphone, Monitor, Tablet, ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import {
  getDashboardMetrics,
  getDailyActivity,
  getTopSearchTerms,
  getMostViewedRestaurants,
  getDeviceBreakdown,
  getTopPerformingRestaurants,
  getOnlineVisitors,
  DashboardMetrics,
  DailyActivity,
  SearchTerm,
  RestaurantViews,
  DeviceBreakdown,
  TopRestaurant
} from '../../services/eventsService';

type DateRange = 'today' | '7days' | '30days' | 'custom';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];

const SuperAdminAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [loading, setLoading] = useState(true);
  const [onlineVisitors, setOnlineVisitors] = useState(0);
  
  // Metrics
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalVisitors: 0,
    totalSearches: 0,
    totalProfileViews: 0,
    totalVideoPlays: 0,
    totalQrScans: 0,
  });
  
  // Charts data
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [topSearches, setTopSearches] = useState<SearchTerm[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<RestaurantViews[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceBreakdown[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopRestaurant[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  // Auto-refresh online visitors every 30 seconds
  useEffect(() => {
    loadOnlineVisitors();
    const interval = setInterval(loadOnlineVisitors, 30000);
    return () => clearInterval(interval);
  }, []);

  const getDaysFromRange = (): number => {
    switch (dateRange) {
      case 'today': return 1;
      case '7days': return 7;
      case '30days': return 30;
      default: return 7;
    }
  };

  const loadOnlineVisitors = async () => {
    try {
      const count = await getOnlineVisitors();
      setOnlineVisitors(count);
    } catch (error) {
      console.error('Error loading online visitors:', error);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const days = getDaysFromRange();
      
      const [
        metricsData,
        activityData,
        searchesData,
        restaurantsData,
        devicesData,
        performersData
      ] = await Promise.all([
        getDashboardMetrics(days),
        getDailyActivity(days),
        getTopSearchTerms(10),
        getMostViewedRestaurants(10),
        getDeviceBreakdown(),
        getTopPerformingRestaurants(10)
      ]);

      setMetrics(metricsData);
      setDailyActivity(activityData);
      setTopSearches(searchesData);
      setTopRestaurants(restaurantsData);
      setDeviceData(devicesData);
      setTopPerformers(performersData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
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
      {/* Header with Date Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Platform Analytics</h2>
          <p className="text-sm text-zinc-500 mt-1">Track platform performance and user behavior</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === 'today'
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRange('7days')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === '7days'
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange('30days')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === '30days'
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Online Visitors - Live Indicator */}
      <div className={`rounded-xl border-2 p-6 transition-all duration-500 ${
        onlineVisitors > 0 
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
          : 'bg-gradient-to-br from-zinc-50 to-zinc-100 border-zinc-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-500 ${
                onlineVisitors > 0 ? 'bg-green-500' : 'bg-zinc-400'
              }`}>
                <Users size={24} className="text-white" />
              </div>
              {onlineVisitors > 0 && (
                <div className="absolute inset-0 w-12 h-12 bg-green-500 rounded-full animate-ping opacity-75"></div>
              )}
            </div>
            <div>
              <p className={`text-3xl font-bold transition-colors duration-500 ${
                onlineVisitors > 0 ? 'text-green-700' : 'text-zinc-500'
              }`}>{onlineVisitors}</p>
              <p className={`text-sm font-medium transition-colors duration-500 ${
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
          Active visitors in the last 2 minutes • Updates every 30s
        </p>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Visitors */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.totalVisitors.toLocaleString()}</p>
          <p className="text-sm text-zinc-500">Total Visitors</p>
        </div>

        {/* Total Searches */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Search size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.totalSearches.toLocaleString()}</p>
          <p className="text-sm text-zinc-500">Total Searches</p>
        </div>

        {/* Profile Views */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Eye size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.totalProfileViews.toLocaleString()}</p>
          <p className="text-sm text-zinc-500">Profile Views</p>
        </div>

        {/* Video Plays */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Video size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.totalVideoPlays.toLocaleString()}</p>
          <p className="text-sm text-zinc-500">Video Plays</p>
        </div>

        {/* QR Scans */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <QrCode size={20} className="text-pink-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{metrics.totalQrScans.toLocaleString()}</p>
          <p className="text-sm text-zinc-500">QR Scans</p>
        </div>
      </div>

      {/* Daily Activity Line Chart */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Daily Activity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyActivity}>
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
            <Line type="monotone" dataKey="pageViews" stroke="#3b82f6" strokeWidth={2} name="Page Views" />
            <Line type="monotone" dataKey="searches" stroke="#8b5cf6" strokeWidth={2} name="Searches" />
            <Line type="monotone" dataKey="videoPlays" stroke="#10b981" strokeWidth={2} name="Video Plays" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Search Terms */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Top Search Terms</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSearches} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis type="number" stroke="#71717a" fontSize={12} />
              <YAxis dataKey="term" type="category" stroke="#71717a" fontSize={12} width={100} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Most Viewed Restaurants */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Most Viewed Restaurants</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topRestaurants} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis type="number" stroke="#71717a" fontSize={12} />
              <YAxis dataKey="restaurantName" type="category" stroke="#71717a" fontSize={12} width={120} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="views" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Breakdown Pie Chart */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Device Breakdown</h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ device, percentage }) => `${device}: ${percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Restaurants Table */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Top Performing Restaurants</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Restaurant</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Profile Views</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Video Plays</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">QR Scans</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Directions</th>
              </tr>
            </thead>
            <tbody>
              {topPerformers.map((restaurant, index) => (
                <tr key={restaurant.restaurantId} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs font-bold text-orange-600">
                        {index + 1}
                      </span>
                      <span className="font-medium text-zinc-900">{restaurant.restaurantName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-zinc-900">{restaurant.profileViews}</td>
                  <td className="py-3 px-4 text-right font-semibold text-zinc-900">{restaurant.videoPlays}</td>
                  <td className="py-3 px-4 text-right font-semibold text-zinc-900">{restaurant.qrScans}</td>
                  <td className="py-3 px-4 text-right font-semibold text-zinc-900">{restaurant.directionsClicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;
