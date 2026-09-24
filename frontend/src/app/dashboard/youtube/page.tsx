'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { YoutubeIcon } from '@/components/icons/youtube-icon';
import { 
  Download,
  Users, 
  Eye,
  Video, 
  Clock, 
  ThumbsUp, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Calendar, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  Key,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Legend,
  LineChart,
  Line
} from 'recharts';
import axios from 'axios';

type Channel = {
  id: number;
  channelId: string;
  title: string;
  description?: string;
  customUrl?: string;
  thumbnailUrl?: string;
  subscribers: number;
  totalViews: string;
  totalVideos: number;
  status: string;
  lastSyncedAt?: string;
  googleAccountEmail?: string;
  isOAuth?: boolean;
  authType?: 'oauth' | 'identifier';
};

type VideoItem = {
  id: number;
  videoId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  duration: string;
  views: number;
  likes: number;
  comments: number;
  channel?: {
    id: number;
    title: string;
    thumbnailUrl?: string;
    customUrl?: string;
  };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = label === todayStr;
    const dateFormatted = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <div className="bg-slate-950/95 dark:bg-[#090d16]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl min-w-[210px] text-xs space-y-2">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
          <span className="font-bold text-white">{dateFormatted}</span>
          {isToday && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry
            </span>
          )}
        </div>
        <div className="space-y-1.5 pt-0.5">
          {payload.map((entry: any, index: number) => {
            const isGained = entry.dataKey === 'subscribersGained' || entry.name?.toLowerCase().includes('gain');
            const isLost = entry.dataKey === 'subscribersLost' || entry.name?.toLowerCase().includes('lost');
            const valNum = Number(entry.value || 0);

            return (
              <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-300 font-medium">{entry.name}:</span>
                </div>
                <span className={`font-bold ${isGained && valNum > 0 ? 'text-emerald-400' : isLost && valNum > 0 ? 'text-rose-400' : 'text-white'}`}>
                  {isGained && valNum > 0 ? `+${valNum.toLocaleString()}` : ''}
                  {isLost && valNum > 0 ? `-${valNum.toLocaleString()}` : ''}
                  {!isGained && !isLost ? valNum.toLocaleString() : (valNum === 0 ? '0' : '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

function YouTubeDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State Management
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('28d');
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [overview, setOverview] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoTotal, setVideoTotal] = useState<number>(0);
  const [videoPage, setVideoPage] = useState<number>(1);
  const [videoTotalPages, setVideoTotalPages] = useState<number>(1);
  const [videoSearch, setVideoSearch] = useState<string>('');
  const [videoSort, setVideoSort] = useState<string>('publishedAt');
  const [videoOrder, setVideoOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [lastLiveUpdated, setLastLiveUpdated] = useState<string>('');
  const [isLiveRefreshing, setIsLiveRefreshing] = useState<boolean>(false);

  // Config & Modals
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'track' | 'oauth'>('track');
  const [trackIdentifier, setTrackIdentifier] = useState<string>('');
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState<boolean>(false);

  const [oauthConfigured, setOauthConfigured] = useState<boolean>(false);
  const [oauthUrl, setOauthUrl] = useState<string>('');
  const [config, setConfig] = useState<{
    oauthConfigured: boolean;
    apiKeyConfigured: boolean;
    redirectUri: string;
    clientId: string;
    maskedApiKey: string;
  } | null>(null);

  // Handle URL Callback Parameters (e.g. from Google OAuth redirect)
  useEffect(() => {
    const status = searchParams.get('status');
    const message = searchParams.get('message');
    const channelTitle = searchParams.get('title');

    if (status === 'connected') {
      setNotification({
        type: 'success',
        message: `Successfully connected channel "${channelTitle || 'YouTube Channel'}"! Live data synced.`,
      });
      router.replace('/dashboard/youtube');
    } else if (status === 'error') {
      setNotification({
        type: 'error',
        message: decodeURIComponent(message || 'Failed to authenticate with Google.'),
      });
      router.replace('/dashboard/youtube');
    }
  }, [searchParams, router]);

  // Fetch YouTube API & OAuth Config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/youtube/config');
      setConfig(res.data);
      setOauthConfigured(Boolean(res.data.oauthConfigured));
    } catch (e) {
      console.error('Failed to fetch YouTube config', e);
    }
  }, []);

  // Fetch OAuth Status & URL
  const checkOAuthStatus = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/youtube/auth/url');
      setOauthConfigured(Boolean(res.data.configured));
      setOauthUrl(res.data.url || '');
    } catch (e) {
      console.error('Failed to check OAuth status', e);
      setOauthConfigured(false);
    }
  }, []);

  // Fetch Channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/youtube/channels');
      setChannels(res.data || []);
    } catch (e) {
      console.error('Failed to fetch channels', e);
    }
  }, []);

  // Fetch Overview Metrics
  const fetchOverview = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/youtube/overview', {
        params: { channelId: selectedChannelId, range: dateRange },
      });
      setOverview(res.data);
    } catch (e) {
      console.error('Failed to fetch overview stats', e);
    }
  }, [selectedChannelId, dateRange]);

  // Fetch Timeseries Data for Charts
  const fetchTimeseries = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/youtube/analytics', {
        params: { channelId: selectedChannelId, range: dateRange },
      });
      setTimeseries(res.data || []);
    } catch (e) {
      console.error('Failed to fetch analytics timeseries', e);
    }
  }, [selectedChannelId, dateRange]);

  const [videosLoading, setVideosLoading] = useState<boolean>(false);

  // Fetch Videos with Pagination & Search
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/youtube/videos', {
        params: {
          channelId: selectedChannelId,
          search: videoSearch,
          sort: videoSort,
          order: videoOrder,
          page: videoPage,
          limit: 10,
        },
      });
      setVideos(res.data.items || []);
      setVideoTotal(res.data.total || 0);
      setVideoTotalPages(res.data.totalPages || 1);
    } catch (e) {
      console.error('Failed to fetch videos', e);
    } finally {
      setVideosLoading(false);
    }
  }, [selectedChannelId, videoSearch, videoSort, videoOrder, videoPage]);

  // Initial Config & Channels Loading Effect (runs once or on OAuth status)
  useEffect(() => {
    fetchConfig();
    checkOAuthStatus();
    fetchChannels();
  }, [fetchConfig, checkOAuthStatus, fetchChannels]);

  // Channel & Date Range Overview / Analytics Effect
  useEffect(() => {
    const loadDashboardMetrics = async () => {
      setLoading(true);
      await Promise.all([
        fetchOverview(),
        fetchTimeseries(),
      ]);
      setLoading(false);
    };
    loadDashboardMetrics();
  }, [fetchOverview, fetchTimeseries]);

  // Separate Fast Videos Loading Effect (runs instantly on page/search/sort change without freezing dashboard)
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Silent Live Refresh Callback
  const refreshLiveData = useCallback(async () => {
    setIsLiveRefreshing(true);
    try {
      await Promise.all([
        fetchOverview(),
        fetchTimeseries(),
        fetchChannels(),
      ]);
      setLastLiveUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Live telemetry refresh failed', e);
    } finally {
      setIsLiveRefreshing(false);
    }
  }, [fetchOverview, fetchTimeseries, fetchChannels]);

  // Real-Time Polling & Tab Visibility Listener
  useEffect(() => {
    setLastLiveUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    // Poll every 25 seconds for live telemetry
    const interval = setInterval(() => {
      refreshLiveData();
    }, 25000);

    // Refresh immediately when user returns to tab / window gains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLiveData();
      }
    };
    const handleFocus = () => {
      refreshLiveData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshLiveData]);

  // Sync Action
  const handleSync = async () => {
    setSyncing(true);
    try {
      if (selectedChannelId === 'all') {
        const res = await axios.post('http://localhost:3001/api/youtube/sync-all');
        setNotification({
          type: 'success',
          message: `Synchronized ${res.data.syncedCount || 0} YouTube channels successfully!`,
        });
      } else {
        const res = await axios.post(`http://localhost:3001/api/youtube/channels/${selectedChannelId}/sync`);
        setNotification({
          type: 'success',
          message: res.data.message || 'Channel synchronized successfully!',
        });
      }
      await Promise.all([fetchChannels(), fetchOverview(), fetchTimeseries(), fetchVideos()]);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setNotification({ type: 'error', message: `Sync failed: ${msg}` });
    } finally {
      setSyncing(false);
      setTimeout(() => setNotification(null), 8000);
    }
  };

  // Track Channel Action (by Handle, URL, or ID)
  const handleTrackChannel = async (identifierOverride?: string) => {
    const target = identifierOverride || trackIdentifier;
    if (!target.trim()) {
      setNotification({ type: 'error', message: 'Please enter a channel handle, URL, or channel ID.' });
      return;
    }

    setTrackingLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/api/youtube/channels/track', {
        identifier: target.trim(),
      });

      setNotification({
        type: 'success',
        message: res.data.message || `Channel "${res.data.channel?.title}" tracked successfully!`,
      });
      setShowConnectModal(false);
      setTrackIdentifier('');

      await Promise.all([fetchConfig(), fetchChannels(), fetchOverview(), fetchTimeseries(), fetchVideos()]);
      if (res.data.channel?.id) {
        setSelectedChannelId(String(res.data.channel.id));
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setNotification({ type: 'error', message: `Tracking failed: ${msg}` });
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCopyRedirectUri = () => {
    const uri = config?.redirectUri || 'http://localhost:3001/api/youtube/auth/callback';
    navigator.clipboard.writeText(uri);
    setCopiedRedirectUri(true);
    setTimeout(() => setCopiedRedirectUri(false), 2500);
  };

  // Disconnect Channel Action
  const handleDisconnect = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to disconnect channel "${title}"?`)) return;
    try {
      await axios.delete(`http://localhost:3001/api/youtube/channels/${id}`);
      setNotification({ type: 'success', message: `Channel "${title}" has been disconnected.` });
      setSelectedChannelId('all');
      await Promise.all([fetchChannels(), fetchOverview(), fetchTimeseries(), fetchVideos()]);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      setNotification({ type: 'error', message: `Failed to disconnect: ${msg}` });
    }
  };

  const handleConnectClick = (tab: 'track' | 'oauth' = 'track') => {
    setModalTab(tab);
    setShowConnectModal(true);
  };

  const activeChannel = channels.find((c) => String(c.id) === String(selectedChannelId));
  const isChannelOAuth = (ch?: Channel | null): boolean => {
    if (!ch) return false;
    return Boolean(
      ch.isOAuth === true ||
      ch.authType === 'oauth' ||
      (ch.googleAccountEmail && ch.googleAccountEmail.trim().length > 0)
    );
  };
  const hasAnalyticsAccess = activeChannel
    ? isChannelOAuth(activeChannel)
    : (overview?.hasAnalyticsAccess ?? channels.some(isChannelOAuth));
  const isIdentifierChannel = activeChannel
    ? !isChannelOAuth(activeChannel)
    : (channels.length > 0 && channels.every((c) => !isChannelOAuth(c)));

  return (
    <div className="space-y-6">
      {/* Top Banner / Alert */}
      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-emerald-500/5'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 shadow-red-500/5'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{notification.type === 'success' ? 'Operation Completed' : 'Attention'}</p>
            <p className="text-xs opacity-90">{notification.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotification(null)}
            className="text-xs h-7 px-2 rounded-full opacity-70 hover:opacity-100"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Public Identifier Information Banner - ONLY shown for Public Identifier channels */}
      {isIdentifierChannel && activeChannel && !isChannelOAuth(activeChannel) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm backdrop-blur-md">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30 shadow-inner">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Channel "{activeChannel.title}" Connected via Public Identifier
                </h3>
                <span className="py-0.5 px-2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  Public Metadata Only
                </span>
                <span className="py-0.5 px-2 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                  Cannot Access YouTube Studio
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-amber-200/80 mt-1 leading-relaxed max-w-3xl">
                This channel is tracked using its public YouTube handle/ID. YouTube does not allow access to private YouTube Studio analytics such as <strong>Watch Time</strong>, <strong>Audience Retention</strong>, <strong>Video Shares</strong>, and <strong>Subscriber Churn</strong> without Google OAuth authorization. Public metrics (Total Subscribers, Lifetime Views, Video Catalog, Likes, and Comments) are fully active.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleConnectClick('oauth')}
            className="rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold text-xs px-4 py-2 shrink-0 shadow-md shadow-red-600/20 gap-1.5 cursor-pointer"
          >
            <YoutubeIcon className="w-3.5 h-3.5" />
            Connect via Google OAuth
          </Button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/30">
            <YoutubeIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                YouTube Dashboard
              </h1>
              <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Official API v3
              </span>
              <span
                className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                title="Live real-time subscriber and analytics telemetry"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Real-Time Live Active
              </span>
              {config?.apiKeyConfigured && (
                <span
                  className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  title="YouTube Data API integration active"
                >
                  <Key className="w-3 h-3" />
                  API Active
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1 flex flex-wrap items-center gap-2">
              <span>Live multi-channel performance, audience metrics, and video analytics</span>
              {lastLiveUpdated && (
                <span className="text-[11px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ⚡ Live updated {lastLiveUpdated}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Channel Selector Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedChannelId}
              onChange={(e) => {
                if (e.target.value === '__add__') {
                  handleConnectClick('track');
                } else {
                  setSelectedChannelId(e.target.value);
                  setVideoPage(1);
                }
              }}
              className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold rounded-full px-4 py-2.5 pr-9 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-sm"
            >
              <option value="all" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white py-1">
                All Channels ({channels.length})
              </option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id} className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white py-1">
                  {ch.title} {ch.isOAuth ? '[Studio]' : '[Public]'}
                </option>
              ))}
              <option value="__add__" className="bg-white dark:bg-[#090d16] text-red-500 font-bold py-1">
                + Track / Connect Channel...
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold rounded-full px-4 py-2.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-sm"
            >
              <option value="7d" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Last 7 Days</option>
              <option value="28d" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Last 28 Days</option>
              <option value="90d" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Last 90 Days</option>
              <option value="1y" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Last Year</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sync Button */}
          <Button
            onClick={handleSync}
            disabled={syncing || channels.length === 0}
            variant="outline"
            className="rounded-full text-xs font-semibold px-4 py-2.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 gap-1.5 shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing || isLiveRefreshing ? 'animate-spin text-red-500' : ''}`} />
            {syncing ? 'Syncing...' : isLiveRefreshing ? 'Updating...' : 'Sync Now'}
          </Button>

          {/* Export Report Button */}
          <Button
            onClick={() => router.push(`/dashboard/reports?platform=youtube&channelId=${selectedChannelId}&range=${dateRange}`)}
            variant="outline"
            className="rounded-full text-xs font-semibold px-4 py-2.5 border-slate-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-700 dark:text-gray-200 gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-red-500" />
            Export Report
          </Button>

          {/* Connect Account Button */}
          <Button
            onClick={() => handleConnectClick('track')}
            className="rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white text-xs font-semibold px-5 py-2.5 shadow-md shadow-red-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Connect / Track Channel
          </Button>
        </div>
      </div>

      {/* Active Channel Details Pill (if a single channel is selected) */}
      {activeChannel && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-slate-100/80 dark:bg-white/5 border border-red-500/20 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            {activeChannel.thumbnailUrl ? (
              <img
                src={activeChannel.thumbnailUrl}
                alt={activeChannel.title}
                className="w-12 h-12 rounded-full border-2 border-red-500/40 object-cover shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-400 font-bold flex items-center justify-center">
                YT
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeChannel.title}</h2>
                {activeChannel.customUrl && (
                  <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                    {activeChannel.customUrl}
                  </span>
                )}
                {isChannelOAuth(activeChannel) ? (
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Google OAuth (Studio Verified)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    Public Identifier (Public Stats Only)
                  </span>
                )}
                <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Channel ID: <code className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{activeChannel.channelId}</code>
                {activeChannel.googleAccountEmail && (
                  <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                    • Account: {activeChannel.googleAccountEmail}
                  </span>
                )}
                {activeChannel.lastSyncedAt && (
                  <span className="ml-2 font-medium">
                    • Last Synced: {new Date(activeChannel.lastSyncedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://www.youtube.com/channel/${activeChannel.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
            >
              Open on YouTube <ExternalLink className="w-3 h-3" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDisconnect(activeChannel.id, activeChannel.title)}
              className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full px-3"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {/* Channels Empty State */}
      {channels.length === 0 && !loading && (
        <Card className="glass border border-red-500/30 rounded-3xl p-8 text-center bg-gradient-to-b from-red-500/5 to-transparent">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto shadow-inner border border-red-500/20">
              <YoutubeIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No YouTube Channels Connected</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Track any channel by entering its @handle, URL, or Channel ID, or authorize your YouTube channel securely with Google OAuth 2.0.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => handleConnectClick('track')}
                className="rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold px-6 py-2.5 shadow-lg shadow-red-600/30 gap-2 text-xs"
              >
                <Search className="w-4 h-4" />
                Track Channel by @Handle / URL
              </Button>
              <Button
                onClick={() => handleConnectClick('oauth')}
                variant="outline"
                className="rounded-full border-red-500/30 text-slate-700 dark:text-gray-200 hover:bg-red-500/10 font-semibold px-6 py-2.5 gap-2 text-xs"
              >
                <YoutubeIcon className="w-4 h-4 text-red-500" />
                Sign in with Google OAuth
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Overview Cards Grid (8 KPI cards including all YouTube Studio metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Subscribers',
            value: (overview?.subscribers || 0).toLocaleString(),
            sub: hasAnalyticsAccess && overview?.netSubscribers !== null && overview?.netSubscribers !== undefined
              ? `${overview?.netSubscribers >= 0 ? '+' : ''}${(overview?.netSubscribers || 0).toLocaleString()} net in period`
              : `Total public subscribers`,
            icon: Users,
            color: 'text-red-500',
            bg: 'from-red-500/20 to-pink-500/20',
            live: true,
            locked: false,
          },
          {
            label: 'Total Views',
            value: Number(overview?.totalViews || 0).toLocaleString(),
            sub: hasAnalyticsAccess && overview?.periodViews
              ? `${Number(overview.periodViews).toLocaleString()} in ${dateRange}`
              : 'Cumulative channel views',
            icon: Eye,
            color: 'text-indigo-500',
            bg: 'from-indigo-500/20 to-purple-500/20',
            live: true,
            locked: false,
          },
          {
            label: 'Total Videos',
            value: (overview?.totalVideos || 0).toLocaleString(),
            sub: `${videos.length} videos cataloged`,
            icon: Video,
            color: 'text-purple-500',
            bg: 'from-purple-500/20 to-pink-500/20',
            live: false,
            locked: false,
          },
          {
            label: 'Watch Time (Hours)',
            value: hasAnalyticsAccess
              ? `${Number(overview?.watchTimeHours ?? 0).toLocaleString()} hrs`
              : 'Cannot Access',
            sub: hasAnalyticsAccess
              ? `${Number(overview?.watchTimeMinutes ?? 0).toLocaleString()} mins watched (${dateRange})`
              : 'Requires Google OAuth login',
            icon: hasAnalyticsAccess ? Clock : Lock,
            color: hasAnalyticsAccess ? 'text-amber-500' : 'text-amber-600 dark:text-amber-400',
            bg: hasAnalyticsAccess ? 'from-amber-500/20 to-orange-500/20' : 'from-amber-500/10 to-orange-500/10',
            live: false,
            locked: !hasAnalyticsAccess,
          },
          {
            label: 'Avg View Duration',
            value: hasAnalyticsAccess
              ? (overview?.averageViewDurationSeconds
                  ? `${Math.floor(overview.averageViewDurationSeconds / 60)}m ${overview.averageViewDurationSeconds % 60}s`
                  : '0m 0s')
              : 'Cannot Access',
            sub: hasAnalyticsAccess
              ? `Studio audience retention (${dateRange})`
              : 'Requires Google OAuth login',
            icon: hasAnalyticsAccess ? Sparkles : Lock,
            color: hasAnalyticsAccess ? 'text-cyan-500' : 'text-slate-400',
            bg: hasAnalyticsAccess ? 'from-cyan-500/20 to-blue-500/20' : 'from-slate-500/10 to-slate-500/10',
            live: false,
            locked: !hasAnalyticsAccess,
          },
          {
            label: 'Subscribers Gained',
            value: hasAnalyticsAccess
              ? `+${Number(overview?.subscribersGained ?? 0).toLocaleString()}`
              : 'Cannot Access',
            sub: hasAnalyticsAccess ? `Studio growth (${dateRange})` : 'Daily churn requires Google OAuth',
            icon: hasAnalyticsAccess ? TrendingUp : Lock,
            color: hasAnalyticsAccess ? 'text-emerald-500' : 'text-slate-400',
            bg: hasAnalyticsAccess ? 'from-emerald-500/20 to-green-500/20' : 'from-slate-500/10 to-slate-500/10',
            live: hasAnalyticsAccess,
            locked: !hasAnalyticsAccess,
          },
          {
            label: 'Subscribers Lost',
            value: hasAnalyticsAccess
              ? `-${Number(overview?.subscribersLost ?? 0).toLocaleString()}`
              : 'Cannot Access',
            sub: hasAnalyticsAccess ? `Unsubscribes (${dateRange})` : 'Unsubscribes require Google OAuth',
            icon: hasAnalyticsAccess ? TrendingDown : Lock,
            color: hasAnalyticsAccess ? 'text-rose-500' : 'text-slate-400',
            bg: hasAnalyticsAccess ? 'from-rose-500/20 to-red-500/20' : 'from-slate-500/10 to-slate-500/10',
            live: false,
            locked: !hasAnalyticsAccess,
          },
          {
            label: 'Video Shares',
            value: hasAnalyticsAccess
              ? `${Number(overview?.shares ?? 0).toLocaleString()} shares`
              : 'Cannot Access',
            sub: hasAnalyticsAccess ? `Official Studio shares (${dateRange})` : 'Share tracking requires Google OAuth',
            icon: hasAnalyticsAccess ? Share2 : Lock,
            color: hasAnalyticsAccess ? 'text-pink-500' : 'text-slate-400',
            bg: hasAnalyticsAccess ? 'from-pink-500/20 to-rose-500/20' : 'from-slate-500/10 to-slate-500/10',
            live: false,
            locked: !hasAnalyticsAccess,
          },
        ].map((card, i) => (
          <Card
            key={i}
            className={`rounded-2xl p-5 shadow-sm card-interactive transition-all border ${
              card.locked
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</span>
                {card.live && (
                  <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE
                  </span>
                )}
                {card.locked && (
                  <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                    <Lock className="w-2.5 h-2.5" />
                    STUDIO ONLY
                  </span>
                )}
              </div>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${card.bg} flex items-center justify-center ${card.color} shadow-xs`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${card.locked ? 'text-amber-700 dark:text-amber-400 text-sm flex items-center gap-1.5 py-1' : 'text-slate-900 dark:text-white'}`}>
              {card.locked && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              {card.value}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {card.sub}
            </p>
          </Card>
        ))}
      </div>

      {/* Multi-Channel Comparison (Shown when 'All Channels' is selected and > 1 channel exists) */}
      {selectedChannelId === 'all' && channels.length > 0 && (
        <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-red-500" />
                  Connected YouTube Channels Overview
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Aggregate comparison of all authorized YouTube accounts
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full border border-purple-200 dark:border-white/10">
                {channels.length} {channels.length === 1 ? 'Channel' : 'Channels'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-purple-100 dark:border-white/10 hover:border-red-500/40 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    {ch.thumbnailUrl ? (
                      <img
                        src={ch.thumbnailUrl}
                        alt={ch.title}
                        className="w-12 h-12 rounded-full object-cover border border-red-500/30 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 font-bold flex items-center justify-center shrink-0">
                        YT
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate" title={ch.title}>
                        {ch.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                        {ch.customUrl || ch.googleAccountEmail || ch.channelId}
                      </p>
                      <div className="mt-1">
                        {isChannelOAuth(ch) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Google OAuth
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Key className="w-2.5 h-2.5" />
                            Public Identifier
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center text-xs py-2 px-3 rounded-xl bg-slate-100/70 dark:bg-black/20 border border-slate-200/50 dark:border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 block">Subscribers</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {Number(ch.subscribers || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 block">Videos</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {ch.totalVideos || 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/10 text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-gray-400">
                      {ch.lastSyncedAt
                        ? `Synced ${new Date(ch.lastSyncedAt).toLocaleDateString()}`
                        : 'Not synced yet'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedChannelId(String(ch.id));
                        setVideoPage(1);
                      }}
                      className="rounded-full text-xs font-semibold h-8 px-3.5 hover:border-red-500 hover:text-red-500"
                    >
                      View Channel →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views & Watch Time Trend */}
        <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-500" />
                  Views & Watch Time Trend
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Daily viewer traffic and watch time hours ({dateRange})
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {!hasAnalyticsAccess && (
                  <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                    Watch Time: Cannot Access (Studio Only)
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Live Daily
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2 h-80">
            {timeseries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 text-xs">
                <Calendar className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
                No daily time-series data recorded for this range yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViewsYt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorWatchYt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="views" name="Views" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorViewsYt)" />
                  {hasAnalyticsAccess && (
                    <Area type="monotone" dataKey="watchTimeHours" name="Watch Time (Hrs)" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorWatchYt)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Subscriber Growth (Gained vs Lost) */}
        <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Subscriber Growth
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Subscribers gained vs lost per day ({dateRange})
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold border ${
                hasAnalyticsAccess
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}>
                {hasAnalyticsAccess ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Real-Time Live
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-amber-500" />
                    Cannot Access (Studio Only)
                  </>
                )}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2 h-80">
            {!hasAnalyticsAccess ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 border border-amber-500/20 shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cannot Access YouTube Studio Subscriber Churn
                </h4>
                <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mt-1.5 mb-4 leading-relaxed">
                  YouTube Studio does not expose daily subscribers gained or lost publicly. This channel is connected via Public Identifier only. Connect via Google OAuth to unlock studio churn curves.
                </p>
                <Button
                  size="sm"
                  onClick={() => handleConnectClick('oauth')}
                  className="rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white text-xs px-4 py-1.5 shadow-md shadow-red-600/20 gap-1.5 cursor-pointer"
                >
                  <YoutubeIcon className="w-3.5 h-3.5" />
                  Unlock with Google OAuth
                </Button>
              </div>
            ) : timeseries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 text-xs">
                <Users className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
                No subscriber growth data recorded for this range yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeseries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="subscribersGained" name="Subscribers Gained" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="subscribersLost" name="Subscribers Lost" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Engagement Over Time (Likes, Comments, Shares) */}
        <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden lg:col-span-2">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-pink-500" />
                  Audience Engagement Over Time
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Tracking likes, comments{hasAnalyticsAccess ? ', and shares' : ''} across video uploads ({dateRange})
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {!hasAnalyticsAccess && (
                  <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Public Video Data
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                  Live Telemetry
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2 h-72">
            {timeseries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 text-xs">
                <Share2 className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
                No engagement records found for this range yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="likes" name="Likes" stroke="#ec4899" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="comments" name="Comments" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
                  {hasAnalyticsAccess && (
                    <Line type="monotone" dataKey="shares" name="Shares" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Videos Section */}
      <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-purple-100 dark:border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                Channel Video Explorer
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Showing {videos.length} of {videoTotal} video uploads
              </p>
            </div>

            {/* Video Controls: Search, Sort */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search videos..."
                  value={videoSearch}
                  onChange={(e) => {
                    setVideoSearch(e.target.value);
                    setVideoPage(1);
                  }}
                  className="rounded-full pl-9 pr-4 py-1.5 text-xs h-9 bg-slate-100 dark:bg-white/5 border-purple-200 dark:border-white/10 w-48 sm:w-60 focus-visible:ring-red-500"
                />
              </div>

              <div className="relative">
                <select
                  value={videoSort}
                  onChange={(e) => {
                    setVideoSort(e.target.value);
                    setVideoPage(1);
                  }}
                  className="rounded-full px-3.5 py-1.5 text-xs h-9 bg-slate-100 dark:bg-white/5 border border-purple-200 dark:border-white/10 text-slate-900 dark:text-white font-medium appearance-none pr-8 cursor-pointer"
                >
                  <option value="publishedAt" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Latest Published</option>
                  <option value="views" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Most Viewed</option>
                  <option value="likes" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Most Liked</option>
                  <option value="comments" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Most Comments</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVideoOrder(videoOrder === 'ASC' ? 'DESC' : 'ASC')}
                className="h-9 px-3 rounded-full text-xs font-semibold"
                title={`Sort ${videoOrder === 'ASC' ? 'Descending' : 'Ascending'}`}
              >
                {videoOrder === 'ASC' ? '▲ Asc' : '▼ Desc'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto relative">
            {videosLoading && (
              <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900/90 text-cyan-400 text-xs px-3.5 py-1.5 rounded-full border border-cyan-500/30 flex items-center gap-2 shadow-lg">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating videos...
                </div>
              </div>
            )}
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-cyan-300 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6 whitespace-nowrap">Video</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Channel</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Duration</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Views</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Likes</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Comments</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Published</th>
                  <th className="py-3.5 px-6 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 dark:divide-white/5 text-xs transition-opacity duration-150 ${videosLoading ? 'opacity-50' : 'opacity-100'}`}>
                {videos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-gray-400">
                      {channels.length === 0
                        ? 'Connect a YouTube channel to view and manage uploaded videos.'
                        : 'No videos match the current search filter.'}
                    </td>
                  </tr>
                ) : (
                  videos.map((vid) => (
                    <tr key={vid.id} className="hover:bg-cyan-500/5 transition-colors">
                      {/* Video Title & Thumbnail */}
                      <td className="py-3 px-6 max-w-sm">
                        <div className="flex items-center gap-3">
                          <div className="relative w-20 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-200 dark:border-white/10 group cursor-pointer" onClick={() => setSelectedVideo(vid)}>
                            {vid.thumbnailUrl ? (
                              <img src={vid.thumbnailUrl} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-red-600/20 text-red-500">
                                <Video className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setSelectedVideo(vid)}
                              className="font-bold text-slate-900 dark:text-white hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors text-left line-clamp-2 cursor-pointer"
                              title={vid.title}
                            >
                              {vid.title}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-gray-300">
                          {vid.channel?.thumbnailUrl && (
                            <img src={vid.channel.thumbnailUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                          )}
                          {vid.channel?.title || 'YouTube'}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono text-slate-600 dark:text-gray-300">
                        {vid.duration}
                      </td>

                      {/* Views */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-cyan-600 dark:text-cyan-400">
                        {(vid.views || 0).toLocaleString()}
                      </td>

                      {/* Likes */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-pink-600 dark:text-pink-400">
                        {(vid.likes || 0).toLocaleString()}
                      </td>

                      {/* Comments */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        {(vid.comments || 0).toLocaleString()}
                      </td>

                      {/* Published */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-gray-400 font-medium">
                        {new Date(vid.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedVideo(vid)}
                            className="text-xs h-7 px-3 rounded-full hover:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold cursor-pointer"
                          >
                            Details
                          </Button>
                          <a
                            href={`https://www.youtube.com/watch?v=${vid.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                          >
                            Watch <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Fast Pagination Controls */}
          {videoTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-gray-400 select-none">
              <div>
                Page <strong>{videoPage}</strong> of <strong>{videoTotalPages}</strong> ({videoTotal} total videos)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={videoPage <= 1 || videosLoading}
                  onClick={() => setVideoPage((p) => Math.max(1, p - 1))}
                  className="rounded-full h-8 px-3.5 text-xs font-bold border-slate-200 dark:border-white/10 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={videoPage >= videoTotalPages || videosLoading}
                  onClick={() => setVideoPage((p) => Math.min(videoTotalPages, p + 1))}
                  className="rounded-full h-8 px-3.5 text-xs font-bold border-slate-200 dark:border-white/10 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer transition-all"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Details Modal - High-Tech Widescreen Layout */}
      <Dialog open={selectedVideo !== null} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl sm:max-w-4xl lg:max-w-5xl bg-white dark:bg-[#080d1a] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
          {selectedVideo && (
            <div className="space-y-6">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-500 flex items-center justify-center font-bold text-sm border border-red-500/20">
                    <YoutubeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      Video Intelligence & Breakdown
                    </span>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      Channel: <strong className="text-slate-900 dark:text-white">{selectedVideo.channel?.title || 'YouTube Channel'}</strong> • Published {new Date(selectedVideo.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Col: Large HD Thumbnail Preview + 3 Stat Tiles + CTA */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-200 dark:border-slate-800 shadow-xl group">
                    {selectedVideo.thumbnailUrl && (
                      <img src={selectedVideo.thumbnailUrl} alt={selectedVideo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 right-3 bg-black/80 text-white font-mono text-xs px-2.5 py-1 rounded-lg border border-white/10 font-bold backdrop-blur-sm">
                      {selectedVideo.duration}
                    </div>
                  </div>

                  {/* 3 Metric Tiles Grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Views</span>
                      <span className="font-black text-base text-cyan-600 dark:text-cyan-400">
                        {(selectedVideo.views || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Likes</span>
                      <span className="font-black text-base text-pink-500 dark:text-pink-400">
                        {(selectedVideo.likes || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Comments</span>
                      <span className="font-black text-base text-emerald-500 dark:text-emerald-400">
                        {(selectedVideo.comments || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Watch Link */}
                  <a
                    href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white px-5 py-3 rounded-2xl transition-all shadow-lg shadow-red-600/25 hover:shadow-red-600/40 cursor-pointer"
                  >
                    <YoutubeIcon className="w-4 h-4" /> Watch on YouTube <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Right Col: Video Title & Spacious Formatted Description */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                      {selectedVideo.title}
                    </h3>
                  </div>

                  <div className="flex-1 space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                      Video Description & Metadata
                    </span>
                    <div className="text-xs leading-relaxed text-slate-700 dark:text-gray-300 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 max-h-[300px] overflow-y-auto whitespace-pre-wrap custom-scrollbar font-normal">
                      {selectedVideo.description || 'No description provided for this video.'}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedVideo(null)} 
                      className="rounded-xl px-5 h-10 text-xs font-bold border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                    >
                      Close Window
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Connect Channel / Setup Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="max-w-2xl sm:max-w-2xl lg:max-w-3xl bg-white dark:bg-[#080d1a] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shadow-inner shrink-0">
                  <YoutubeIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Connect YouTube Channel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                    Track any channel via official YouTube Data API v3 or connect your own channel via Google OAuth.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-purple-100 dark:border-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('track')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === 'track'
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Track Channel (@Handle / URL)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('oauth')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === 'oauth'
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md shadow-red-600/20'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <YoutubeIcon className="w-3.5 h-3.5" />
                Google OAuth 2.0
              </button>
            </div>

            {/* Tab 1: Track by Handle / URL / ID */}
            {modalTab === 'track' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 dark:text-gray-300 block">
                    YouTube Channel Identifier
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={trackIdentifier}
                        onChange={(e) => setTrackIdentifier(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleTrackChannel();
                        }}
                        placeholder="e.g. @mkbhd"
                        className="rounded-2xl pl-9 text-xs h-11 border-purple-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <Button
                      onClick={() => handleTrackChannel()}
                      disabled={trackingLoading || !trackIdentifier.trim()}
                      className="rounded-2xl px-6 h-11 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold text-xs shadow-md shadow-red-600/30 gap-2 shrink-0"
                    >
                      {trackingLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Tracking...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Track Channel
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Quick Samples */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 dark:text-gray-500 block mb-1.5">
                    Quick test channels (click to track):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['@mkbhd', '@veritasium', '@TED', '@MrBeast'].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => {
                          setTrackIdentifier(sample);
                          handleTrackChannel(sample);
                        }}
                        className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-purple-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-red-500/40 hover:text-red-500 transition-colors text-[11px] font-medium cursor-pointer"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tracking Info Notice */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-purple-100 dark:border-white/10 flex items-center gap-2.5 text-[11px] text-slate-600 dark:text-gray-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Powered by official YouTube Data API v3. Enter any public channel @handle, URL, or Channel ID to pull genuine subscribers, lifetime views, and recent videos.
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Google OAuth */}
            {modalTab === 'oauth' && (
              <div className="space-y-4 text-xs">
                {oauthConfigured && oauthUrl ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                      Authenticate directly with your Google Account to authorize your own channel. This unlocks private <strong>YouTube Analytics API</strong> metrics including watch time hours, daily retention, and subscriber gains.
                    </p>

                    <Button
                      onClick={() => (window.location.href = oauthUrl)}
                      className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3.5 shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 text-sm"
                    >
                      <YoutubeIcon className="w-4 h-4" />
                      Sign in with Google OAuth
                    </Button>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-purple-100 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-gray-300 text-[11px]">
                          Authorized Redirect URI:
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyRedirectUri}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          {copiedRedirectUri ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copiedRedirectUri ? 'Copied!' : 'Copy URI'}
                        </button>
                      </div>
                      <code className="block p-2 rounded-xl bg-slate-100 dark:bg-black/40 text-[11px] font-mono text-purple-600 dark:text-purple-400 break-all">
                        {config?.redirectUri || 'http://localhost:3001/api/youtube/auth/callback'}
                      </code>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-gray-400 space-y-1">
                      <p>• Make sure this Redirect URI is added in your Google Cloud Console under <strong>Credentials → OAuth 2.0 Web Client</strong>.</p>
                      <p>• If your OAuth consent screen is in <strong>Testing</strong> mode, add your Google login email under <strong>Audience → Test users</strong> to prevent <code>Error 403: access_denied</code>.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4" />
                        Google Cloud OAuth Credentials Required
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        To sign in with Google, add your Google OAuth Client ID and Secret to <code>backend/.env</code>:
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 font-mono text-[11px] space-y-1 text-slate-800 dark:text-gray-300">
                      <div>GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com</div>
                      <div>GOOGLE_CLIENT_SECRET=your_client_secret</div>
                      <div>GOOGLE_REDIRECT_URI=http://localhost:3001/api/youtube/auth/callback</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConnectModal(false)}
                className="rounded-full text-xs px-5"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function YouTubeDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading YouTube Analytics...</div>}>
      <YouTubeDashboardContent />
    </Suspense>
  );
}
