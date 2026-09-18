'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, Clock, ArrowRight } from 'lucide-react';

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

export default function ProfileDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [userDetails, setUserDetails] = useState({
    name: '',
    companyName: '',
    companyRole: '',
    role: '',
    email: ''
  });

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:3001/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    setUserDetails({
      name: localStorage.getItem('user_name') || '',
      companyName: localStorage.getItem('company_name') || '',
      companyRole: localStorage.getItem('company_role') || '',
      role: userRole || '',
      email: localStorage.getItem('user_email') || ''
    });
    fetchAccounts();
  }, []);



  return (
    <div className="space-y-6 select-none">
      {/* Profile Hero Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-950/40 via-indigo-950/40 to-black/70 p-6 sm:p-8 rounded-3xl border border-cyan-500/20 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/30 flex-shrink-0">
              <div className="w-full h-full rounded-2xl bg-slate-950/80 backdrop-blur-md flex items-center justify-center text-white font-black text-2xl uppercase">
                {userDetails.name?.charAt(0) || 'U'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {userDetails.name || 'System User'}
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {userDetails.role?.replace('_', ' ') || 'User'}
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">
                {userDetails.email || 'No email registered'} {userDetails.companyName ? `• ${userDetails.companyName}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/settings"
              prefetch={true}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-all shadow-sm cursor-pointer"
            >
              Account Settings
            </Link>
          </div>
        </div>
      </div>

      {/* User Information Grid */}
      <Card className="bg-white/90 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-3 border-b border-slate-100 dark:border-white/5">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-1">Full Name</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{userDetails.name || 'Super Admin'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-1">Email / Username</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{userDetails.email || 'admin'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-1">Company</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{userDetails.companyName || 'System HQ'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-1">Position / Title</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{userDetails.companyRole || 'Administrator'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 mb-1">Authorization</p>
              <p className="text-sm font-extrabold text-cyan-600 dark:text-cyan-400 capitalize truncate">{userDetails.role?.replace('_', ' ') || 'Super Admin'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-xl overflow-hidden mt-6 rounded-3xl">
        <CardHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Connected Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-gray-400">
              No accounts connected yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {accounts.map((acc) => {
                const sorted = acc.analytics
                  ? [...acc.analytics].sort((a, b) => new Date(a.lastCollectionTime || a.date).getTime() - new Date(b.lastCollectionTime || b.date).getTime())
                  : [];
                const latestAnalytics = sorted.length > 0 ? sorted[sorted.length - 1] : null;
                const isSyncedToday = latestAnalytics?.lastCollectionTime ? (
                  new Date(latestAnalytics.lastCollectionTime).toDateString() === new Date().toDateString()
                ) : false;
                const lastSync = latestAnalytics?.lastCollectionTime 
                  ? new Date(latestAnalytics.lastCollectionTime).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                  : null;

                return (
                  <div key={acc.id} className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 hover:bg-slate-200 dark:hover:bg-cyan-500/5 transition-colors shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg">in</div>
                    <div className="w-full">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate px-2" title={acc.username}>{acc.username}</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{acc.platform}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        {acc.status}
                      </span>
                      {isSyncedToday ? (
                        <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Synchronized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Pending Sync
                        </span>
                      )}
                    </div>

                    <div className="w-full pt-2.5 border-t border-slate-200 dark:border-white/10 flex flex-col items-center gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-gray-400">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>Last Sync:</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300">{lastSync || 'Never'}</span>
                      </div>
                      <Link 
                        href={`/dashboard/${acc.id}`}
                        prefetch={true}
                        className="inline-flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline pt-0.5 cursor-pointer"
                      >
                        Profile Analytics <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
