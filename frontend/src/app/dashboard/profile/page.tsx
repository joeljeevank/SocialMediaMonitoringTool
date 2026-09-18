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
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <User className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            My Profile
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">View your details and connected accounts.</p>
        </div>
      </div>

      <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-purple-500/50 shadow-xl rounded-3xl">
        <CardHeader className="px-6 pt-6 pb-2">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">User Details</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Full Name</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{userDetails.name || '-'}</p>
            </div>
            <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Email Address</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{userDetails.email || '-'}</p>
            </div>
            <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Company Name</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{userDetails.companyName || '-'}</p>
            </div>
            <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Company Role</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{userDetails.companyRole || '-'}</p>
            </div>
            <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Website Role</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{userDetails.role?.replace('_', ' ') || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-purple-500/50 shadow-xl overflow-hidden mt-6 rounded-3xl">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Connected Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
                  <div key={acc.id} className="bg-slate-100 dark:bg-white/5 border border-purple-200 dark:border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shadow-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg">in</div>
                    <div className="w-full">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate px-2" title={acc.username}>{acc.username}</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{acc.platform}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
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
                          Not Synced
                        </span>
                      )}
                    </div>

                    <div className="w-full pt-2.5 border-t border-slate-200 dark:border-white/10 flex flex-col items-center gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-gray-400">
                        <Clock className="w-3 h-3 text-purple-500" />
                        <span>Last Synchronized:</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300">{lastSync || 'Never'}</span>
                      </div>
                      <Link 
                        href={`/dashboard/${acc.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5"
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
