'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  ArrowRight, 
  Building2, 
  Mail, 
  ShieldCheck, 
  Settings
} from 'lucide-react';

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
      name: localStorage.getItem('user_name') || 'Administrator',
      companyName: localStorage.getItem('company_name') || 'Enterprise HQ',
      companyRole: localStorage.getItem('company_role') || 'System Lead',
      role: userRole || 'super_admin',
      email: localStorage.getItem('user_email') || 'admin@socialmonitor.com'
    });
    fetchAccounts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Profile Overview Header Card */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
              {userDetails.name?.charAt(0) || 'A'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {userDetails.name || 'Administrator'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 capitalize">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {userDetails.role?.replace('_', ' ') || 'Admin'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {userDetails.email}
                </span>
                {userDetails.companyName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {userDetails.companyName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              prefetch={true}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Full Name</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{userDetails.name || 'Administrator'}</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Email Address</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">{userDetails.email}</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Organization</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{userDetails.companyName || 'Enterprise'}</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Role / Position</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 capitalize">{userDetails.companyRole || 'System Administrator'}</p>
        </div>
      </div>

      {/* Connected Profiles List */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              Connected Social Accounts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Overview of social profiles currently tracked by your system
            </p>
          </div>
          <Link
            href="/dashboard"
            prefetch={true}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Manage Accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              <p className="text-sm">No connected profiles found.</p>
              <Link
                href="/dashboard"
                prefetch={true}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-2"
              >
                <span>Connect your first LinkedIn profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const sorted = acc.analytics
                  ? [...acc.analytics].sort((a, b) => new Date(a.lastCollectionTime || a.date).getTime() - new Date(b.lastCollectionTime || b.date).getTime())
                  : [];
                const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
                const lastSync = latest?.lastCollectionTime 
                  ? new Date(latest.lastCollectionTime).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Pending';

                return (
                  <div 
                    key={acc.id} 
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          in
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={acc.username}>
                            {acc.username}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {acc.platform}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {acc.status}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lastSync}
                      </span>
                      <Link
                        href={`/dashboard/${acc.id}`}
                        prefetch={true}
                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>Analytics</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
