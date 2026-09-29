'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowRight, 
  Settings, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  KeyRound, 
  Plus, 
  ShieldCheck, 
  Building2
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
    setUserDetails({
      name: localStorage.getItem('user_name') || 'Administrator',
      companyName: localStorage.getItem('company_name') || 'Enterprise Suite',
      companyRole: localStorage.getItem('company_role') || 'Head of Analytics',
      role: localStorage.getItem('user_role') || 'super_admin',
      email: localStorage.getItem('user_email') || 'admin@example.com'
    });
    fetchAccounts();
    fetchChannels();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:3001/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (res.ok) {
        setPasswordSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsSettingsOpen(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setPasswordError(data.message || 'Failed to change password.');
      }
    } catch {
      setPasswordError('Server connection error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

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

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold px-4 py-2.5 gap-2 shrink-0 shadow-sm cursor-pointer"
              >
                <Settings className="w-4 h-4 text-indigo-500" />
                <span>Security Settings</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#0c121e] border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-500" />
                  Account Security
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update credentials for {userDetails.email}
                </p>
              </div>

              {passwordError && (
                <div className="mb-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="curr-pass" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="curr-pass"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="text-xs h-10 pr-9 bg-slate-50 dark:bg-black/50 border-slate-200 dark:border-white/10 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-pass" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-pass"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="text-xs h-10 pr-9 bg-slate-50 dark:bg-black/50 border-slate-200 dark:border-white/10 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pass" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-pass"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="text-xs h-10 pr-9 bg-slate-50 dark:bg-black/50 border-slate-200 dark:border-white/10 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-xs h-10 px-4 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={passwordLoading}
                    className="text-xs h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                  >
                    {passwordLoading ? 'Saving...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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

        {accounts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-slate-50/50 dark:bg-black/20">
            <p className="text-xs text-slate-500 dark:text-slate-400">No LinkedIn accounts connected yet.</p>
            <Link href="/dashboard" className="text-xs text-sky-500 font-bold hover:underline mt-2 inline-block">
              + Connect your first LinkedIn profile
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const latestAnalytics = acc.analytics && acc.analytics.length > 0 ? acc.analytics[0] : null;
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
                        {latestAnalytics?.followers ? latestAnalytics.followers.toLocaleString() : '—'}
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

        {channels.length === 0 ? (
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
