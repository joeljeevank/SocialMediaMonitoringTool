'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  ChevronDown, 
  Calendar, 
  Video, 
  Users, 
  Eye, 
  Clock, 
  ThumbsUp, 
  Sparkles, 
  ExternalLink, 
  FileSpreadsheet, 
  FileCode2, 
} from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/youtube-icon';
import axios from 'axios';

type LinkedInAccount = {
  id: number;
  username: string;
  platform?: string;
  status?: string;
  profileUrl?: string;
};

type YouTubeChannel = {
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
  googleAccountEmail?: string;
};

type YouTubeVideoItem = {
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
};

function LinkedinIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37h2.79V10.9H6.46M7.86 6.54a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z" />
    </svg>
  );
}

const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
};

const triggerDownload = (content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function ReportsContent() {
  const searchParams = useSearchParams();

  // Platform tab state: default from URL param if available
  const initialPlatform = searchParams.get('platform') === 'youtube' ? 'youtube' : 'linkedin';
  const [activePlatform, setActivePlatform] = useState<'linkedin' | 'youtube'>(initialPlatform);

  // LinkedIn State
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingLinkedIn, setLoadingLinkedIn] = useState(false);
  const [linkedInAnalytics, setLinkedInAnalytics] = useState<any[]>([]);

  // YouTube State
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const initialChannelId = searchParams.get('channelId') || 'all';
  const [selectedYouTubeChannelId, setSelectedYouTubeChannelId] = useState<string>(initialChannelId);
  const initialRange = searchParams.get('range') || '28d';
  const [youTubeDateRange, setYouTubeDateRange] = useState<string>(initialRange);
  const [loadingYouTube, setLoadingYouTube] = useState<boolean>(false);
  const [youTubeOverview, setYouTubeOverview] = useState<any>(null);
  const [youTubeTimeseries, setYouTubeTimeseries] = useState<any[]>([]);
  const [youTubeVideos, setYouTubeVideos] = useState<YouTubeVideoItem[]>([]);
  const [previewTab, setPreviewTab] = useState<'timeseries' | 'videos'>('timeseries');

  // Fetch LinkedIn Accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get('http://localhost:3001/accounts');
        setAccounts(res.data || []);
      } catch (error) {
        console.error('Failed to fetch LinkedIn accounts', error);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch YouTube Channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/youtube/channels');
      setChannels(res.data || []);
    } catch (error) {
      console.error('Failed to fetch YouTube channels', error);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Handle LinkedIn account selection & fetch
  const handleFetchLinkedInData = async (accountId: string) => {
    setSelectedAccountId(accountId);
    if (!accountId) {
      setLinkedInAnalytics([]);
      return;
    }
    setLoadingLinkedIn(true);
    try {
      const res = await axios.get(`http://localhost:3001/analytics/${accountId}`);
      setLinkedInAnalytics(res.data || []);
    } catch (error) {
      console.error('Failed to fetch LinkedIn analytics', error);
      setLinkedInAnalytics([]);
    }
    setLoadingLinkedIn(false);
  };

  // Fetch YouTube Telemetry (Overview + Timeseries + Videos)
  const fetchYouTubeData = useCallback(async () => {
    setLoadingYouTube(true);
    try {
      const [overviewRes, timeseriesRes, videosRes] = await Promise.all([
        axios.get('http://localhost:3001/api/youtube/overview', {
          params: { channelId: selectedYouTubeChannelId, range: youTubeDateRange },
        }),
        axios.get('http://localhost:3001/api/youtube/analytics', {
          params: { channelId: selectedYouTubeChannelId, range: youTubeDateRange },
        }),
        axios.get('http://localhost:3001/api/youtube/videos', {
          params: { channelId: selectedYouTubeChannelId, limit: 50, sort: 'publishedAt', order: 'DESC' },
        }),
      ]);

      setYouTubeOverview(overviewRes.data);
      setYouTubeTimeseries(timeseriesRes.data || []);
      setYouTubeVideos(videosRes.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch YouTube report data', error);
      setYouTubeOverview(null);
      setYouTubeTimeseries([]);
      setYouTubeVideos([]);
    }
    setLoadingYouTube(false);
  }, [selectedYouTubeChannelId, youTubeDateRange]);

  useEffect(() => {
    if (activePlatform === 'youtube') {
      fetchYouTubeData();
    }
  }, [activePlatform, fetchYouTubeData]);

  // Selected Channel Object
  const currentYouTubeChannel = useMemo(() => {
    if (selectedYouTubeChannelId === 'all') return null;
    return channels.find((c) => String(c.id) === String(selectedYouTubeChannelId));
  }, [channels, selectedYouTubeChannelId]);

  const youTubeExportTitle = useMemo(() => {
    if (selectedYouTubeChannelId === 'all') return 'all_channels_aggregate';
    const raw = currentYouTubeChannel?.title || `channel_${selectedYouTubeChannelId}`;
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }, [currentYouTubeChannel, selectedYouTubeChannelId]);

  // -------------------------------------------------------------
  // LinkedIn Export
  // -------------------------------------------------------------
  const downloadLinkedInCSV = () => {
    if (linkedInAnalytics.length === 0) return;

    const selectedAcc = accounts.find((a) => String(a.id) === String(selectedAccountId));
    const accName = selectedAcc?.username || `account_${selectedAccountId}`;

    const headers = ['Date', 'Followers', 'Views', 'Likes', 'Comments', 'Shares', 'Recent Posts'];
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...linkedInAnalytics.map((row) =>
        [
          row.date,
          row.followers || 0,
          row.views || 0,
          row.likes || 0,
          row.comments || 0,
          row.shares || 0,
          row.recentPosts || 0,
        ]
          .map(escapeCSV)
          .join(',')
      ),
    ].join('\n');

    triggerDownload(csvContent, `linkedin_report_${accName}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // -------------------------------------------------------------
  // YouTube Exports
  // -------------------------------------------------------------
  const downloadYouTubeTimeseriesCSV = () => {
    if (youTubeTimeseries.length === 0) return;

    const headers = [
      'Date',
      'Views',
      'Watch Time (Hours)',
      'Watch Time (Minutes)',
      'Average View Duration (Seconds)',
      'Likes',
      'Comments',
      'Shares',
      'Subscribers Gained',
      'Subscribers Lost',
      'Net Subscribers',
    ];

    const rows = youTubeTimeseries.map((r) =>
      [
        r.date,
        r.views,
        r.watchTimeHours,
        r.watchTimeMinutes,
        r.averageViewDurationSeconds,
        r.likes,
        r.comments,
        r.shares,
        r.subscribersGained,
        r.subscribersLost,
        r.netSubscribers,
      ]
        .map(escapeCSV)
        .join(',')
    );

    const csv = [headers.map(escapeCSV).join(','), ...rows].join('\n');
    const today = new Date().toISOString().split('T')[0];
    triggerDownload(csv, `youtube_daily_analytics_${youTubeExportTitle}_${youTubeDateRange}_${today}.csv`);
  };

  const downloadYouTubeVideosCSV = () => {
    if (youTubeVideos.length === 0) return;

    const headers = [
      'Video Title',
      'Video ID',
      'Published Date',
      'Duration',
      'Views',
      'Likes',
      'Comments',
      'Channel Title',
      'YouTube Video URL',
    ];

    const rows = youTubeVideos.map((v) =>
      [
        v.title,
        v.videoId,
        v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : 'N/A',
        v.duration || 'N/A',
        v.views,
        v.likes,
        v.comments,
        currentYouTubeChannel?.title || 'YouTube Channel',
        `https://www.youtube.com/watch?v=${v.videoId}`,
      ]
        .map(escapeCSV)
        .join(',')
    );

    const csv = [headers.map(escapeCSV).join(','), ...rows].join('\n');
    const today = new Date().toISOString().split('T')[0];
    triggerDownload(csv, `youtube_video_performance_${youTubeExportTitle}_${today}.csv`);
  };

  const downloadYouTubeFullReportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    const channelName = currentYouTubeChannel?.title || (selectedYouTubeChannelId === 'all' ? 'All Channels (Aggregate)' : 'YouTube Channel');

    // Section 1: Metadata & Summary Header
    const summaryLines = [
      ['# YOUTUBE INTELLIGENCE REPORT'].map(escapeCSV).join(','),
      ['Report Generated Date', new Date().toLocaleString()].map(escapeCSV).join(','),
      ['Selected Channel', channelName].map(escapeCSV).join(','),
      ['Selected Date Range', youTubeDateRange.toUpperCase()].map(escapeCSV).join(','),
      ['Connected Channels Count', channels.length].map(escapeCSV).join(','),
      ['Total Channel Subscribers', youTubeOverview?.subscribers || 0].map(escapeCSV).join(','),
      ['Total Lifetime Views', youTubeOverview?.totalViews || 0].map(escapeCSV).join(','),
      ['Period Views', youTubeOverview?.periodViews || 0].map(escapeCSV).join(','),
      ['Period Watch Time (Hours)', youTubeOverview?.watchTimeHours || 0].map(escapeCSV).join(','),
      ['Total Period Likes', youTubeOverview?.likes || 0].map(escapeCSV).join(','),
      ['Total Period Comments', youTubeOverview?.comments || 0].map(escapeCSV).join(','),
      ['Period Net Subscribers', youTubeOverview?.netSubscribers || 0].map(escapeCSV).join(','),
      ['Total Uploaded Videos', youTubeOverview?.totalVideos || 0].map(escapeCSV).join(','),
      '',
    ];

    // Section 2: Daily Timeseries Telemetry
    const timeseriesHeaders = [
      'Date',
      'Views',
      'Watch Time (Hours)',
      'Watch Time (Minutes)',
      'Avg View Duration (Sec)',
      'Likes',
      'Comments',
      'Shares',
      'Subs Gained',
      'Subs Lost',
      'Net Subs',
    ];

    const timeseriesRows = youTubeTimeseries.map((r) =>
      [
        r.date,
        r.views,
        r.watchTimeHours,
        r.watchTimeMinutes,
        r.averageViewDurationSeconds,
        r.likes,
        r.comments,
        r.shares,
        r.subscribersGained,
        r.subscribersLost,
        r.netSubscribers,
      ]
        .map(escapeCSV)
        .join(',')
    );

    // Section 3: Video Performance Telemetry
    const videoHeaders = [
      'Video Title',
      'Video ID',
      'Published Date',
      'Duration',
      'Views',
      'Likes',
      'Comments',
      'YouTube URL',
    ];

    const videoRows = youTubeVideos.map((v) =>
      [
        v.title,
        v.videoId,
        v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : 'N/A',
        v.duration || 'N/A',
        v.views,
        v.likes,
        v.comments,
        `https://www.youtube.com/watch?v=${v.videoId}`,
      ]
        .map(escapeCSV)
        .join(',')
    );

    const fullContent = [
      ...summaryLines,
      ['# SECTION 1: DAILY TELEMETRY BREAKDOWN'].map(escapeCSV).join(','),
      timeseriesHeaders.map(escapeCSV).join(','),
      ...timeseriesRows,
      '',
      ['# SECTION 2: TOP VIDEO PERFORMANCE CATALOG'].map(escapeCSV).join(','),
      videoHeaders.map(escapeCSV).join(','),
      ...videoRows,
    ].join('\n');

    triggerDownload(fullContent, `youtube_complete_audit_${youTubeExportTitle}_${youTubeDateRange}_${today}.csv`);
  };

  const downloadYouTubeJSON = () => {
    const today = new Date().toISOString().split('T')[0];
    const dataBundle = {
      meta: {
        platform: 'YouTube',
        channelId: selectedYouTubeChannelId,
        channelTitle: currentYouTubeChannel?.title || (selectedYouTubeChannelId === 'all' ? 'All Channels' : 'YouTube Channel'),
        dateRange: youTubeDateRange,
        exportedAt: new Date().toISOString(),
      },
      overview: youTubeOverview,
      dailyTimeseries: youTubeTimeseries,
      videos: youTubeVideos,
    };

    triggerDownload(JSON.stringify(dataBundle, null, 2), `youtube_analytics_data_${youTubeExportTitle}_${today}.json`, 'application/json');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1 flex items-center gap-2.5">
            <FileSpreadsheet className="w-8 h-8 text-cyan-500" />
            Reports & Data Export
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
            Export detailed multi-platform telemetry, daily performance logs, and engagement reports for spreadsheets and BI analysis.
          </p>
        </div>

        {/* Platform Selector Tabs */}
        <div className="inline-flex p-1.5 bg-slate-200/70 dark:bg-black/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-2xl self-start md:self-auto shadow-inner">
          <button
            onClick={() => setActivePlatform('linkedin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activePlatform === 'linkedin'
                ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-md'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LinkedinIcon className="w-4 h-4 text-[#0077B5] dark:text-white" />
            LinkedIn Reports
          </button>

          <button
            onClick={() => setActivePlatform('youtube')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activePlatform === 'youtube'
                ? 'bg-white dark:bg-red-600 text-red-600 dark:text-white shadow-md'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <YoutubeIcon className="w-4 h-4 text-red-600 dark:text-white" />
            YouTube Analytics
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PLATFORM 1: LINKEDIN REPORT & EXPORT                                      */}
      {/* ========================================================================= */}
      {activePlatform === 'linkedin' && (
        <Card className="bg-white/90 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0077B5]/10 flex items-center justify-center text-[#0077B5]">
                  <LinkedinIcon className="w-4 h-4" />
                </div>
                LinkedIn Report Generation
              </CardTitle>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {accounts.length} Profiles
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Select LinkedIn Account
              </label>
              <div className="relative">
                <select
                  className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white h-11 px-4 pr-10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer transition-all shadow-sm font-medium text-sm"
                  value={selectedAccountId}
                  onChange={(e) => handleFetchLinkedInData(e.target.value)}
                >
                  <option value="" className="bg-white text-slate-500 dark:bg-[#090d16] dark:text-gray-400">
                    -- Select an account --
                  </option>
                  {accounts.map((acc) => (
                    <option
                      key={acc.id}
                      value={acc.id}
                      className="bg-white text-slate-900 dark:bg-[#090d16] dark:text-white py-2"
                    >
                      {acc.username} {acc.platform ? `(${acc.platform})` : ''} {acc.status ? `• ${acc.status}` : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-cyan-500">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>

            {loadingLinkedIn && (
              <div className="py-12 text-center text-slate-500 dark:text-gray-400 animate-pulse text-sm">
                Fetching LinkedIn telemetry records...
              </div>
            )}

            {!loadingLinkedIn && selectedAccountId && linkedInAnalytics.length === 0 && (
              <div className="py-12 text-center text-slate-500 dark:text-gray-400 text-sm">
                No telemetry data recorded for this LinkedIn account yet. Please collect data on the LinkedIn dashboard first.
              </div>
            )}

            {!loadingLinkedIn && linkedInAnalytics.length > 0 && (
              <div className="space-y-6 mt-6 pt-6 border-t border-slate-100 dark:border-white/10">
                <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-transparent rounded-2xl p-5 border border-cyan-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      LinkedIn Dataset Ready
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5">
                      Contains {linkedInAnalytics.length} telemetry records with Followers, Views, Likes, Comments, and Post Counts.
                    </p>
                  </div>
                  <Button
                    onClick={downloadLinkedInCSV}
                    className="rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-cyan-500/20 border-none gap-2 px-6 h-11 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download LinkedIn CSV
                  </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Followers</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {linkedInAnalytics[linkedInAnalytics.length - 1].followers?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Views</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {linkedInAnalytics[linkedInAnalytics.length - 1].views?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Likes</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {linkedInAnalytics[linkedInAnalytics.length - 1].likes?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Comments</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {linkedInAnalytics[linkedInAnalytics.length - 1].comments?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      Telemetry Data Preview
                    </h4>
                    <span className="text-xs text-slate-400">
                      Showing all {linkedInAnalytics.length} records
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-gray-300">
                      <thead className="bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-white/10">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-right">Followers</th>
                          <th className="px-4 py-3 text-right">Views</th>
                          <th className="px-4 py-3 text-right">Likes</th>
                          <th className="px-4 py-3 text-right">Comments</th>
                          <th className="px-4 py-3 text-right">Shares</th>
                          <th className="px-4 py-3 text-right">Recent Posts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                        {linkedInAnalytics.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900 dark:text-white">{row.date}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{row.followers || 0}</td>
                            <td className="px-4 py-2.5 text-right">{row.views || 0}</td>
                            <td className="px-4 py-2.5 text-right">{row.likes || 0}</td>
                            <td className="px-4 py-2.5 text-right">{row.comments || 0}</td>
                            <td className="px-4 py-2.5 text-right">{row.shares || 0}</td>
                            <td className="px-4 py-2.5 text-right">{row.recentPosts || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PLATFORM 2: YOUTUBE ANALYTICS REPORT & EXPORT                              */}
      {/* ========================================================================= */}
      {activePlatform === 'youtube' && (
        <div className="space-y-6">
          <Card className="bg-white/90 dark:bg-[#090d16]/80 border border-slate-200 dark:border-red-500/20 shadow-xl backdrop-blur-2xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-600/10 flex items-center justify-center text-red-600 dark:text-red-400">
                    <YoutubeIcon className="w-4 h-4" />
                  </div>
                  YouTube Intelligence Export
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    Live Telemetry Ready
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Controls: Channel & Date Range Selector */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Channel Selector */}
                <div className="md:col-span-8 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                    Select YouTube Channel
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-red-500/30 text-slate-900 dark:text-white h-12 px-4 pr-10 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer transition-all shadow-sm font-medium text-sm"
                      value={selectedYouTubeChannelId}
                      onChange={(e) => setSelectedYouTubeChannelId(e.target.value)}
                    >
                      <option value="all" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white py-2 font-semibold">
                        All Connected Channels (Aggregate - {channels.length} channels)
                      </option>
                      {channels.map((ch) => (
                        <option
                          key={ch.id}
                          value={ch.id}
                          className="bg-white text-slate-900 dark:bg-[#090d16] dark:text-white py-2"
                        >
                          {ch.title} {ch.customUrl ? `(${ch.customUrl})` : ''} • {Number(ch.subscribers || 0).toLocaleString()} Subs
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-red-500">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Date Range Selector */}
                <div className="md:col-span-4 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Analytics Window
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-red-500/30 text-slate-900 dark:text-white h-12 px-4 pr-10 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer transition-all shadow-sm font-medium text-sm"
                      value={youTubeDateRange}
                      onChange={(e) => setYouTubeDateRange(e.target.value)}
                    >
                      <option value="7d" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Last 7 Days</option>
                      <option value="28d" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Last 28 Days (Standard)</option>
                      <option value="90d" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Last 90 Days</option>
                      <option value="365d" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">Last 365 Days (1 Year)</option>
                      <option value="all" className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white">All Time</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Channel Context Banner */}
              {currentYouTubeChannel && (
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-red-500/5 border border-red-500/15">
                  {currentYouTubeChannel.thumbnailUrl ? (
                    <img
                      src={currentYouTubeChannel.thumbnailUrl}
                      alt={currentYouTubeChannel.title}
                      className="w-10 h-10 rounded-full border border-red-500/40 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 font-bold flex items-center justify-center text-xs">
                      YT
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {currentYouTubeChannel.title}
                      </p>
                      {currentYouTubeChannel.customUrl && (
                        <span className="text-xs text-red-500 font-mono">
                          {currentYouTubeChannel.customUrl}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                      Channel ID: <span className="font-mono">{currentYouTubeChannel.channelId}</span> • {Number(currentYouTubeChannel.subscribers || 0).toLocaleString()} Subscribers • {currentYouTubeChannel.totalVideos} Videos
                    </p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loadingYouTube && (
                <div className="py-12 text-center text-slate-500 dark:text-gray-400 animate-pulse text-sm">
                  Compiling YouTube telemetry, timeseries metrics, and video catalog...
                </div>
              )}

              {/* No Data State */}
              {!loadingYouTube && youTubeTimeseries.length === 0 && youTubeVideos.length === 0 && (
                <div className="py-12 text-center text-slate-500 dark:text-gray-400 text-sm">
                  No telemetry data available for the selected range. Try syncing your channel in the YouTube dashboard.
                </div>
              )}

              {/* Loaded Telemetry & Export Section */}
              {!loadingYouTube && (youTubeTimeseries.length > 0 || youTubeVideos.length > 0) && (
                <div className="space-y-6 pt-2">
                  {/* Export Options Banner */}
                  <div className="bg-gradient-to-r from-red-500/10 via-rose-500/5 to-transparent rounded-3xl p-5 border border-red-500/25 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-red-500" />
                          YouTube Export Hub Ready
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5">
                          Choose your desired export format below. Datasets include full column headers and RFC-compliant CSV formatting.
                        </p>
                      </div>

                      {/* Primary Audit Action */}
                      <Button
                        onClick={downloadYouTubeFullReportCSV}
                        className="rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 hover:from-red-500 hover:via-rose-500 hover:to-orange-400 text-white font-bold shadow-lg shadow-red-600/25 border-none gap-2 px-6 h-11 cursor-pointer shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Download Full Audit (CSV)
                      </Button>
                    </div>

                    {/* Secondary Export Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-red-500/15">
                      <button
                        onClick={downloadYouTubeTimeseriesCSV}
                        disabled={youTubeTimeseries.length === 0}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/70 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-slate-200 dark:border-white/10 transition-all text-left group cursor-pointer disabled:opacity-50"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-red-500" />
                            Daily Analytics CSV
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-gray-400">
                            {youTubeTimeseries.length} daily performance rows
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                      </button>

                      <button
                        onClick={downloadYouTubeVideosCSV}
                        disabled={youTubeVideos.length === 0}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/70 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-slate-200 dark:border-white/10 transition-all text-left group cursor-pointer disabled:opacity-50"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-rose-500" />
                            Video Catalog CSV
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-gray-400">
                            {youTubeVideos.length} video telemetry rows
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                      </button>

                      <button
                        onClick={downloadYouTubeJSON}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/70 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-slate-200 dark:border-white/10 transition-all text-left group cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FileCode2 className="w-3.5 h-3.5 text-orange-500" />
                            Export Full JSON
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-gray-400">
                            Structured programmatic API object
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric KPI Cards */}
                  {youTubeOverview && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                      <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Period Views</span>
                          <Eye className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {Number(youTubeOverview.periodViews || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 truncate">
                          Total: {Number(youTubeOverview.totalViews || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Watch Time</span>
                          <Clock className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {youTubeOverview.watchTimeHours || 0}h
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 truncate">
                          {youTubeOverview.watchTimeMinutes || 0} minutes
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Net Subscribers</span>
                          <Users className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1">
                          {(youTubeOverview.netSubscribers || 0) >= 0 ? '+' : ''}
                          {Number(youTubeOverview.netSubscribers || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 truncate">
                          Total: {Number(youTubeOverview.subscribers || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Engagement</span>
                          <ThumbsUp className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {Number(youTubeOverview.likes || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 truncate">
                          {Number(youTubeOverview.comments || 0).toLocaleString()} comments
                        </div>
                      </div>

                      <div className="col-span-2 md:col-span-1 bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Videos Tracked</span>
                          <Video className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {youTubeOverview.totalVideos || youTubeVideos.length}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 truncate">
                          Catalog size
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Telemetry Preview Tabs */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewTab('timeseries')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            previewTab === 'timeseries'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                              : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          Daily Telemetry ({youTubeTimeseries.length} days)
                        </button>
                        <button
                          onClick={() => setPreviewTab('videos')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            previewTab === 'videos'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                              : 'text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          Video Performance ({youTubeVideos.length} videos)
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {previewTab === 'timeseries'
                          ? `Showing dates from ${youTubeTimeseries[0]?.date || '—'} to ${youTubeTimeseries[youTubeTimeseries.length - 1]?.date || '—'}`
                          : `Cataloging recent uploaded videos`}
                      </span>
                    </div>

                    {/* Preview Table 1: Daily Timeseries */}
                    {previewTab === 'timeseries' && (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 max-h-96">
                        <table className="w-full text-left text-xs text-slate-600 dark:text-gray-300">
                          <thead className="bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 dark:border-white/10 backdrop-blur-md">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3 text-right">Views</th>
                              <th className="px-4 py-3 text-right">Watch Time</th>
                              <th className="px-4 py-3 text-right">Avg Duration</th>
                              <th className="px-4 py-3 text-right">Likes</th>
                              <th className="px-4 py-3 text-right">Comments</th>
                              <th className="px-4 py-3 text-right">Shares</th>
                              <th className="px-4 py-3 text-right">Net Subs</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                            {youTubeTimeseries.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-2.5 font-sans font-medium text-slate-900 dark:text-white">
                                  {row.date}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">
                                  {row.views?.toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {row.watchTimeHours}h ({row.watchTimeMinutes}m)
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {row.averageViewDurationSeconds}s
                                </td>
                                <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">
                                  {row.likes}
                                </td>
                                <td className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400">
                                  {row.comments}
                                </td>
                                <td className="px-4 py-2.5 text-right">{row.shares}</td>
                                <td className="px-4 py-2.5 text-right font-bold">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                      row.netSubscribers > 0
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : row.netSubscribers < 0
                                        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {row.netSubscribers > 0 ? `+${row.netSubscribers}` : row.netSubscribers}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Preview Table 2: Video Performance */}
                    {previewTab === 'videos' && (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 max-h-96">
                        <table className="w-full text-left text-xs text-slate-600 dark:text-gray-300">
                          <thead className="bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 dark:border-white/10 backdrop-blur-md">
                            <tr>
                              <th className="px-4 py-3">Video Title</th>
                              <th className="px-4 py-3">Published</th>
                              <th className="px-4 py-3 text-right">Views</th>
                              <th className="px-4 py-3 text-right">Likes</th>
                              <th className="px-4 py-3 text-right">Comments</th>
                              <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {youTubeVideos.map((vid) => (
                              <tr key={vid.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-3">
                                    {vid.thumbnailUrl && (
                                      <img
                                        src={vid.thumbnailUrl}
                                        alt={vid.title}
                                        className="w-12 h-7 rounded object-cover border border-white/10 shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0 max-w-sm">
                                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                                        {vid.title}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-mono">{vid.videoId}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  {vid.publishedAt ? new Date(vid.publishedAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  {vid.views?.toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                  {vid.likes?.toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400">
                                  {vid.comments?.toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <a
                                    href={`https://www.youtube.com/watch?v=${vid.videoId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-400"
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

