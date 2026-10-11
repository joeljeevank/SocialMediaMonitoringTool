'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Eye, 
  MessageSquare, 
  TrendingUp, 
  BarChart2, 
  Calendar, 
  Download, 
  RefreshCw, 
  Plus, 
  X, 
  Search, 
  ShieldCheck, 
  Key, 
  Video, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  ArrowLeftRight
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
import { Button } from '@/components/ui/button';
import { YoutubeIcon } from '@/components/icons/youtube-icon';
import { API_BASE_URL } from '@/lib/api-config';

// Channel color themes for consistent multi-channel visual distinction
const CHANNEL_COLORS = [
  { stroke: '#ef4444', fill: '#ef4444', badge: 'bg-red-500', lightBg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-500', text: 'text-red-600 dark:text-red-400', label: 'Channel A' },
  { stroke: '#3b82f6', fill: '#3b82f6', badge: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', label: 'Channel B' },
  { stroke: '#10b981', fill: '#10b981', badge: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Channel C' },
];

type ComparedChannel = {
  id: number;
  channelId: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
  isOAuth: boolean;
  authType: string;
  totalSubscribers: number;
  totalViews: number;
  totalVideos: number;
  periodViews: number;
  periodComments: number;
  periodLikes: number;
  periodNetGrowth: number;
  avgViewsPerVideo: number;
  engagementRate: number;
  slotIndex: number;
};

type ComparisonData = {
  channels: ComparedChannel[];
  timeseries: any[];
  dateRange: { startDate: string; endDate: string; range: string };
  leaders: {
    views: { id: number; title: string; value: number } | null;
    subscribers: { id: number; title: string; value: number } | null;
    growth: { id: number; title: string; value: number } | null;
    comments: { id: number; title: string; value: number } | null;
  } | null;
};

export function YouTubeComparisonDashboard() {
  const [allChannels, setAllChannels] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([0]);
  const [dateRange, setDateRange] = useState<string>('28d');
  const [activeMetricTab, setActiveMetricTab] = useState<'views' | 'growth' | 'comments' | 'all'>('views');
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');
  const [tableSearch, setTableSearch] = useState<string>('');

  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const validSelectedIds = useMemo(() => selectedIds.filter((id) => id > 0), [selectedIds]);

  // 1. Fetch connected channels list without auto-selecting multiple
  const fetchAllChannels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/channels`);
      if (res.ok) {
        const data = await res.json();
        setAllChannels(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch channels for comparison', err);
    }
  }, []);

  useEffect(() => {
    fetchAllChannels();
  }, [fetchAllChannels]);

  // 2. Fetch comparative analytics when 2 or more channels are selected
  const fetchComparisonData = useCallback(async () => {
    const validIds = selectedIds.filter((id) => id > 0);
    if (validIds.length < 2) {
      setDataLoading(false);
      setComparisonData(null);
      return;
    }
    try {
      setDataLoading(true);
      const query = new URLSearchParams({
        channelIds: validIds.join(','),
        range: dateRange,
      });
      const res = await fetch(`${API_BASE_URL}/api/youtube/compare?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      }
    } catch (err) {
      console.error('Failed to fetch comparison analytics', err);
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [selectedIds, dateRange]);

  useEffect(() => {
    const validIds = selectedIds.filter((id) => id > 0);
    if (validIds.length >= 2) {
      fetchComparisonData();
    } else {
      setComparisonData(null);
      setDataLoading(false);
    }
  }, [selectedIds, dateRange, fetchComparisonData]);

  // Handle changing slot channel
  const handleSelectChannel = (slotIndex: number, channelId: number) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[slotIndex] = channelId;
      return next;
    });
  };

  // Add next channel slot
  const handleAddChannelSlot = () => {
    if (selectedIds.length >= 3) return;
    setSelectedIds((prev) => [...prev, 0]);
  };

  // Remove a channel slot (keep Slot A)
  const handleRemoveChannel = (indexToRemove: number) => {
    if (selectedIds.length <= 1) return;
    setSelectedIds((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Format date range label
  const rangeLabel = useMemo(() => {
    switch (dateRange) {
      case '7d': return 'Last 7 Days';
      case '14d': return 'Last 14 Days';
      case '28d': return 'Last 28 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last 365 Days';
      default: return 'Selected Period';
    }
  }, [dateRange]);

  // Filtered daily table records
  const filteredTableRows = useMemo(() => {
    if (!comparisonData?.timeseries) return [];
    const rows = [...comparisonData.timeseries].reverse();
    if (!tableSearch.trim()) return rows;
    return rows.filter((r) => r.date.includes(tableSearch.trim()));
  }, [comparisonData?.timeseries, tableSearch]);

  // CSV Export for comparison data
  const handleExportCsv = () => {
    if (!comparisonData || !comparisonData.timeseries.length) return;
    const channels = comparisonData.channels;
    const headers = ['Date'];
    channels.forEach((c) => {
      headers.push(
        `"${c.title} Views"`,
        `"${c.title} Sub Growth"`,
        `"${c.title} Comments"`,
      );
    });

    const csvRows = [headers.join(',')];
    comparisonData.timeseries.forEach((r) => {
      const row = [r.date];
      channels.forEach((c) => {
        row.push(
          r[`views_${c.id}`] ?? 0,
          r[`growth_${c.id}`] ?? 0,
          r[`comments_${c.id}`] ?? 0,
        );
      });
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `YouTube_Comparison_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom multi-channel Tooltip component
  const CustomMultiTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length || !comparisonData) return null;

    const formattedDate = new Date(label).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[220px]">
        <div className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
          <span>{formattedDate}</span>
          <span className="text-[10px] text-slate-400 font-mono">Daily Comparison</span>
        </div>
        <div className="space-y-1.5 pt-0.5">
          {payload.map((entry: any, index: number) => {
            const val = entry.value !== undefined && entry.value !== null ? Number(entry.value).toLocaleString() : '0';
            return (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[130px]">
                    {entry.name}
                  </span>
                </div>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <YoutubeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  YouTube Channel Comparison
                </h1>
                <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  2-3 Channels Benchmarking
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Benchmark subscriber growth, daily video views, and audience comment volume side-by-side.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Date Range, Export, Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              disabled={validSelectedIds.length < 2 || dataLoading}
              className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-1.5 text-xs h-9 font-semibold text-slate-700 dark:text-slate-200 shadow-xs appearance-none pr-8 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors disabled:opacity-50"
            >
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="28d">Last 28 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last 365 Days</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sync / Refresh Button */}
          <Button
            onClick={() => {
              setRefreshing(true);
              fetchComparisonData();
            }}
            disabled={validSelectedIds.length < 2 || dataLoading || refreshing}
            variant="outline"
            className="rounded-xl text-xs font-semibold h-9 px-3.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-500' : 'text-slate-500'}`} />
            <span>Sync Stats</span>
          </Button>

          {/* Export CSV Report Button */}
          <Button
            onClick={handleExportCsv}
            disabled={validSelectedIds.length < 2 || !comparisonData || !comparisonData.timeseries?.length || dataLoading}
            variant="outline"
            className="rounded-xl text-xs font-semibold h-9 px-3.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-red-500" />
            <span>Export Comparison CSV</span>
          </Button>
        </div>
      </div>

      {/* 2. Channel Slot Pickers Bar (1, 2, or 3 Channels) */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {selectedIds.length === 1 ? 'Select Channel to Benchmark' : 'Select 2 or 3 Channels to Benchmark'}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedIds.length === 1
                ? 'Select Channel A below and add another channel to unlock side-by-side comparison.'
                : 'Each channel is assigned a distinct color in graphs below for clear cross-comparison.'}
            </p>
          </div>
          {selectedIds.length < 3 && allChannels.length > selectedIds.length && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddChannelSlot}
              className="rounded-xl text-xs font-semibold h-8 px-3 border-blue-300 dark:border-blue-800/60 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {selectedIds.length === 1 ? 'Add Channel B to Compare' : 'Add 3rd Channel to Compare'}
            </Button>
          )}
        </div>

        {/* Slot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-3.5">
          {selectedIds.map((chId, slotIndex) => {
            const channelObj = allChannels.find((c) => c.id === chId);
            const colorTheme = CHANNEL_COLORS[slotIndex] || CHANNEL_COLORS[0];

            return (
              <div
                key={slotIndex}
                className={`p-3.5 rounded-xl border ${colorTheme.border} ${colorTheme.lightBg} relative transition-all shadow-xs`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${colorTheme.badge}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${colorTheme.text}`}>
                      {colorTheme.label}
                    </span>
                  </div>
                  {slotIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChannel(slotIndex)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove this channel from comparison"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={chId || 0}
                    onChange={(e) => handleSelectChannel(slotIndex, Number(e.target.value))}
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white shadow-xs appearance-none pr-8 cursor-pointer"
                  >
                    <option value="0">
                      {slotIndex === 0 ? '-- Select Channel A --' : slotIndex === 1 ? '-- Select Channel B --' : '-- Select Channel C --'}
                    </option>
                    {allChannels.map((c) => (
                      <option key={c.id} value={c.id} disabled={selectedIds.includes(c.id) && c.id !== chId}>
                        {c.title} ({Number(c.subscribers || 0).toLocaleString()} subs)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {channelObj ? (
                  <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]">
                    {channelObj.thumbnailUrl ? (
                      <img
                        src={channelObj.thumbnailUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-[9px]">
                        YT
                      </div>
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {channelObj.customUrl || channelObj.title}
                    </span>
                    <span className="ml-auto font-mono font-bold text-slate-900 dark:text-white">
                      {Number(channelObj.subscribers || 0).toLocaleString()} subs
                    </span>
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>
                      {slotIndex === 0 ? 'Select Channel A above' : 'Select another channel to compare'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Channel Button card in slot grid if fewer than 3 slots */}
          {selectedIds.length < 3 && allChannels.length > selectedIds.length && (
            <button
              type="button"
              onClick={handleAddChannelSlot}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500/60 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-1.5 transition-all text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer min-h-[110px]"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold">
                {selectedIds.length === 1 ? 'Add Channel B to Compare' : 'Add 3rd Channel to Compare'}
              </span>
              <span className="text-[10px] opacity-75">Click to add side-by-side slot</span>
            </button>
          )}
        </div>
      </div>

      {/* Conditional Content: Initial State (< 2 channels) vs Loading Animation vs Details */}
      {validSelectedIds.length < 2 ? (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-14 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
              <ArrowLeftRight className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Benchmark 2 or 3 YouTube Channels
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {validSelectedIds.length === 0
                  ? 'Start by selecting Channel A from the dropdown above.'
                  : 'Channel A is selected! Add Channel B above to compare subscriber growth, views, and comments side-by-side.'}
              </p>
            </div>
            {selectedIds.length === 1 && (
              <Button
                onClick={handleAddChannelSlot}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Channel B to Compare
              </Button>
            )}
          </div>
        </div>
      ) : dataLoading ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Animated Loader Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-10 sm:p-14 text-center shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-blue-500 to-emerald-500 animate-pulse" />
            <div className="max-w-md mx-auto space-y-4">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-red-500/20 dark:border-red-500/10 border-t-red-500 animate-spin" />
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center shadow-xs">
                  <YoutubeIcon className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Comparing Channels & Calculating Metrics...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Aggregating day-by-day subscriber growth, video view velocity, and audience engagement across selected channels.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin text-red-500" />
                <span>Synchronizing cross-channel timeseries data...</span>
              </div>
            </div>
          </div>

          {/* Skeleton Shimmers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse p-4 flex flex-col justify-between">
                <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="w-32 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>

          <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-40 h-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="w-full h-48 bg-slate-200/50 dark:bg-slate-800/40 rounded-xl" />
          </div>
        </div>
      ) : comparisonData ? (
        <>

      {/* 3. Executive Leader Highlights Strip */}
      {comparisonData?.leaders && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Views Leader */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Views Leader ({rangeLabel})</span>
              <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-2 truncate" title={comparisonData.leaders.views?.title}>
              {comparisonData.leaders.views?.title || 'None'}
            </div>
            <p className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 mt-0.5">
              {(comparisonData.leaders.views?.value || 0).toLocaleString()} views
            </p>
          </div>

          {/* Subscribers Leader */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Largest Audience</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-2 truncate" title={comparisonData.leaders.subscribers?.title}>
              {comparisonData.leaders.subscribers?.title || 'None'}
            </div>
            <p className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {(comparisonData.leaders.subscribers?.value || 0).toLocaleString()} subscribers
            </p>
          </div>

          {/* Growth Velocity Leader */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Fastest Growing</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-2 truncate" title={comparisonData.leaders.growth?.title}>
              {comparisonData.leaders.growth?.title || 'None'}
            </div>
            <p className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {comparisonData.leaders.growth && comparisonData.leaders.growth.value >= 0 ? '+' : ''}
              {(comparisonData.leaders.growth?.value || 0).toLocaleString()} net subs
            </p>
          </div>

          {/* Discussion & Comments Leader */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Most Discussed</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-2 truncate" title={comparisonData.leaders.comments?.title}>
              {comparisonData.leaders.comments?.title || 'None'}
            </div>
            <p className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {(comparisonData.leaders.comments?.value || 0).toLocaleString()} comments
            </p>
          </div>
        </div>
      )}

      {/* 4. Side-by-Side Channel Scorecards (2 or 3 Columns) */}
      <div className={`grid grid-cols-1 ${selectedIds.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
        {comparisonData?.channels.map((ch, idx) => {
          const colorTheme = CHANNEL_COLORS[idx] || CHANNEL_COLORS[0];
          return (
            <div
              key={ch.id}
              className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Channel Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className={`w-12 h-12 rounded-xl border-2 ${colorTheme.border} overflow-hidden bg-black shrink-0 shadow-xs`}>
                    {ch.thumbnailUrl ? (
                      <img src={ch.thumbnailUrl} alt={ch.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-slate-800">
                        YT
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${colorTheme.badge}`} />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate" title={ch.title}>
                        {ch.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {ch.customUrl || `@channel_${ch.id}`}
                    </p>
                    <div className="mt-1">
                      {ch.isOAuth ? (
                        <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          OAuth Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                          <Key className="w-3 h-3 text-amber-500" />
                          Public Identifier
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metric Rows */}
                <div className="space-y-3 pt-4 text-xs">
                  {/* Total Subscribers */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Total Subscribers
                    </span>
                    <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                      {(ch.totalSubscribers || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Net Subscriber Growth in Period */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      Growth ({rangeLabel})
                    </span>
                    <span className={`font-bold font-mono ${ch.periodNetGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {ch.periodNetGrowth >= 0 ? '+' : ''}{(ch.periodNetGrowth || 0).toLocaleString()} subs
                    </span>
                  </div>

                  {/* Views in Period */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      Views ({rangeLabel})
                    </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {(ch.periodViews || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Comments in Period */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      Comments ({rangeLabel})
                    </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {(ch.periodComments || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Lifetime Views */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Total Lifetime Views
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {(ch.totalViews || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Videos Count */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-slate-400" />
                      Total Catalog Videos
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {ch.totalVideos} videos
                    </span>
                  </div>
                </div>
              </div>

              {/* External Channel Link */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <a
                  href={`https://www.youtube.com/${ch.customUrl || 'channel/' + ch.channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
                >
                  Visit Channel <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Core Interactive Comparison Graphs Section */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Graph Header: Metric Tabs & Chart Configuration Controls */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-red-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Multi-Channel Comparative Graph
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct telemetry overlap for {comparisonData?.channels.map((c) => c.title).join(' vs ')} ({rangeLabel})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveMetricTab('views')}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  activeMetricTab === 'views'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Views on Date
              </button>
              <button
                type="button"
                onClick={() => setActiveMetricTab('growth')}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  activeMetricTab === 'growth'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Subscriber Growth
              </button>
              <button
                type="button"
                onClick={() => setActiveMetricTab('comments')}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  activeMetricTab === 'comments'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Comments on Date
              </button>
              <button
                type="button"
                onClick={() => setActiveMetricTab('all')}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  activeMetricTab === 'all'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All 3 Metrics Grid
              </button>
            </div>

            {/* Daily vs Cumulative Toggle (for single metric view) */}
            {activeMetricTab !== 'all' && (
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('daily')}
                  className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'daily'
                      ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  On Date
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cumulative')}
                  className={`py-1.5 px-2.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'cumulative'
                      ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Cumulative
                </button>
              </div>
            )}

            {/* Chart Type Toggle */}
            {activeMetricTab !== 'all' && (
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`py-1 px-2 rounded-lg cursor-pointer ${chartType === 'area' ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Area
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`py-1 px-2 rounded-lg cursor-pointer ${chartType === 'line' ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Line
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`py-1 px-2 rounded-lg cursor-pointer ${chartType === 'bar' ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Bar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chart Content Area */}
        <div className="p-6">
          {dataLoading ? (
            <div className="h-80 flex flex-col items-center justify-center text-slate-400 animate-pulse text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-red-500 mb-2" />
              Aggregating multi-channel comparison telemetry...
            </div>
          ) : !comparisonData || comparisonData.timeseries.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Calendar className="w-8 h-8 opacity-40 mb-2" />
              No time-series data captured for the selected channels in this date range.
            </div>
          ) : activeMetricTab !== 'all' ? (
            /* Single Primary Metric Chart (Views / Subscriber Growth / Comments) */
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={comparisonData.timeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(val) => val.slice(5)} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip content={<CustomMultiTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {comparisonData.channels.map((ch, idx) => {
                      const theme = CHANNEL_COLORS[idx] || CHANNEL_COLORS[0];
                      const dataKey = viewMode === 'cumulative'
                        ? activeMetricTab === 'views'
                          ? `cumViews_${ch.id}`
                          : activeMetricTab === 'growth'
                          ? `cumGrowth_${ch.id}`
                          : `cumComments_${ch.id}`
                        : activeMetricTab === 'views'
                        ? `views_${ch.id}`
                        : activeMetricTab === 'growth'
                        ? `growth_${ch.id}`
                        : `comments_${ch.id}`;

                      return (
                        <Bar
                          key={ch.id}
                          dataKey={dataKey}
                          name={ch.title}
                          fill={theme.fill}
                          radius={[4, 4, 0, 0]}
                        />
                      );
                    })}
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={comparisonData.timeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(val) => val.slice(5)} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip content={<CustomMultiTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {comparisonData.channels.map((ch, idx) => {
                      const theme = CHANNEL_COLORS[idx] || CHANNEL_COLORS[0];
                      const dataKey = viewMode === 'cumulative'
                        ? activeMetricTab === 'views'
                          ? `cumViews_${ch.id}`
                          : activeMetricTab === 'growth'
                          ? `cumGrowth_${ch.id}`
                          : `cumComments_${ch.id}`
                        : activeMetricTab === 'views'
                        ? `views_${ch.id}`
                        : activeMetricTab === 'growth'
                        ? `growth_${ch.id}`
                        : `comments_${ch.id}`;

                      return (
                        <Line
                          key={ch.id}
                          type="monotone"
                          dataKey={dataKey}
                          name={ch.title}
                          stroke={theme.stroke}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: theme.stroke }}
                          activeDot={{ r: 6 }}
                        />
                      );
                    })}
                  </LineChart>
                ) : (
                  <AreaChart data={comparisonData.timeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      {comparisonData.channels.map((ch, idx) => {
                        const theme = CHANNEL_COLORS[idx] || CHANNEL_COLORS[0];
                        return (
                          <linearGradient key={ch.id} id={`grad_${ch.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.stroke} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={theme.stroke} stopOpacity={0.0} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(val) => val.slice(5)} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip content={<CustomMultiTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {comparisonData.channels.map((ch, idx) => {
                      const theme = CHANNEL_COLORS[idx] || CHANNEL_COLORS[0];
                      const dataKey = viewMode === 'cumulative'
                        ? activeMetricTab === 'views'
                          ? `cumViews_${ch.id}`
                          : activeMetricTab === 'growth'
                          ? `cumGrowth_${ch.id}`
                          : `cumComments_${ch.id}`
                        : activeMetricTab === 'views'
                        ? `views_${ch.id}`
                        : activeMetricTab === 'growth'
                        ? `growth_${ch.id}`
                        : `comments_${ch.id}`;

                      return (
                        <Area
                          key={ch.id}
                          type="monotone"
                          dataKey={dataKey}
                          name={ch.title}
                          stroke={theme.stroke}
                          strokeWidth={2}
                          fill={`url(#grad_${ch.id})`}
                        />
                      );
                    })}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            /* All-in-One Multi-Metric Grid: 3 Stacked Graphs */
            <div className="space-y-8">
              {/* 1. Daily Views Graph */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-red-500" />
                    Daily Video Views on Date
                  </span>
                  <span className="text-[11px] text-slate-400">Traffic Comparison</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={comparisonData.timeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(val) => val.slice(5)} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip content={<CustomMultiTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      {comparisonData.channels.map((ch, idx) => (
                        <Area
                          key={ch.id}
                          type="monotone"
                          dataKey={`views_${ch.id}`}
                          name={ch.title}
                          stroke={CHANNEL_COLORS[idx]?.stroke || '#ef4444'}
                          fill={CHANNEL_COLORS[idx]?.stroke || '#ef4444'}
                          fillOpacity={0.15}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Subscriber Growth on Date */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    Subscriber Growth on Date (Daily Net Subs)
                  </span>
                  <span className="text-[11px] text-slate-400">Audience Growth Velocity</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.timeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(val) => val.slice(5)} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip content={<CustomMultiTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      {comparisonData.channels.map((ch, idx) => (
                        <Bar
                          key={ch.id}
                          dataKey={`growth_${ch.id}`}
                          name={ch.title}
                          fill={CHANNEL_COLORS[idx]?.fill || '#ef4444'}
                          radius={[3, 3, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Comments on Date */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    Audience Comments on Date
                  </span>
                  <span className="text-[11px] text-slate-400">Discussion Engagement</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData.timeseries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(val) => val.slice(5)} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip content={<CustomMultiTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      {comparisonData.channels.map((ch, idx) => (
                        <Line
                          key={ch.id}
                          type="monotone"
                          dataKey={`comments_${ch.id}`}
                          name={ch.title}
                          stroke={CHANNEL_COLORS[idx]?.stroke || '#ef4444'}
                          strokeWidth={2}
                          dot={{ r: 2.5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Detailed Daily Telemetry Comparison Table */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              Day-by-Day Cross-Channel Telemetry Ledger
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daily telemetry table comparing views, subscriber growth, and comments on each calendar date.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by date (YYYY-MM-DD)..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="rounded-xl pl-8 pr-3 py-1 text-xs h-9 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white w-52 sm:w-60 focus-visible:ring-1 focus-visible:ring-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6 whitespace-nowrap">Date</th>
                {comparisonData?.channels.map((ch, idx) => {
                  const theme = CHANNEL_COLORS[idx] || CHANNEL_COLORS[0];
                  return (
                    <th key={ch.id} className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${theme.badge}`} />
                        <span className="truncate max-w-[120px]">{ch.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 normal-case font-mono mt-0.5">
                        Views / Subs / Comments
                      </div>
                    </th>
                  );
                })}
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Daily Leader</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredTableRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    No records found for the selected date filter.
                  </td>
                </tr>
              ) : (
                filteredTableRows.map((row) => {
                  // Determine daily views leader
                  let topCh = comparisonData?.channels[0];
                  let topViews = -1;
                  comparisonData?.channels.forEach((ch) => {
                    const v = Number(row[`views_${ch.id}`] || 0);
                    if (v > topViews) {
                      topViews = v;
                      topCh = ch;
                    }
                  });

                  return (
                    <tr key={row.date} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-6 whitespace-nowrap font-medium font-sans text-slate-800 dark:text-slate-200">
                        {row.date}
                      </td>

                      {comparisonData?.channels.map((ch) => {
                        const views = Number(row[`views_${ch.id}`] || 0);
                        const growth = Number(row[`growth_${ch.id}`] || 0);
                        const comments = Number(row[`comments_${ch.id}`] || 0);

                        return (
                          <td key={ch.id} className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {views.toLocaleString()}
                            </span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className={growth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {growth >= 0 ? `+${growth}` : growth}
                            </span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-amber-600 dark:text-amber-400">
                              {comments.toLocaleString()}
                            </span>
                          </td>
                        );
                      })}

                      <td className="py-3 px-6 text-right whitespace-nowrap font-sans">
                        {topCh && topViews > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            {topCh.title}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}
