import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Eye, Video, QrCode, Loader2, Smartphone
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type DateRange = '7days' | '30days';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];

interface PartnerMetrics {
  restaurantId: string;
  restaurantName: string;
  profileViews: number;
  videoPlays: number;
  qrScans: number;
  totalEngagement: number;
}

interface DeviceData {
  device: string;
  count: number;
  percentage: number;
}

const SuperAdminAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [loading, setLoading] = useState(true);
  
  // Summary metrics
  const [totalProfileViews, setTotalProfileViews] = useState(0);
  const [totalVideoPlays, setTotalVideoPlays] = useState(0);
  const [totalQrScans, setTotalQrScans] = useState(0);
  
  // Partner data
  const [partnerMetrics, setPartnerMetrics] = useState<PartnerMetrics[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const getDaysFromRange = (): number => {
    return dateRange === '7days' ? 7 : 30;
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const days = getDaysFromRange();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch all partners
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, restaurant_name')
        .order('restaurant_name');

      if (partnersError) throw partnersError;

      // Fetch events for each partner
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('event_type, restaurant_id, device, created_at')
        .gte('created_at', startDate.toISOString())
        .in('event_type', ['restaurant_profile_view', 'video_play', 'qr_scan']);

      if (eventsError) throw eventsError;

      // Calculate metrics per partner
      const metricsMap = new Map<string, PartnerMetrics>();
      
      partners?.forEach(partner => {
        metricsMap.set(partner.id, {
          restaurantId: partner.id,
          restaurantName: partner.restaurant_name,
          profileViews: 0,
          videoPlays: 0,
          qrScans: 0,
          totalEngagement: 0,
        });
      });

      // Count events
      let totalViews = 0;
      let totalPlays = 0;
      let totalScans = 0;
      const deviceCounts = new Map<string, number>();

      events?.forEach(event => {
        const metrics = metricsMap.get(event.restaurant_id);
        if (metrics) {
          if (event.event_type === 'restaurant_profile_view') {
            metrics.profileViews++;
            totalViews++;
          } else if (event.event_type === 'video_play') {
            metrics.videoPlays++;
            totalPlays++;
          } else if (event.event_type === 'qr_scan') {
            metrics.qrScans++;
            totalScans++;
          }
          metrics.totalEngagement++;
        }

        // Count devices
        const device = event.device || 'unknown';
        deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
      });

      // Convert to arrays and sort
      const metricsArray = Array.from(metricsMap.values())
        .filter(m => m.totalEngagement > 0)
        .sort((a, b) => b.totalEngagement - a.totalEngagement);

      // Calculate device percentages
      const totalDeviceCount = Array.from(deviceCounts.values()).reduce((a, b) => a + b, 0);
      const devices: DeviceData[] = Array.from(deviceCounts.entries()).map(([device, count]) => ({
        device: device.charAt(0).toUpperCase() + device.slice(1),
        count,
        percentage: totalDeviceCount > 0 ? (count / totalDeviceCount) * 100 : 0,
      }));

      setTotalProfileViews(totalViews);
      setTotalVideoPlays(totalPlays);
      setTotalQrScans(totalScans);
      setPartnerMetrics(metricsArray);
      setDeviceData(devices);

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
          <h2 className="text-2xl font-bold text-zinc-900">Partner Analytics</h2>
          <p className="text-sm text-zinc-500 mt-1">Real-time data from registered restaurant partners</p>
        </div>
        
        <div className="flex gap-2">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Views */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Eye size={24} className="text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{totalProfileViews.toLocaleString()}</p>
          <p className="text-sm text-zinc-500 mt-1">Profile Views</p>
          <p className="text-xs text-zinc-400 mt-2">Total /r/restaurant-name visits</p>
        </div>

        {/* Video Plays */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Video size={24} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{totalVideoPlays.toLocaleString()}</p>
          <p className="text-sm text-zinc-500 mt-1">Video Plays</p>
          <p className="text-xs text-zinc-400 mt-2">Total menu video views</p>
        </div>

        {/* QR Scans */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <QrCode size={24} className="text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{totalQrScans.toLocaleString()}</p>
          <p className="text-sm text-zinc-500 mt-1">QR Code Scans</p>
          <p className="text-xs text-zinc-400 mt-2">Physical QR code scans</p>
        </div>
      </div>

      {/* Device Breakdown */}
      {deviceData.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={20} className="text-orange-600" />
            <h3 className="text-lg font-bold text-zinc-900">Device Breakdown</h3>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.device}: ${entry.percentage.toFixed(1)}%`}
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
      )}

      {/* Partner Performance Table */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Partner Performance</h3>
        {partnerMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Restaurant</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Profile Views</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Video Plays</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">QR Scans</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-600 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {partnerMetrics.map((partner, index) => (
                  <tr key={partner.restaurantId} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs font-bold text-orange-600">
                          {index + 1}
                        </span>
                        <span className="font-medium text-zinc-900">{partner.restaurantName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-zinc-900">{partner.profileViews}</td>
                    <td className="py-3 px-4 text-right font-semibold text-zinc-900">{partner.videoPlays}</td>
                    <td className="py-3 px-4 text-right font-semibold text-zinc-900">{partner.qrScans}</td>
                    <td className="py-3 px-4 text-right font-bold text-orange-600">{partner.totalEngagement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
            <Eye size={48} className="mb-2" />
            <p className="text-sm">No partner activity yet</p>
            <p className="text-xs mt-1">Data will appear when partners receive visits</p>
          </div>
        )}
      </div>

      {/* Top Performers Chart */}
      {partnerMetrics.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Top 10 Partners by Engagement</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={partnerMetrics.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis type="number" stroke="#71717a" fontSize={12} />
              <YAxis dataKey="restaurantName" type="category" stroke="#71717a" fontSize={12} width={150} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="totalEngagement" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SuperAdminAnalytics;
