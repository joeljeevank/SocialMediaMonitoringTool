'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  Eye, 
  Users, 
  FileText, 
  Clock, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import axios from 'axios';

function cleanPostDate(raw?: string | null) {
  if (!raw) return '-';
  let s = raw.trim();
  
  // Remove "Visible to ..." and anything after it (case-insensitive)
  s = s.replace(/•?\s*visible to.*$/i, '').trim();
  
  // Extract full relative time e.g. "3 weeks ago", "2 days ago", "1 hour ago", "1 month ago"
  const longAgoMatch = s.match(/(\d+\s*(?:second|minute|hour|day|week|month|year)s?\s*ago)/i);
  if (longAgoMatch) {
    return longAgoMatch[1];
  }
  
  // Extract short relative time: check "mo" (months) before "m" (minutes)
  const shortMatch = s.match(/^(\d+)(mo|[smhdwy])/i);
  if (shortMatch) {
    const num = parseInt(shortMatch[1], 10);
    const unit = shortMatch[2].toLowerCase();
    if (num === 0) return 'Just now';
    const unitMap: Record<string, string> = {
      s: num === 1 ? '1 second ago' : `${num} seconds ago`,
      m: num === 1 ? '1 minute ago' : `${num} minutes ago`,
      h: num === 1 ? '1 hour ago' : `${num} hours ago`,
      d: num === 1 ? '1 day ago' : `${num} days ago`,
      w: num === 1 ? '1 week ago' : `${num} weeks ago`,
      mo: num === 1 ? '1 month ago' : `${num} months ago`,
      y: num === 1 ? '1 year ago' : `${num} years ago`,
    };
    return unitMap[unit] || `${num}${unit} ago`;
  }
  
  // Clean trailing bullets, dots or whitespace
  s = s.replace(/[•·\s]+$/, '').trim();
  return s || '-';
}

function cleanAuthor(raw?: string | null) {
  if (!raw) return 'Unknown';
  let s = raw.trim();
  
  // Remove "• You", "Verified", badges etc.
  s = s.replace(/•?\s*Verified/gi, '');
  s = s.replace(/•?\s*You\b/gi, '');
  s = s.replace(/[•·\s]+$/, '').trim();
  
  // If the author name is duplicated (e.g., "Joel Jeevan Kumar S Joel Jeevan Kumar S")
  const words = s.split(/\s+/);
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.length / 2;
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half).join(' ');
    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
      s = firstHalf;
    }
  }
  
  return s || 'Unknown';
}

function getRealtimePostDate(postUrl?: string | null, rawPostDate?: string | null) {
  // 1. Extract exact real-time timestamp from LinkedIn Activity URN (first 42 bits of Snowflake ID)
  if (postUrl) {
    const match = postUrl.match(/(?:activity|share)[:/]+(\d{17,20})/);
    if (match) {
      try {
        const activityId = BigInt(match[1]);
        const timestampMs = Number(activityId >> BigInt(22));
        const date = new Date(timestampMs);
        if (!isNaN(date.getTime()) && date.getFullYear() > 2005 && date.getTime() <= Date.now() + 86400000) {
          const diffMs = Date.now() - date.getTime();
          if (diffMs < 0) return 'Just now';
          const diffSecs = Math.floor(diffMs / 1000);
          if (diffSecs < 60) return 'Just now';
          const diffMins = Math.floor(diffSecs / 60);
          if (diffMins < 60) return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
          const diffHours = Math.floor(diffMins / 60);
          if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
          const diffDays = Math.floor(diffHours / 24);
          if (diffDays < 7) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
          const diffWeeks = Math.floor(diffDays / 7);
          if (diffWeeks < 5) return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
          const diffMonths = Math.floor(diffDays / 30);
          if (diffMonths < 12) return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
          const diffYears = Math.floor(diffDays / 365);
          return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
        }
      } catch {
        // Fall through on parsing failure
      }
    }
  }

  // 2. Fallback to clean raw scraped string
  return cleanPostDate(rawPostDate);
}

