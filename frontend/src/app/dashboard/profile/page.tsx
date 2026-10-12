'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Settings, 
  Plus,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/youtube-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE_URL } from '@/lib/api-config';
import { getFromCache, setInCache, CacheKeys, getSSRSafeCache, isHydrated, markHydrated } from '@/lib/data-cache';

type Analytics = {
  likes: number;
  comments: number;
  views: number;
  followers: number;
  recentPosts: number;
  date: string;
  lastCollectionTime?: string;
};

type Account = {
  id: number;
  platform: string;
  username: string;
  profileUrl: string;
  status: string;
  analytics?: Analytics[];
};

type Channel = {
  id: number;
  channelId: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
  subscribers: number;
  totalViews?: string;
  totalVideos?: number;
  status?: string;
  lastSyncedAt?: string;
  googleAccountEmail?: string;
  isOAuth?: boolean;
};

export default function ProfileDashboard() {
  // SSR-safe cache retrieval: returns null during initial SSR/hydration, cached data on client tab switch
  const cachedAccounts = getSSRSafeCache<Account[]>(CacheKeys.ACCOUNTS);
  const cachedChannels = getSSRSafeCache<Channel[]>(CacheKeys.YOUTUBE_CHANNELS);

  const [accounts, setAccounts] = useState<Account[]>(() => cachedAccounts || []);
  const [channels, setChannels] = useState<Channel[]>(() => cachedChannels || []);
  const [accountsLoading, setAccountsLoading] = useState<boolean>(!cachedAccounts);
  const [channelsLoading, setChannelsLoading] = useState<boolean>(!cachedChannels);

  // Initialize user details safely without SSR mismatch
  const [userDetails, setUserDetails] = useState({
    name: 'Administrator',
    companyName: 'Enterprise Suite',
    companyRole: 'Head of Analytics',
    role: 'super_admin',
    email: 'admin@example.com'
  });

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        setInCache(CacheKeys.ACCOUNTS, data);
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn accounts', error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/channels`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
        setInCache(CacheKeys.YOUTUBE_CHANNELS, data);
      }
    } catch (error) {
      console.error('Failed to fetch YouTube channels', error);
    } finally {
      setChannelsLoading(false);
    }
  };

  useEffect(() => {
    markHydrated();
    setUserDetails({
      name: localStorage.getItem('user_name') || 'Administrator',
      companyName: localStorage.getItem('company_name') || 'Enterprise Suite',
      companyRole: localStorage.getItem('company_role') || 'Head of Analytics',
      role: localStorage.getItem('user_role') || 'super_admin',
      email: localStorage.getItem('user_email') || 'admin@example.com'
    });

    const acc = getFromCache<Account[]>(CacheKeys.ACCOUNTS);
    if (acc) {
      setAccounts(acc);
      setAccountsLoading(false);
    }

    const ch = getFromCache<Channel[]>(CacheKeys.YOUTUBE_CHANNELS);
    if (ch) {
      setChannels(ch);
      setChannelsLoading(false);
    }

    // Silent background revalidation
    fetchAccounts();
    fetchChannels();
  }, []);

  return (
    <div className="space-y-6">
      {/* Profile Header Hero Card with Gradient Ambient Ring */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden glow-card">
        {/* Ambient light glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-cyan-500 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-xl shadow-indigo-600/30 ring-4 ring-white/10">
              {userDetails.name.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {userDetails.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 capitalize shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  {userDetails.role.replace('_', ' ')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operator
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2.5 flex-wrap">
                <span className="font-mono">{userDetails.email}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  {userDetails.companyName}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-indigo-600 dark:text-cyan-400 font-semibold">{userDetails.companyRole}</span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/settings"
            className="inline-flex items-center rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold px-4 py-2.5 gap-2 shrink-0 cursor-pointer text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4 text-indigo-500" />
            <span>Account Settings</span>
          </Link>
        </div>
      </div>

      {/* Connected LinkedIn Accounts Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center font-bold text-base ring-1 ring-sky-500/30">
              in
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connected LinkedIn Profiles
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  {accounts.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Executive profiles and public pages with real-time impression telemetry
              </p>
            </div>
          </div>
          <Link href="/dashboard">
            <Button className="h-9 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-sky-600/25 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Connect Profile</span>
            </Button>
          </Link>
        </div>

        {accountsLoading && accounts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0c121e]/90 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-8 w-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-slate-50/50 dark:bg-black/20">
            <p className="text-xs text-slate-500 dark:text-slate-400">No LinkedIn accounts connected yet.</p>
            <Link href="/dashboard" className="text-xs text-sky-500 font-bold hover:underline mt-2 inline-block">
              + Connect your first LinkedIn profile
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const sorted = acc.analytics && acc.analytics.length > 0
                ? [...acc.analytics].sort((a: any, b: any) => {
                    const timeA = new Date(a.lastCollectionTime || a.date || 0).getTime() || a.id || 0;
                    const timeB = new Date(b.lastCollectionTime || b.date || 0).getTime() || b.id || 0;
                    return timeA - timeB;
                  })
                : [];
              const latestAnalytics = sorted.length > 0 ? sorted[sorted.length - 1] : null;
              const followersCount = (latestAnalytics?.followers && latestAnalytics.followers > 0)
                ? latestAnalytics.followers
                : (sorted.slice().reverse().find((x: any) => (x.followers || 0) > 0)?.followers ?? latestAnalytics?.followers);

              return (
                <div 
                  key={acc.id} 
                  className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0c121e]/90 glow-card glow-card-linkedin space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center font-bold text-lg shrink-0 ring-1 ring-sky-500/30">
                        {acc.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {acc.username}
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-500 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Live Telemetry</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/30 shrink-0">
                      LinkedIn
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Followers</span>
                      <span className="font-extrabold text-slate-900 dark:text-white font-mono text-base">
                        {followersCount !== undefined && followersCount !== null && Number(followersCount) > 0
                          ? Number(followersCount).toLocaleString()
                          : (latestAnalytics?.followers ? latestAnalytics.followers.toLocaleString() : '—')}
                      </span>
                    </div>
                    <Link href={`/dashboard/${acc.id}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-sky-500 border-sky-500/30 hover:bg-sky-500/10 px-3 rounded-xl gap-1.5">
                        <span>Analytics</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connected YouTube Channels Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center font-bold text-xs ring-1 ring-red-500/30">
              <YoutubeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connected YouTube Channels
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                  {channels.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live subscriber telemetry and Google OAuth Studio data streams
              </p>
            </div>
          </div>
          <Link href="/dashboard/youtube">
            <Button className="h-9 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-red-600/25 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Connect Channel</span>
            </Button>
          </Link>
        </div>

        {channelsLoading && channels.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0c121e]/90 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-8 w-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-slate-50/50 dark:bg-black/20">
            <p className="text-xs text-slate-500 dark:text-slate-400">No YouTube channels connected yet.</p>
            <Link href="/dashboard/youtube" className="text-xs text-red-500 font-bold hover:underline mt-2 inline-block">
              + Track a YouTube channel or sign in with Google
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => (
              <div 
                key={ch.id} 
                className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0c121e]/90 glow-card glow-card-youtube space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {ch.thumbnailUrl ? (
                      <img 
                        src={ch.thumbnailUrl} 
                        alt={ch.title} 
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-red-500/30 shrink-0 shadow-md" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-red-500/30">
                        YT
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {ch.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
                        {ch.customUrl || ch.channelId}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                    ch.isOAuth 
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                      : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                  }`}>
                    {ch.isOAuth ? 'OAuth Studio' : 'Public API'}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Subscribers</span>
                    <span className="font-extrabold text-slate-900 dark:text-white font-mono text-base">
                      {ch.subscribers ? ch.subscribers.toLocaleString() : '—'}
                    </span>
                  </div>
                  <Link href={`/dashboard/youtube`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-red-500 border-red-500/30 hover:bg-red-500/10 px-3 rounded-xl gap-1.5">
                      <span>Analytics</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
