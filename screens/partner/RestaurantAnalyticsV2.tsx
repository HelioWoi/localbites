/**
 * ============================================================================
 * RESTAURANT ANALYTICS V2
 * ============================================================================
 * Clean analytics dashboard using analytics_events table only.
 * Cutover date: 2026-03-19
 * 
 * This is a fresh start analytics system that does NOT use legacy data.
 * All metrics are calculated from analytics_events table exclusively.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Eye, Video, Heart, Bookmark, ShoppingBag, QrCode, User,
  Smartphone, Monitor, Clock, TrendingUp, Loader2, Info, CheckCircle2,
  Share2, Navigation, Phone, Download
} from 'lucide-react';
import {
  getPartnerSummaryV2,
  getTopItemsV2,
  getMostWatchedVideosV2,
  getPeakHoursV2,
  getDeviceBreakdownV2,
  getConversionFunnelV2,
  getDateRange,
  PartnerSummaryV2,
  TopItemV2,
  PeakHourV2,
  DeviceBreakdownV2,
  ConversionFunnelV2
} from '../../services/partnerAnalyticsV2Service';
import { ANALYTICS_V2_START_DATE } from '../../services/analyticsV2Service';
import { supabase } from '../../lib/supabase';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];

interface RestaurantAnalyticsV2Props {
  restaurantId: string;
}

type DatePeriod = 'today' | '7days' | '30days';

const RestaurantAnalyticsV2: React.FC<RestaurantAnalyticsV2Props> = ({ restaurantId }) => {
  const [period, setPeriod] = useState<DatePeriod>('7days');
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState<PartnerSummaryV2 | null>(null);
  const [topItems, setTopItems] = useState<TopItemV2[]>([]);
  const [mostWatchedVideos, setMostWatchedVideos] = useState<TopItemV2[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourV2[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdownV2 | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnelV2 | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [restaurantId, period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period);
      
      const [summaryData, itemsData, videosData, hoursData, deviceData, funnelData] = await Promise.all([
        getPartnerSummaryV2(restaurantId, start, end),
        getTopItemsV2(restaurantId, start, end, 10),
        getMostWatchedVideosV2(restaurantId, start, end, 10),
        getPeakHoursV2(restaurantId, start, end),
        getDeviceBreakdownV2(restaurantId, start, end),
        getConversionFunnelV2(restaurantId, start, end)
      ]);

      setSummary(summaryData);
      setTopItems(itemsData);
      setMostWatchedVideos(videosData);
      setPeakHours(hoursData);
      setDeviceBreakdown(deviceData);
      setFunnel(funnelData);
    } catch (error) {
      console.error('[AnalyticsV2] Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const downloadCSV = () => {
    if (!topItems.length) return;

    // CSV headers
    const headers = ['Dish Name', 'Category', 'Views', 'Plays', 'Likes', 'Saves', 'Shares', 'Orders', 'Directions', 'Phone Calls'];
    
    // CSV rows
    const rows = topItems.map(item => [
      `"${item.item_name}"`,
      `"${item.category || 'N/A'}"`,
      item.views,
      item.plays,
      item.likes,
      item.saves,
      item.shares,
      item.order_clicks,
      item.directions_clicks,
      item.phone_calls
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const totalEngagement = (summary?.likes || 0) + (summary?.saves || 0);
  const totalDevices = (deviceBreakdown?.mobile || 0) + (deviceBreakdown?.desktop || 0);
  const mobilePercentage = totalDevices > 0 ? Math.round((deviceBreakdown?.mobile || 0) / totalDevices * 100) : 0;
  const desktopPercentage = totalDevices > 0 ? Math.round((deviceBreakdown?.desktop || 0) / totalDevices * 100) : 0;

  const deviceChartData = [
    { name: 'Mobile', value: deviceBreakdown?.mobile || 0, color: '#f97316' },
    { name: 'Desktop', value: deviceBreakdown?.desktop || 0, color: '#fb923c' }
  ].filter(d => d.value > 0);

  const peakHoursChartData = peakHours.map(ph => ({
    hour: formatHour(ph.hour),
    count: ph.count
  }));

  const funnelChartData = funnel ? [
    { name: 'Views', value: funnel.views, fill: '#f97316' },
    { name: 'Plays', value: funnel.plays, fill: '#fb923c' },
    { name: 'Engagements', value: funnel.engagements, fill: '#fdba74' },
    { name: 'Orders', value: funnel.orders, fill: '#fed7aa' }
  ].filter(d => d.value > 0) : [];

  return (
    <div className="p-6 space-y-6">
      {/* Trust Badge - Analytics V2 Active */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-orange-900">Analytics V2 Active</span>
              <span className="text-sm text-orange-700">•</span>
              <span className="text-sm text-orange-700">Tracking since 19 Mar 2026</span>
              <span className="text-sm text-orange-700">•</span>
              <span className="text-sm text-orange-700">Data source: analytics_events</span>
            </div>
          </div>
          <Info className="w-4 h-4 text-orange-600 flex-shrink-0" />
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {(['today', '7days', '30days'] as DatePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {p === 'today' ? 'Today' : p === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
          <button
            onClick={downloadCSV}
            disabled={!topItems.length}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-300 disabled:cursor-not-allowed flex items-center gap-2 border border-zinc-200"
            title="Download full analytics report as CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4">
        {/* Total Views */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.total_views || 0}</p>
          <p className="text-sm text-zinc-500">Total Views</p>
        </div>

        {/* Video Plays */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Video className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.video_plays || 0}</p>
          <p className="text-sm text-zinc-500">Video Plays</p>
        </div>

        {/* Likes */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.likes || 0}</p>
          <p className="text-sm text-zinc-500">Likes</p>
        </div>

        {/* Saves */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Bookmark className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.saves || 0}</p>
          <p className="text-sm text-zinc-500">Saves</p>
        </div>

        {/* Order Clicks */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.order_clicks || 0}</p>
          <p className="text-sm text-zinc-500">Order Clicks</p>
        </div>

        {/* Profile Views */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.profile_views || 0}</p>
          <p className="text-sm text-zinc-500">Profile Views</p>
        </div>

        {/* QR Scans */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <QrCode className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.qr_scans || 0}</p>
          <p className="text-sm text-zinc-500">QR Scans</p>
        </div>

        {/* Shares */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Share2 className="w-5 h-5 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.shares || 0}</p>
          <p className="text-sm text-zinc-500">Shares</p>
        </div>

        {/* Directions */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Navigation className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.directions_clicks || 0}</p>
          <p className="text-sm text-zinc-500">Directions</p>
        </div>

        {/* Phone Calls */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Phone className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{summary?.phone_calls || 0}</p>
          <p className="text-sm text-zinc-500">Phone Calls</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Watched Videos */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Top 5 Most Watched Videos</h3>
          {mostWatchedVideos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {mostWatchedVideos.slice(0, 5).map((item, index) => (
                <div key={item.item_id} className="relative group">
                  <div className="aspect-[9/16] bg-zinc-100 rounded-lg overflow-hidden relative">
                    {item.video_url ? (
                      <video
                        src={item.video_url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                        <Video className="w-8 h-8 text-orange-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-2 left-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs font-semibold line-clamp-2 mb-1">{item.item_name}</p>
                      <div className="flex items-center gap-1 text-white/90">
                        <Video size={10} />
                        <span className="text-xs">{item.plays} plays</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Video size={48} className="text-zinc-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-zinc-900 mb-2">No video plays yet</p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                When customers watch your dish videos, you'll see which ones are most popular here
              </p>
            </div>
          )}
        </div>

        {/* Top Performing Items */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Top 5 Performing Items</h3>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.slice(0, 5).map((item, index) => (
                <div key={item.item_id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{item.item_name}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span>{item.views} views</span>
                      {item.plays > 0 && <span>• {item.plays} plays</span>}
                      {item.likes > 0 && <span>• {item.likes} likes</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp size={48} className="text-zinc-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-zinc-900 mb-2">No data yet</p>
              <p className="text-xs text-zinc-500">
                Item performance will appear here once customers start interacting with your menu
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Engagement Details - Per Dish Breakdown */}
      {topItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Most Liked Dishes */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-red-500" />
              <h4 className="text-sm font-bold text-zinc-900">Top 5 Most Liked</h4>
            </div>
            {topItems.filter(i => i.likes > 0).length > 0 ? (
              <div className="space-y-2">
                {topItems.filter(i => i.likes > 0).sort((a, b) => b.likes - a.likes).slice(0, 5).map((item, idx) => (
                  <div key={item.item_id} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-700 truncate flex-1 mr-2">{idx + 1}. {item.item_name}</span>
                    <span className="text-xs font-bold text-red-600 whitespace-nowrap">{item.likes} ♥</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No likes yet</p>
            )}
          </div>

          {/* Most Saved Dishes */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-purple-500" />
              <h4 className="text-sm font-bold text-zinc-900">Top 5 Most Saved</h4>
            </div>
            {topItems.filter(i => i.saves > 0).length > 0 ? (
              <div className="space-y-2">
                {topItems.filter(i => i.saves > 0).sort((a, b) => b.saves - a.saves).slice(0, 5).map((item, idx) => (
                  <div key={item.item_id} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-700 truncate flex-1 mr-2">{idx + 1}. {item.item_name}</span>
                    <span className="text-xs font-bold text-purple-600 whitespace-nowrap">{item.saves} saved</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No saves yet</p>
            )}
          </div>

          {/* Most Shared Dishes */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="w-4 h-4 text-cyan-500" />
              <h4 className="text-sm font-bold text-zinc-900">Top 5 Most Shared</h4>
            </div>
            {topItems.filter(i => i.shares > 0).length > 0 ? (
              <div className="space-y-2">
                {topItems.filter(i => i.shares > 0).sort((a, b) => b.shares - a.shares).slice(0, 5).map((item, idx) => (
                  <div key={item.item_id} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-700 truncate flex-1 mr-2">{idx + 1}. {item.item_name}</span>
                    <span className="text-xs font-bold text-cyan-600 whitespace-nowrap">{item.shares} shared</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No shares yet</p>
            )}
          </div>

          {/* Most Ordered Dishes */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-4 h-4 text-orange-500" />
              <h4 className="text-sm font-bold text-zinc-900">Top 5 Most Ordered</h4>
            </div>
            {topItems.filter(i => i.order_clicks > 0).length > 0 ? (
              <div className="space-y-2">
                {topItems.filter(i => i.order_clicks > 0).sort((a, b) => b.order_clicks - a.order_clicks).slice(0, 5).map((item, idx) => (
                  <div key={item.item_id} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-700 truncate flex-1 mr-2">{idx + 1}. {item.item_name}</span>
                    <span className="text-xs font-bold text-orange-600 whitespace-nowrap">{item.order_clicks} orders</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No orders yet</p>
            )}
          </div>
        </div>
      )}

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Device Breakdown</h3>
          {deviceChartData.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-zinc-700">Mobile</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">{mobilePercentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-zinc-700">Desktop</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">{desktopPercentage}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Smartphone size={48} className="text-zinc-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-zinc-900 mb-2">No device data yet</p>
              <p className="text-xs text-zinc-500">
                Device breakdown will appear here once you have visitors
              </p>
            </div>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Peak Hours</h3>
          {peakHoursChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakHoursChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <Clock size={48} className="text-zinc-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-zinc-900 mb-2">No activity data yet</p>
              <p className="text-xs text-zinc-500">
                Peak hours will appear here once you have enough visitor activity
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Conversion Funnel</h3>
        {funnelChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {funnelChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12">
            <TrendingUp size={48} className="text-zinc-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-zinc-900 mb-2">No funnel data yet</p>
            <p className="text-xs text-zinc-500">
              Conversion funnel will appear here once you have customer interactions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantAnalyticsV2;
