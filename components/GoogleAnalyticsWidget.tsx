import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Eye, Globe, Smartphone, Monitor, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface GAMetrics {
  activeUsers: number;
  totalUsers7d: number;
  totalUsers30d: number;
  pageViews7d: number;
  topPages: Array<{ page: string; title?: string; views: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number; users?: number }>;
  trafficSources: Array<{ source: string; users: number }>;
}

const GoogleAnalyticsWidget: React.FC = () => {
  const [metrics, setMetrics] = useState<GAMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  const loadGAMetrics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call GA4 Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ga4-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data) {
        setMetrics(result.data);
        setLastUpdated(new Date());
        setIsMock(result.isMock || false);
        setSetupMessage(result.message || null);
      } else {
        throw new Error('No data returned from GA4 API');
      }
    } catch (err: any) {
      console.error('[GA Widget] Error loading metrics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGAMetrics();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(loadGAMetrics, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !metrics) {
    return (
      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Globe size={20} className="text-orange-500" />
            Google Analytics
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-zinc-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Globe size={20} className="text-orange-500" />
            Google Analytics
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-zinc-500 mb-3">{error}</p>
          <button
            onClick={loadGAMetrics}
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="bg-white rounded-xl p-6 border border-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <Globe size={20} className="text-orange-500" />
          Google Analytics
        </h3>
        <div className="flex items-center gap-3">
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600"
            title="Open Google Analytics"
          >
            <ExternalLink size={16} />
          </a>
          <button
            onClick={loadGAMetrics}
            disabled={isLoading}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={16} className={`text-zinc-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {lastUpdated && (
            <span className="text-xs text-zinc-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-blue-600" />
            <p className="text-xs font-medium text-blue-600">Active Now</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{metrics.activeUsers}</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-600" />
            <p className="text-xs font-medium text-green-600">7 Days</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{metrics.totalUsers7d}</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-purple-600" />
            <p className="text-xs font-medium text-purple-600">30 Days</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">{metrics.totalUsers30d}</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="text-orange-600" />
            <p className="text-xs font-medium text-orange-600">Page Views</p>
          </div>
          <p className="text-2xl font-bold text-orange-900">{metrics.pageViews7d}</p>
        </div>
      </div>

      {/* Detailed Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Traffic Sources */}
        <div className="p-4 bg-zinc-50 rounded-lg">
          <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            Traffic Sources (7d)
          </h4>
          {metrics.trafficSources && metrics.trafficSources.length > 0 ? (
            <div className="space-y-2.5">
              {metrics.trafficSources.slice(0, 5).map((source, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 font-medium">{source.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">users</span>
                    <div className="w-10 h-7 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-700">{source.users}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No data yet</p>
          )}
        </div>

        {/* Top Pages */}
        <div className="p-4 bg-zinc-50 rounded-lg">
          <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
            <Eye size={16} className="text-purple-500" />
            Top Pages (7d)
          </h4>
          {metrics.topPages && metrics.topPages.length > 0 ? (
            <div className="space-y-2.5">
              {metrics.topPages.slice(0, 5).map((page, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-12 h-8 bg-purple-100 rounded flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-700">{page.views}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-600 truncate font-mono" title={page.page}>
                      {page.page}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">views</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No data yet</p>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="p-4 bg-zinc-50 rounded-lg">
          <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
            <Smartphone size={16} className="text-green-500" />
            Devices (7d)
          </h4>
          {metrics.deviceBreakdown && metrics.deviceBreakdown.length > 0 ? (
            <div className="space-y-2.5">
              {metrics.deviceBreakdown.map((device, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 font-medium">{device.device}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{device.users || 0} users</span>
                    <div className="w-14 h-7 bg-green-100 rounded flex items-center justify-center">
                      <span className="text-sm font-bold text-green-700">{device.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No data yet</p>
          )}
        </div>
      </div>

      {/* Status Notice */}
      {isMock && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 font-medium mb-1 flex items-center gap-2">
            <span>⚠️</span>
            {setupMessage || 'Using Mock Data'}
          </p>
          <p className="text-xs text-amber-600 mb-3">
            The data shown above is simulated. To see real analytics from Google Analytics 4, 
            you need to configure the GA4 Data API integration.
          </p>
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
          >
            Open Google Analytics →
          </a>
        </div>
      )}
      
      {!isMock && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium mb-1 flex items-center gap-2">
            <span>✅</span>
            Live Data Connected
          </p>
          <p className="text-xs text-green-600">
            Showing real-time data from Google Analytics 4 • Updates every 30s
          </p>
        </div>
      )}
    </div>
  );
};

export default GoogleAnalyticsWidget;
