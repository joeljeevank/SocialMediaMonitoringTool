'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Settings, 
  Plus
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
  const [userDetails, setUserDetails] = useState(() => {
    if (isHydrated() && typeof window !== 'undefined') {
      return {
        name: localStorage.getItem('user_name') || 'Administrator',
        companyName: localStorage.getItem('company_name') || 'Enterprise Suite',
        companyRole: localStorage.getItem('company_role') || 'Head of Analytics',
        role: localStorage.getItem('user_role') || 'super_admin',
        email: localStorage.getItem('user_email') || 'admin@example.com'
      };
    }
    return {
      name: 'Administrator',
      companyName: 'Enterprise Suite',
      companyRole: 'Head of Analytics',
      role: 'super_admin',
      email: 'admin@example.com'
    };
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
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-sm">
              {userDetails.name.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {userDetails.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 capitalize">
                  {userDetails.role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>{userDetails.email}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>{userDetails.companyName}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{userDetails.companyRole}</span>
              </p>
            </div>
          </div>

          <Link href="/dashboard/settings">
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold px-4 py-2 gap-2 shrink-0 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Account Settings</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Connected LinkedIn Accounts Section */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              in
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Connected LinkedIn Accounts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitored executive profiles and company pages ({accounts.length})
              </p>
            </div>
          </div>
          <Link href="/dashboard">
            <Button className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Account</span>
            </Button>
          </Link>
        </div>

        {accountsLoading && accounts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131a29] space-y-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-2.5 w-16 rounded" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-6 w-14 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">No LinkedIn accounts connected yet.</p>
            <Link href="/dashboard" className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-1 inline-block">
              Add your first LinkedIn profile &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {accounts.map((acc) => {
              const latestAnalytics = acc.analytics && acc.analytics.length > 0 ? acc.analytics[0] : null;
              return (
                <div 
                  key={acc.id} 
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131a29] hover:border-blue-500/40 transition-all card-hover-effect space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {acc.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {acc.username}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active Monitoring</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shrink-0">
                      LinkedIn
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Followers</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {latestAnalytics?.followers ? latestAnalytics.followers.toLocaleString() : '—'}
                      </span>
                    </div>
                    <Link href={`/dashboard/${acc.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 rounded-lg gap-1">
                        <span>Analytics</span>
                        <ArrowRight className="w-3 h-3" />
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
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <YoutubeIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Connected YouTube Channels
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracked channels and Google OAuth analytics streams ({channels.length})
              </p>
            </div>
          </div>
          <Link href="/dashboard/youtube">
            <Button className="h-8 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Channel</span>
            </Button>
          </Link>
        </div>

        {channelsLoading && channels.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131a29] space-y-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-2.5 w-16 rounded" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-6 w-14 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">No YouTube channels connected yet.</p>
            <Link href="/dashboard/youtube" className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline mt-1 inline-block">
              Track a YouTube channel or sign in with Google &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {channels.map((ch) => (
              <div 
                key={ch.id} 
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131a29] hover:border-red-500/40 transition-all card-hover-effect space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ch.thumbnailUrl ? (
                      <img 
                        src={ch.thumbnailUrl} 
                        alt={ch.title} 
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-red-600/10 dark:bg-red-600/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                        YT
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {ch.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {ch.customUrl || ch.channelId}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                    ch.isOAuth 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' 
                      : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60'
                  }`}>
                    {ch.isOAuth ? 'OAuth Studio' : 'Public API'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Subscribers</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {ch.subscribers ? ch.subscribers.toLocaleString() : '—'}
                    </span>
                  </div>
                  <Link href={`/dashboard/youtube`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 rounded-lg gap-1">
                      <span>Analytics</span>
                      <ArrowRight className="w-3 h-3" />
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
