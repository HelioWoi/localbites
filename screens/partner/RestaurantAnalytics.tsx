import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, FunnelChart, Funnel, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import {
  Eye, Video, Heart, Bookmark, Share2, Navigation, QrCode, TrendingUp, 
  Sparkles, Clock, Smartphone, Monitor, Tablet, Loader2, AlertCircle
} from 'lucide-react';
import {
  getPartnerSummary,
  getPartnerFunnel,
  getPartnerTopItems,
  getPartnerPeakHours,
  getPartnerInsights,
  getDateRange,
  formatHour,
  getPeakWindow,
  PartnerSummary,
  FunnelStep,
  TopItem,
  PeakHour,
  Insight
} from '../../services/partnerAnalyticsService';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];

interface RestaurantAnalyticsProps {
  restaurantId: string;
}

type DatePeriod = 'today' | '7days' | '30days';

const RestaurantAnalytics: React.FC<RestaurantAnalyticsProps> = ({ restaurantId }) => {
  const [period, setPeriod] = useState<DatePeriod>('7days');
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState<PartnerSummary | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [restaurantId, period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period);
      
      const [summaryData, funnelData, itemsData, hoursData, insightsData] = await Promise.all([
        getPartnerSummary(restaurantId, start, end),
        getPartnerFunnel(restaurantId, start, end),
        getPartnerTopItems(restaurantId, start, end, 10),
        getPartnerPeakHours(restaurantId, start, end),
        getPartnerInsights(restaurantId, start, end)
      ]);

      setSummary(summaryData);
      setFunnel(funnelData);
      setTopItems(itemsData);
      setPeakHours(hoursData);
      setInsights(insightsData);
    } catch (error) {
      console.error('[RestaurantAnalytics] Error loading analytics:', error);
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

  const hasData = summary && (summary.profile_views > 0 || summary.item_views > 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Your Analytics</h2>
          <p className="text-sm text-zinc-500 mt-1">Business intelligence for your restaurant</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'today'
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('7days')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === '7days'
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPeriod('30days')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === '30days'
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
          <TrendingUp size={48} className="text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-900 mb-2">No data yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-4">
            Your analytics will appear here once people start viewing your profile and menu items.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-orange-800 font-medium mb-2">How to get started:</p>
            <ul className="text-xs text-orange-700 space-y-1 text-left">
              <li>• Share your MenuLove profile link on social media</li>
              <li>• Place your QR code at the counter or on tables</li>
              <li>• Add your link to your website and Google Business</li>
            </ul>
          </div>
        </div>
      )}

      {hasData && (
        <>
          {/* Insights Box */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-orange-600" />
                <h3 className="text-lg font-bold text-zinc-900">This Week Highlights</h3>
              </div>
              <ul className="space-y-2">
                {insights.map((insight, index) => (
                  <li key={index} className="text-sm text-zinc-700 flex items-start gap-2">
                    <span className="text-orange-500 mt-1 font-bold">•</span>
                    <span>{insight.insight_text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Eye size={20} className="text-orange-600" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{summary?.profile_views || 0}</p>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">Profile Views</p>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Eye size={20} className="text-blue-600" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{summary?.item_views || 0}</p>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">Item Views</p>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Video size={20} className="text-green-600" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{summary?.video_plays || 0}</p>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">Video Plays</p>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Navigation size={20} className="text-purple-600" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{summary?.actions || 0}</p>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">Actions</p>
            </div>
          </div>

          {/* Conversion Funnel */}
          {funnel.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Conversion Funnel</h3>
              <div className="space-y-3">
                {funnel.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-700">{step.step}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-900">{step.count}</span>
                        <span className="text-xs text-zinc-500 w-12 text-right">{step.conversion_rate}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-orange-400 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${step.conversion_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                Shows how visitors move through your profile: viewing → engaging → taking action
              </p>
            </div>
          )}

          {/* Top Performing Items */}
          {topItems.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Top Performing Items</h3>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-zinc-600 uppercase">Item</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-600 uppercase">Views</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-600 uppercase">Plays</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-600 uppercase">
                        <Heart size={12} className="inline" />
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-600 uppercase">
                        <Bookmark size={12} className="inline" />
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-zinc-600 uppercase">
                        <Share2 size={12} className="inline" />
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-zinc-600 uppercase">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item, index) => (
                      <tr key={item.item_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs font-bold text-orange-600">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{item.item_name}</p>
                              <p className="text-xs text-zinc-500">{item.item_type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-sm font-semibold text-zinc-900">{item.views}</td>
                        <td className="py-3 px-2 text-center text-sm text-zinc-700">{item.video_plays}</td>
                        <td className="py-3 px-2 text-center text-sm text-zinc-700">{item.likes}</td>
                        <td className="py-3 px-2 text-center text-sm text-zinc-700">{item.saves}</td>
                        <td className="py-3 px-2 text-center text-sm text-zinc-700">{item.shares}</td>
                        <td className="py-3 px-2 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            item.engagement_rate >= 10 ? 'bg-green-100 text-green-700' :
                            item.engagement_rate >= 5 ? 'bg-orange-100 text-orange-700' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {item.engagement_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                Engagement Rate = (Likes + Saves + Shares) / Views
              </p>
            </div>
          )}

          {/* Peak Hours Chart */}
          {peakHours.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-900">Peak Hours</h3>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-lg">
                  <Clock size={16} className="text-orange-600" />
                  <span className="text-sm font-bold text-orange-700">{getPeakWindow(peakHours)}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#71717a" 
                    fontSize={11}
                    tickFormatter={(hour) => formatHour(hour)}
                  />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    labelFormatter={(hour) => formatHour(Number(hour))}
                  />
                  <Bar dataKey="views" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-zinc-500 mt-4">
                Shows when your profile gets the most views throughout the day
              </p>
            </div>
          )}

          {/* Device Breakdown */}
          {summary && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Device Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Smartphone size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Mobile</p>
                      <p className="text-2xl font-bold text-orange-600">{summary.mobile_percentage}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${summary.mobile_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-zinc-200 rounded-lg flex items-center justify-center">
                      <Monitor size={20} className="text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Desktop</p>
                      <p className="text-2xl font-bold text-zinc-700">{summary.desktop_percentage}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div 
                      className="bg-zinc-500 h-2 rounded-full transition-all"
                      style={{ width: `${summary.desktop_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-zinc-200 rounded-lg flex items-center justify-center">
                      <Tablet size={20} className="text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Tablet</p>
                      <p className="text-2xl font-bold text-zinc-700">{summary.tablet_percentage}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div 
                      className="bg-zinc-500 h-2 rounded-full transition-all"
                      style={{ width: `${summary.tablet_percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RestaurantAnalytics;
