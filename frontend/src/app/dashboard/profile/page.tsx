'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { 
  Clock, 
  ArrowRight, 
  Settings, 
  Users, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  KeyRound,
  Plus
} from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/youtube-icon';

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [userDetails, setUserDetails] = useState({
    name: '',
    companyName: '',
    companyRole: '',
    role: '',
    email: ''
  });

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:3001/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch LinkedIn accounts', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/youtube/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (error) {
      console.error('Failed to fetch YouTube channels', error);
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
    fetchChannels();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('http://localhost:3001/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          email: userDetails.email,
          currentPassword,
          newPassword
        }),
      });

      if (res.ok) {
        setPasswordSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        setPasswordError(data.message || 'Failed to update password. Verify current password.');
      }
    } catch {
      setPasswordError('Network error. Unable to reach server.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Overview Header Card */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                {userDetails.name?.charAt(0) || 'S'}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111827] flex items-center justify-center text-white" title="Active">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {userDetails.name || 'Super Admin'}
              </h1>
            </div>
          </div>

          {/* Edit Settings Button with Modal */}
          <div className="flex items-center gap-2.5">
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger render={
                <Button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700">
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Edit Settings</span>
                </Button>
              } />
              <DialogContent className="sm:max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
                <div className="space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Account & Security Settings
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Update your account password and security preferences
                      </p>
                    </div>
                  </div>

                  {/* Password Change Form */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-500" />
                      Change Password
                    </h4>

                    {passwordError && (
                      <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="mb-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            required
                            className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-9 pr-9 rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            required
                            className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-9 pr-9 rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            required
                            className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-9 pr-9 rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsSettingsOpen(false)}
                          className="flex-1 rounded-xl h-9 text-xs font-semibold"
                        >
                          Close
                        </Button>
                        <Button
                          type="submit"
                          disabled={passwordLoading}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 text-xs font-semibold"
                        >
                          {passwordLoading ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Connected Social Accounts Container */}
      <div className="space-y-6">
        {/* SECTION 1: CONNECTED LINKEDIN PROFILES */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                in
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Connected LinkedIn Profiles
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {accounts.length} active LinkedIn profile{accounts.length === 1 ? '' : 's'} tracked
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              prefetch={true}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Manage LinkedIn</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6">
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">No LinkedIn profiles connected</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Connect a LinkedIn handle to monitor public profile metrics and posts.
                </p>
                <Link
                  href="/dashboard"
                  prefetch={true}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect LinkedIn Profile</span>
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

                  const isSyncedToday = latest?.lastCollectionTime 
                    ? new Date(latest.lastCollectionTime).toDateString() === new Date().toDateString()
                    : false;

                  return (
                    <div 
                      key={acc.id} 
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-all flex flex-col justify-between gap-3 group card-interactive"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                            in
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={acc.username}>
                              {acc.username}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {acc.platform}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSyncedToday 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSyncedToday ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {isSyncedToday ? 'Synced' : 'Pending'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
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

        {/* SECTION 2: CONNECTED YOUTUBE CHANNELS */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <YoutubeIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Connected YouTube Channels
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {channels.length} connected or tracked YouTube channel{channels.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/youtube"
              prefetch={true}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              <span>Manage YouTube</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6">
            {channels.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-red-500">
                  <YoutubeIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">No YouTube channels connected</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track public channels or sign in with Google OAuth for Studio analytics.
                </p>
                <Link
                  href="/dashboard/youtube"
                  prefetch={true}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline mt-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect YouTube Channel</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.map((ch) => {
                  const isSyncedToday = ch.lastSyncedAt
                    ? new Date(ch.lastSyncedAt).toDateString() === new Date().toDateString()
                    : false;

                  const lastSync = ch.lastSyncedAt 
                    ? new Date(ch.lastSyncedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Pending';

                  return (
                    <div 
                      key={ch.id} 
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-all flex flex-col justify-between gap-3 group card-interactive"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {ch.thumbnailUrl ? (
                            <img 
                              src={ch.thumbnailUrl} 
                              alt={ch.title} 
                              className="w-10 h-10 rounded-xl object-cover border border-red-500/20 flex-shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                              <YoutubeIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" title={ch.title}>
                              {ch.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              YouTube • {Number(ch.subscribers || 0).toLocaleString()} Subs
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSyncedToday 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSyncedToday ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {isSyncedToday ? 'Synced' : 'Pending'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {lastSync}
                        </span>
                        <Link
                          href="/dashboard/youtube"
                          prefetch={true}
                          className="font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
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
    </div>
  );
}