function getExactPostDateTooltip(postUrl?: string | null, rawPostDate?: string | null) {
  if (postUrl) {
    const match = postUrl.match(/(?:activity|share)[:/]+(\d{17,20})/);
    if (match) {
      try {
        const activityId = BigInt(match[1]);
        const timestampMs = Number(activityId >> BigInt(22));
        const date = new Date(timestampMs);
        if (!isNaN(date.getTime()) && date.getFullYear() > 2005) {
          return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        // Fall through on parsing failure
      }
    }
  }
  return rawPostDate || '';
}

export default function AnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);
  const [collectionSuccessMsg, setCollectionSuccessMsg] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [sessionSynced, setSessionSynced] = useState(false);

  // Database Posts & Explorer Controls State
  const [posts, setPosts] = useState<any[]>([]);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [postPage, setPostPage] = useState<number>(1);
  const [postTotalPages, setPostTotalPages] = useState<number>(1);
  const [postSearch, setPostSearch] = useState<string>('');
  const [postSort, setPostSort] = useState<string>('createdAt');
  const [postOrder, setPostOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [postsLoading, setPostsLoading] = useState<boolean>(false);

  // Fetch Stored Posts from PostgreSQL Database
  const fetchPosts = useCallback(async () => {
    if (!id) return;
    setPostsLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/api/linkedin/posts`, {
        params: {
          accountId: id,
          search: postSearch,
          sort: postSort,
          order: postOrder,
          page: postPage,
          limit: 10,
        },
      });
      if (res.data && Array.isArray(res.data.items)) {
        const mapped = res.data.items.map((p: any) => ({
          ...p,
          postDate: getRealtimePostDate(p.postUrl, p.postDate || p.createdAt),
          impressions: p.impressions ?? p.views ?? 0,
          views: p.views ?? p.impressions ?? 0,
        }));
        setPosts(mapped);
        setTotalPosts(res.data.total || 0);
        setPostTotalPages(res.data.totalPages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch posts from API', e);
    } finally {
      setPostsLoading(false);
    }
  }, [id, postSearch, postSort, postOrder, postPage]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Load cached scraped data on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const cached = localStorage.getItem(`scraped_data_${id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.posts) {
            parsed.posts = parsed.posts.map((p: any) => ({
              ...p,
              postDate: getRealtimePostDate(p.postUrl, p.postDate),
              impressions: p.impressions ?? p.views ?? 0,
              views: p.views ?? p.impressions ?? 0,
            }));
          }
          setScrapedData(parsed);
        } catch (e) {
          console.error('Failed to parse cached scraped data', e);
        }
      }
    }
  }, [id]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/analytics/${id}`);
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      }
      setLoading(false);
    };
    if (id) fetchAnalytics();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-600 rounded-full animate-spin"></div>
        <div className="text-slate-600 dark:text-gray-300 font-medium text-base">Loading analytics...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No data available</h2>
        <p className="text-slate-500 dark:text-gray-400 mb-6">No analytics data is registered for this account yet.</p>
        <Button onClick={() => router.back()} variant="outline" className="rounded-full px-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const latest = data[data.length - 1];

  // Derive the effective followers count:
  // 1. From latest record if > 0
  // 2. From scrapedData if > 0
  // 3. Fallback to reverse search in data history for any non-zero follower count
  const effectiveFollowers = 
    (latest?.followers && latest.followers > 0)
      ? latest.followers
      : (scrapedData?.followers && scrapedData.followers > 0)
        ? scrapedData.followers
        : ([...data].reverse().find(d => d.followers > 0)?.followers || 0);

  // Derive the effective last collection timestamp:
  // 1. From recently scraped data
  // 2. From database records (reverse search for newest timestamp)
  // 3. Fallback to latest record
  const effectiveLastCollectionTime = 
    scrapedData?.lastCollectionTime ||
    [...data].reverse().find(d => d.lastCollectionTime)?.lastCollectionTime ||
    latest?.lastCollectionTime ||
    null;

  const isCollectedToday = (isoString?: string | null) => {
    if (!isoString) return false;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    } catch {
      return false;
    }
  };

  // Profile data is synchronized only if collected today or during the current session
  const isSynchronized = sessionSynced || isCollectedToday(effectiveLastCollectionTime);

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      if (diffMs < 0) return 'Just now';
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const handleCollectLinkedInData = async () => {
    setCollecting(true);
    setCollectionSuccessMsg(null);
    try {
      const res = await axios.post(`http://localhost:3001/api/linkedin/collect?accountId=${id}`);
      const result = res.data;
      if (result.status === 'success' || result.success) {
        setSessionSynced(true);
        setScrapedData(result.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`scraped_data_${id}`, JSON.stringify(result.data));
        }
        // Refresh analytics and all posts
        const aRes = await axios.get(`http://localhost:3001/analytics/${id}`);
        setData(aRes.data);
        fetchPosts();
        
        setCollectionSuccessMsg('Data successfully collected and synchronized from LinkedIn!');
        setTimeout(() => setCollectionSuccessMsg(null), 9000);
      } else {
        alert('Error collecting data: ' + result.message);
      }
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.response?.data?.message || e.response?.data?.error || e.message;
      alert('Error collecting data: ' + errorMsg);
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="text-slate-500 dark:text-gray-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile Analytics</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">Detailed performance metrics for this account</p>
          </div>
        </div>

        {/* Action Controls & Realtime Last Collected Indicator with Smooth Curved Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-cyan-500/20 shadow-sm">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              {isSynchronized ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              )}
            </div>
            <Clock className="w-4 h-4 text-cyan-500 shrink-0" />
            <div className="text-xs flex items-center flex-wrap gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isSynchronized 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}>
                {isSynchronized ? 'Synchronized' : 'Pending Sync'}
              </span>
              <span className="text-slate-500 dark:text-gray-400 font-medium">Last Synchronized:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatDateTime(effectiveLastCollectionTime) || 'Never'}
              </span>
              {effectiveLastCollectionTime && (
                <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                  ({getRelativeTime(effectiveLastCollectionTime)})
                </span>
              )}
            </div>
          </div>

          <Button 
            onClick={handleCollectLinkedInData} 
            disabled={collecting}
            className="rounded-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-bold px-7 py-2.5 shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 flex items-center justify-center gap-2 cursor-pointer h-11"
          >
            <RefreshCw className={`w-4 h-4 ${collecting ? 'animate-spin' : ''}`} />
            {collecting ? 'Collecting Data...' : 'Collect LinkedIn Data'}
          </Button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {collectionSuccessMsg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg shadow-emerald-500/5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">Collection Completed</p>
            <p className="text-xs opacity-90">{collectionSuccessMsg}</p>
          </div>
        </div>
      )}

      {/* Prominent LinkedIn Data Collection Status Card - Curved 3xl edges */}
      <Card className="bg-white/90 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-xl overflow-hidden rounded-3xl">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 border border-cyan-500/30 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/20">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    LinkedIn Data Collection
                  </h3>
                  {isSynchronized ? (
                    <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Synchronized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Not Synced
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1.5">
                  {isSynchronized 
                    ? 'Profile metrics and activity data are synchronized with LinkedIn.' 
                    : 'Data is currently not synced. Click "Collect LinkedIn Data" above to fetch the latest metrics from LinkedIn.'}
                </p>

                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-slate-500 dark:text-gray-400 font-medium">Last Synchronized:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatDateTime(effectiveLastCollectionTime) || 'Never (Not yet synchronized)'}
                  </span>
                  {effectiveLastCollectionTime && (
                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                      • {getRelativeTime(effectiveLastCollectionTime)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metadata Stats with Curved 2xl Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-white/10 text-xs">
              <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-purple-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-gray-400 block mb-0.5">Sync Status</span>
                <span className={`font-semibold flex items-center gap-1.5 ${isSynchronized ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${isSynchronized ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  {isSynchronized ? 'Synchronized' : 'Not Synced'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-purple-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-gray-400 block mb-0.5">Data Source</span>
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  {scrapedData?.dataSource || latest?.dataSource || 'LinkedIn Scraper'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-purple-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-gray-400 block mb-0.5">Posts Analyzed</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {scrapedData?.posts?.length ?? latest?.recentPosts ?? 0} posts
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-purple-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-gray-400 block mb-0.5">Scraper Engine</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Playwright Active</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Published LinkedIn Posts Table & Explorer */}
      {(scrapedData || posts.length > 0 || totalPosts > 0) && (
        <Card className="glass border border-purple-200 dark:border-purple-500/30 shadow-xl overflow-hidden rounded-3xl">
          <CardHeader className="p-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  All Published LinkedIn Posts & Engagement
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Showing {posts.length > 0 ? posts.length : (scrapedData?.posts?.length || 0)} of {totalPosts || scrapedData?.posts?.length || 0} posts collected from the profile activity stream
                </p>
              </div>

              {/* Post Controls: Search, Sort */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search posts..."
                    value={postSearch}
                    onChange={(e) => {
                      setPostSearch(e.target.value);
                      setPostPage(1);
                    }}
                    className="rounded-full pl-9 pr-4 py-1.5 text-xs h-9 bg-slate-100 dark:bg-white/5 border-purple-200 dark:border-white/10 w-44 sm:w-56 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={postSort}
                    onChange={(e) => {
                      setPostSort(e.target.value);
                      setPostPage(1);
                    }}
                    className="rounded-full px-3.5 py-1.5 text-xs h-9 bg-slate-100 dark:bg-white/5 border border-purple-200 dark:border-white/10 text-slate-900 dark:text-white font-medium appearance-none pr-8 cursor-pointer"
                  >
                    <option value="createdAt" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Latest Published</option>
                    <option value="impressions" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Most Impressions</option>
                    <option value="likes" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Most Reactions</option>
                    <option value="comments" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Most Comments</option>
                  </select>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPostOrder(postOrder === 'ASC' ? 'DESC' : 'ASC')}
                  className="h-9 px-3 rounded-full text-xs font-semibold"
                  title={`Sort ${postOrder === 'ASC' ? 'Descending' : 'Ascending'}`}
                >
                  {postOrder === 'ASC' ? '▲ Asc' : '▼ Desc'}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 pt-0">
            {scrapedData?.unavailable && scrapedData.unavailable.length > 0 && (
              <div className="mb-4 text-xs bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300">
                <strong className="text-slate-800 dark:text-white">Note on metrics:</strong> Direct public profile scraping extracts likes, comments, and post counts. Unavailable metrics for this view: {scrapedData.unavailable.join(', ')}.
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-purple-200 dark:border-white/10">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 dark:bg-white/5 border-b border-purple-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-5 whitespace-nowrap">Author</th>
                    <th className="py-3.5 px-4 min-w-[260px]">Post Description</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Impressions</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Reactions</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Comments</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Post Date</th>
                    <th className="py-3.5 px-5 text-right whitespace-nowrap">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100 dark:divide-white/5">
                  {((posts.length === 0 && !scrapedData?.posts) || (posts.length === 0 && scrapedData?.posts?.length === 0)) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-gray-400">
                        {postsLoading ? 'Loading posts...' : 'No posts found. Click "Collect LinkedIn Data" to fetch all available posts.'}
                      </td>
                    </tr>
                  ) : (
                    (posts.length > 0 ? posts : (scrapedData?.posts || [])).map((post: any, idx: number) => (
                      <tr key={post.id || idx} className="hover:bg-purple-500/5 transition-colors">
                        <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white whitespace-nowrap align-top">
                          {cleanAuthor(post.author)}
                        </td>
                        <td className="py-3.5 px-4 max-w-md align-top">
                          {post.content && post.content.trim() ? (
                            <div className="space-y-1">
                              <p className="text-slate-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap line-clamp-3 font-normal" title={post.content}>
                                {post.content}
                              </p>
                              {post.content.length > 100 && (
                                <button
                                  type="button"
                                  onClick={() => setActiveModal('All Posts')}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-block"
                                >
                                  View full text →
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500 italic bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              Media / Photo post (no text description)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                            <Eye className="w-3.5 h-3.5" />
                            {(post.impressions ?? post.views ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-semibold text-pink-600 dark:text-pink-400">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {post.likes ?? 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {post.comments ?? 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-gray-300 align-top">
                          <span 
                            className="inline-flex items-center gap-1.5 font-medium bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/10 cursor-help"
                            title={getExactPostDateTooltip(post.postUrl, post.postDate)}
                          >
                            <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                            {getRealtimePostDate(post.postUrl, post.postDate)}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap align-top">
                          {post.postUrl ? (
                            <a 
                              href={post.postUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-3.5 py-1.5 rounded-full transition-colors"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {postTotalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-4">
                <span className="text-xs text-slate-500 dark:text-gray-400">
                  Page {postPage} of {postTotalPages} ({totalPosts} posts)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={postPage <= 1 || postsLoading}
                    onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 rounded-full text-xs font-semibold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={postPage >= postTotalPages || postsLoading}
                    onClick={() => setPostPage((p) => Math.min(postTotalPages, p + 1))}
                    className="h-8 px-3 rounded-full text-xs font-semibold"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Granular Details Dialog - Smooth 3xl curved edges */}
      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-4xl bg-white dark:bg-gray-900 text-slate-900 dark:text-white border border-purple-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{activeModal} Details</h2>
          </div>
          
          {!scrapedData?.posts || scrapedData.posts.length === 0 ? (
            <div className="text-slate-500 dark:text-gray-400 py-8 text-center">
              No detailed post data available yet. Please click <strong>"Collect LinkedIn Data"</strong> first to scrape the latest details.
            </div>
          ) : (
            <div className="space-y-5">
              {activeModal === 'Comments' && (
                <div className="bg-indigo-50 dark:bg-blue-900/20 text-indigo-800 dark:text-blue-300 p-4 rounded-2xl text-sm border border-indigo-100 dark:border-blue-800/30">
                  <strong>Note:</strong> The scraper configuration extracts total comment counts per post. Below are the posts that received comments.
                </div>
              )}
              {activeModal === 'Views' && (
                <div className="bg-indigo-50 dark:bg-blue-900/20 text-indigo-800 dark:text-blue-300 p-4 rounded-2xl text-sm border border-indigo-100 dark:border-blue-800/30">
                  <strong>Note:</strong> Post impressions represent the total number of times each post was displayed on screen to LinkedIn users.
                </div>
              )}
              
              {(posts.length > 0 ? posts : (scrapedData?.posts || []))
                .filter((p: any) => {
                   if (activeModal === 'Comments') return (p.comments ?? 0) > 0;
                   if (activeModal === 'Likes') return (p.likes ?? 0) > 0;
                   if (activeModal === 'Views') return true;
                   if (activeModal === 'All Posts' || activeModal === 'Recent Posts') return true;
                   return false;
                })
                .map((post: any, idx: number) => (
                <div key={idx} className="bg-slate-50 dark:bg-gray-800 p-6 rounded-2xl border border-purple-100 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-lg text-slate-900 dark:text-white">{cleanAuthor(post.author)}</h4>
                      <p 
                        className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5 cursor-help"
                        title={getExactPostDateTooltip(post.postUrl, post.postDate)}
                      >
                        <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                        {getRealtimePostDate(post.postUrl, post.postDate)}
                      </p>
                    </div>
                    {post.postUrl && (
                      <a 
                        href={post.postUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full transition-colors flex items-center gap-1 font-medium shadow-md shadow-indigo-500/20"
                      >
                        View on LinkedIn <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                      Post Description
                    </span>
                    {post.content && post.content.trim() ? (
                      <div className="text-slate-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed bg-slate-100/70 dark:bg-black/20 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 font-normal">
                        {post.content}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-white/5 p-3 rounded-xl flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        No text description attached to this post (Media or photo post).
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400 border-t border-slate-200 dark:border-gray-700 pt-3">
                    <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                      <Eye className="w-4 h-4" /> {(post.impressions ?? post.views ?? 0).toLocaleString()} impressions
                    </span>
                    <span className="flex items-center gap-1 font-medium text-pink-600 dark:text-pink-400">
                      <ThumbsUp className="w-4 h-4" /> {post.likes ?? 0}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <MessageCircle className="w-4 h-4" /> {post.comments ?? 0}
                    </span>
                  </div>
                </div>
              ))}
              
              {activeModal === 'Comments' && scrapedData.posts.filter((p: any) => (p.comments ?? 0) > 0).length === 0 && (
                 <div className="text-slate-500 dark:text-gray-400 py-8 text-center">None of the recent posts have comments.</div>
              )}
              {activeModal === 'Likes' && scrapedData.posts.filter((p: any) => (p.likes ?? 0) > 0).length === 0 && (
                 <div className="text-slate-500 dark:text-gray-400 py-8 text-center">None of the recent posts have likes.</div>
              )}
              {activeModal === 'Views' && scrapedData.posts.filter((p: any) => (p.impressions ?? p.views ?? 0) > 0).length === 0 && (
                 <div className="text-slate-500 dark:text-gray-400 py-8 text-center">None of the recent posts have recorded impressions yet.</div>
              )}
              {activeModal && ['Followers', 'Shares'].includes(activeModal) && (
                 <div className="text-slate-500 dark:text-gray-400 py-8 text-center">Granular per-post data for {activeModal} is not available via the public profile view.</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KPI Cards - Smooth 3xl Curved Cards with Curved Inner Icons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Followers', value: effectiveFollowers, icon: Users, color: 'text-blue-500' },
          { label: 'Views', value: latest.views ?? 0, icon: Eye, color: 'text-indigo-500' },
          { label: 'Likes', value: latest.likes ?? 0, icon: ThumbsUp, color: 'text-pink-500' },
          { label: 'Comments', value: latest.comments ?? 0, icon: MessageCircle, color: 'text-emerald-500' },
          { label: 'Shares', value: latest.shares ?? 0, icon: Share2, color: 'text-orange-500' },
          { label: 'All Posts', value: totalPosts || scrapedData?.posts?.length || latest.recentPosts || 0, icon: FileText, color: 'text-purple-600 dark:text-purple-400' },
        ].map((stat, i) => (
          <Card 
            key={i} 
            className={`glass border border-purple-200 dark:border-white/5 cursor-pointer transition-all hover:scale-105 hover:bg-slate-100 dark:hover:bg-white/5 shadow-md rounded-3xl ${activeModal === stat.label ? 'ring-2 ring-indigo-500' : ''}`}
            onClick={() => setActiveModal(stat.label)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value.toLocaleString()}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts - Smooth 3xl Curved Cards and Rounded Bars / Tooltips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Engagement Overview (Views)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '1.25rem', padding: '0.75rem 1rem' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="views" stroke="#818cf8" fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Interactions (Likes, Comments, Shares)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1.25rem', padding: '0.75rem 1rem' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Legend />
                <Bar dataKey="likes" fill="#f472b6" radius={[10, 10, 0, 0]} />
                <Bar dataKey="comments" fill="#34d399" radius={[10, 10, 0, 0]} />
                <Bar dataKey="shares" fill="#fb923c" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
