'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { YoutubeIcon } from '@/components/icons/youtube-icon';
import { 
  Users, 
  Eye, 
  Video, 
  Clock, 
  ThumbsUp, 
  MessageSquare, 
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
  ShieldCheck
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

export default function YouTubeDashboardPage() {
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

  // Fetch Videos with Pagination & Search
  const fetchVideos = useCallback(async () => {
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
    }
  }, [selectedChannelId, videoSearch, videoSort, videoOrder, videoPage]);

  // Main Data Loading Effect
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchConfig(),
        checkOAuthStatus(),
        fetchChannels(),
        fetchOverview(),
        fetchTimeseries(),
        fetchVideos(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [fetchConfig, checkOAuthStatus, fetchChannels, fetchOverview, fetchTimeseries, fetchVideos]);

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

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/30">
            <YoutubeIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                YouTube Dashboard
              </h1>
              <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Official API v3
              </span>
              {config?.apiKeyConfigured && (
                <span
                  className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  title="YouTube Data API integration active"
                >
                  <Key className="w-3 h-3" />
                  API Active
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
              Live multi-channel performance, audience metrics, and video analytics
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
              className="w-full bg-slate-100 dark:bg-white/5 border border-purple-200 dark:border-purple-500/20 text-slate-900 dark:text-white text-xs font-semibold rounded-full px-4 py-2.5 pr-9 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-sm"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1">
                🌐 All Channels ({channels.length})
              </option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1">
                  ▶ {ch.title} {ch.customUrl ? `(${ch.customUrl})` : ''}
                </option>
              ))}
              <option value="__add__" className="bg-white dark:bg-slate-900 text-red-500 font-bold py-1">
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
              className="bg-slate-100 dark:bg-white/5 border border-purple-200 dark:border-purple-500/20 text-slate-900 dark:text-white text-xs font-semibold rounded-full px-4 py-2.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-sm"
            >
              <option value="7d" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Last 7 Days</option>
              <option value="28d" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Last 28 Days</option>
              <option value="90d" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Last 90 Days</option>
              <option value="1y" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Last Year</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sync Button */}
          <Button
            onClick={handleSync}
            disabled={syncing || channels.length === 0}
            variant="outline"
            className="rounded-full text-xs font-semibold px-4 py-2.5 border-purple-200 dark:border-purple-500/20 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-red-500' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {/* Connect Account Button */}
          <Button
            onClick={() => handleConnectClick('track')}
            className="rounded-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white text-xs font-semibold px-5 py-2.5 shadow-md shadow-red-600/25 transition-all flex items-center gap-1.5"
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeChannel.title}</h2>
                {activeChannel.customUrl && (
                  <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                    {activeChannel.customUrl}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Channel ID: <code className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{activeChannel.channelId}</code>
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

      {/* Overview Cards Grid (8 KPI cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Subscribers',
            value: (overview?.subscribers || 0).toLocaleString(),
            sub: `${overview?.netSubscribers >= 0 ? '+' : ''}${(overview?.netSubscribers || 0).toLocaleString()} net (${dateRange})`,
            icon: Users,
            color: 'text-red-500',
            bg: 'from-red-500/20 to-pink-500/20',
          },
          {
            label: 'Total Views',
            value: (overview?.totalViews || 0).toLocaleString(),
            sub: `${(overview?.periodViews || 0).toLocaleString()} views (${dateRange})`,
            icon: Eye,
            color: 'text-indigo-500',
            bg: 'from-indigo-500/20 to-purple-500/20',
          },
          {
            label: 'Total Videos',
            value: (overview?.totalVideos || 0).toLocaleString(),
            sub: `${videos.length} videos analyzed`,
            icon: Video,
            color: 'text-purple-500',
            bg: 'from-purple-500/20 to-pink-500/20',
          },
          {
            label: 'Watch Time (Hours)',
            value: `${(overview?.watchTimeHours || 0).toLocaleString()} hrs`,
            sub: `${(overview?.watchTimeMinutes || 0).toLocaleString()} minutes (${dateRange})`,
            icon: Clock,
            color: 'text-amber-500',
            bg: 'from-amber-500/20 to-orange-500/20',
          },
          {
            label: 'Total Likes',
            value: (overview?.likes || 0).toLocaleString(),
            sub: 'Audience reactions',
            icon: ThumbsUp,
            color: 'text-pink-500',
            bg: 'from-pink-500/20 to-rose-500/20',
          },
          {
            label: 'Comments',
            value: (overview?.comments || 0).toLocaleString(),
            sub: 'Viewer discussions',
            icon: MessageSquare,
            color: 'text-emerald-500',
            bg: 'from-emerald-500/20 to-teal-500/20',
          },
          {
            label: 'Subscribers Gained',
            value: `+${(overview?.subscribersGained || 0).toLocaleString()}`,
            sub: `Period: ${dateRange}`,
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'from-emerald-500/20 to-green-500/20',
          },
          {
            label: 'Subscribers Lost',
            value: `-${(overview?.subscribersLost || 0).toLocaleString()}`,
            sub: `Period: ${dateRange}`,
            icon: TrendingDown,
            color: 'text-rose-500',
            bg: 'from-rose-500/20 to-red-500/20',
          },
        ].map((card, i) => (
          <Card
            key={i}
            className="glass border border-purple-200 dark:border-white/5 rounded-3xl p-5 hover:shadow-lg transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">{card.label}</span>
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${card.bg} flex items-center justify-center ${card.color} shadow-inner`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {card.value}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-1">
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
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 px-3 rounded-xl bg-slate-100/70 dark:bg-black/20 border border-slate-200/50 dark:border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 block">Subscribers</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {Number(ch.subscribers || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 block">Total Views</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {Number(ch.totalViews || 0).toLocaleString()}
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
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2 h-80">
            {timeseries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 text-xs">
                <Calendar className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
                No daily time-series data available for this range yet.
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '1.25rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="views" name="Views" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorViewsYt)" />
                  <Area type="monotone" dataKey="watchTimeHours" name="Watch Time (Hrs)" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorWatchYt)" />
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
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2 h-80">
            {timeseries.length === 0 ? (
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '1.25rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="subscribersGained" name="Gained" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="subscribersLost" name="Lost" fill="#f43f5e" radius={[6, 6, 0, 0]} />
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
                  Tracking likes, comments, and shares across video uploads ({dateRange})
                </p>
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '1.25rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="likes" name="Likes" stroke="#ec4899" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="comments" name="Comments" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="shares" name="Shares" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-white/5 border-b border-purple-100 dark:border-white/5 text-slate-700 dark:text-gray-300 font-semibold text-xs uppercase tracking-wider">
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
              <tbody className="divide-y divide-purple-100 dark:divide-white/5 text-xs">
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
                    <tr key={vid.id} className="hover:bg-red-500/5 transition-colors">
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
                              className="font-semibold text-slate-900 dark:text-white hover:text-red-500 dark:hover:text-red-400 transition-colors text-left line-clamp-2"
                              title={vid.title}
                            >
                              {vid.title}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-gray-300">
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
                      <td className="py-3 px-4 text-center whitespace-nowrap font-semibold text-indigo-600 dark:text-indigo-400">
                        {(vid.views || 0).toLocaleString()}
                      </td>

                      {/* Likes */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-semibold text-pink-600 dark:text-pink-400">
                        {(vid.likes || 0).toLocaleString()}
                      </td>

                      {/* Comments */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-semibold text-emerald-600 dark:text-emerald-400">
                        {(vid.comments || 0).toLocaleString()}
                      </td>

                      {/* Published */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-gray-400">
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
                            className="text-xs h-7 px-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"
                          >
                            Details
                          </Button>
                          <a
                            href={`https://www.youtube.com/watch?v=${vid.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full transition-colors"
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

          {/* Pagination Controls */}
          {videoTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-purple-100 dark:border-white/5 text-xs text-slate-500 dark:text-gray-400">
              <div>
                Page <strong>{videoPage}</strong> of <strong>{videoTotalPages}</strong> ({videoTotal} videos)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={videoPage <= 1}
                  onClick={() => setVideoPage((p) => Math.max(1, p - 1))}
                  className="rounded-full h-8 px-3 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={videoPage >= videoTotalPages}
                  onClick={() => setVideoPage((p) => Math.min(videoTotalPages, p + 1))}
                  className="rounded-full h-8 px-3 text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Details Modal */}
      <Dialog open={selectedVideo !== null} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 text-slate-900 dark:text-white border border-purple-200 dark:border-gray-700 max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-7">
          {selectedVideo && (
            <div className="space-y-5">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-200 dark:border-white/10 shadow-lg">
                {selectedVideo.thumbnailUrl && (
                  <img src={selectedVideo.thumbnailUrl} alt={selectedVideo.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-3 right-3 bg-black/80 text-white font-mono text-xs px-2 py-1 rounded-md">
                  {selectedVideo.duration}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedVideo.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400 mt-1.5">
                  <span>Channel: <strong>{selectedVideo.channel?.title || 'YouTube'}</strong></span>
                  <span>•</span>
                  <span>Published: {new Date(selectedVideo.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-purple-100 dark:border-white/10 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-gray-400 block mb-0.5">Views</span>
                  <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                    {(selectedVideo.views || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-purple-100 dark:border-white/10 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-gray-400 block mb-0.5">Likes</span>
                  <span className="font-bold text-lg text-pink-600 dark:text-pink-400">
                    {(selectedVideo.likes || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-purple-100 dark:border-white/10 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-gray-400 block mb-0.5">Comments</span>
                  <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                    {(selectedVideo.comments || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Video Description
                </span>
                <div className="text-xs leading-relaxed text-slate-700 dark:text-gray-300 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-purple-100 dark:border-white/5 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {selectedVideo.description || 'No description provided.'}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelectedVideo(null)} className="rounded-full text-xs">
                  Close
                </Button>
                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full transition-colors shadow-md shadow-red-600/30"
                >
                  Watch on YouTube <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Connect Channel / Setup Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 text-slate-900 dark:text-white border border-purple-200 dark:border-gray-700 rounded-3xl p-6 sm:p-8">
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
                        placeholder="e.g. @mkbhd, @veritasium, or https://youtube.com/@channel"
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
