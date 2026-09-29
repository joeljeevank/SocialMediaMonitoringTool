'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Users, 
  Trash2, 
  ArrowRight, 
  FileText, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Clock, 
  Activity, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  RefreshCw,
  Radio
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

export default function DashboardOverview() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
    fetchAccounts();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'LinkedIn',
          username: newUsername.trim(),
        }),
      });
      if (res.ok) {
        setIsDialogOpen(false);
        setNewUsername('');
        fetchAccounts();
      } else {
        alert('Failed to connect LinkedIn account. Please verify the vanity username.');
      }
    } catch (error) {
      console.error('Error connecting account', error);
      alert('Error connecting account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm('Are you sure you want to disconnect this LinkedIn profile?')) return;
    try {
      const res = await fetch(`http://localhost:3001/accounts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAccounts();
      } else {
        alert('Failed to disconnect account');
      }
    } catch (error) {
      console.error('Error disconnecting account', error);
      alert('Network error while disconnecting account');
    }
  };

  const totalFollowers = accounts.reduce((sum, a) => {
    const sorted = a.analytics && a.analytics.length > 0 
      ? [...a.analytics].sort((x, y) => new Date(x.lastCollectionTime || x.date).getTime() - new Date(y.lastCollectionTime || y.date).getTime())
      : [];
    const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    const count = (latest?.followers && latest.followers > 0)
      ? latest.followers
      : (sorted.slice().reverse().find(x => x.followers > 0)?.followers || 0);
    return sum + count;
  }, 0);

  const totalImpressions = accounts.reduce((sum, a) => {
    const latest = a.analytics && a.analytics.length > 0 ? a.analytics[a.analytics.length - 1] : null;
    return sum + (latest?.views || 0);
  }, 0);

  const syncedTodayCount = accounts.filter(a => {
    const latest = a.analytics && a.analytics.length > 0 ? a.analytics[a.analytics.length - 1] : null;
    return latest?.lastCollectionTime && new Date(latest.lastCollectionTime).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header section with Glass Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-sky-500/25">
            in
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                LinkedIn Monitoring
              </h1>
              <span className="inline-flex items-center gap-1.5 py-0.5 px-3 rounded-full text-xs font-bold bg-sky-500/15 text-sky-500 border border-sky-500/30">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time impression tracking, follower growth, engagement, and post analysis
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs h-10 px-5 rounded-2xl shadow-lg shadow-sky-600/25 flex items-center gap-2 cursor-pointer transition-all">
              <Plus className="w-4 h-4" />
              <span>Connect Profile</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-500 flex items-center justify-center font-bold text-base ring-1 ring-sky-500/30">
                  in
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Connect LinkedIn Account
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter vanity username to activate telemetry
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-500" />
                  Automated Metrics Tracking
                </p>
                <ul className="space-y-1 list-disc pl-4 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>Followers, headline, and profile status</li>
                  <li>Post impressions, reactions, and comments</li>
                  <li>Continuous telemetry synchronization</li>
                </ul>
              </div>

              <form onSubmit={handleConnect} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    LinkedIn Vanity Username
                  </Label>
                  <Input
                    placeholder="e.g. mkbhd or satyanadella"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    className="bg-slate-50 dark:bg-black/50 border-slate-200 dark:border-white/10 text-xs h-10 rounded-xl font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Found in: linkedin.com/in/<strong>username</strong>
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 rounded-2xl h-10 text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl h-10 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-sky-600/20"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <span>Start Tracking</span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Overview Tiles with Glass Panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-3xl p-5 sm:p-6 glow-card glow-card-linkedin">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tracked Profiles</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center ring-1 ring-sky-500/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3 font-mono">
            {accounts.length}
          </p>
          <p className="text-[11px] text-sky-500 font-semibold mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Active monitoring stream
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-5 sm:p-6 glow-card glow-card-linkedin">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Followers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3 font-mono">
            {totalFollowers.toLocaleString()}
          </p>
          <p className="text-[11px] text-indigo-400 font-semibold mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Aggregated audience reach
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-5 sm:p-6 glow-card glow-card-linkedin">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Impressions</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center ring-1 ring-amber-500/30">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3 font-mono">
            {totalImpressions.toLocaleString()}
          </p>
          <p className="text-[11px] text-amber-400 font-semibold mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Cumulative post reach
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-5 sm:p-6 glow-card glow-card-linkedin">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sync Status</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-500 mt-3 font-mono">
            {syncedTodayCount} / {accounts.length}
          </p>
          <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Synchronized today
          </p>
        </div>
      </div>

      {/* Accounts Table Card */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-sky-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Monitored Profiles Directory
            </h2>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
            {accounts.length} Profiles Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-black/30">
              <TableRow className="border-b border-slate-200/80 dark:border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-300">Profile</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Followers</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Impressions</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reactions</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Comments</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Posts</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last Synced</span>
                  </div>
                </TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-14 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center ring-1 ring-sky-500/30">
                        <Users className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-bold text-base text-slate-900 dark:text-white">No accounts connected yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Connect a LinkedIn account vanity username to stream real-time impressions and post metrics.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-2xl h-10 px-5 shadow-md shadow-sky-600/20"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Connect Profile
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((acc) => {
                  const sorted = acc.analytics 
                    ? [...acc.analytics].sort((a, b) => new Date(a.lastCollectionTime || a.date).getTime() - new Date(b.lastCollectionTime || b.date).getTime()) 
                    : [];
                  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
                  const followers = (latest?.followers && latest.followers > 0)
                    ? latest.followers
                    : (sorted.slice().reverse().find(x => x.followers > 0)?.followers || 0);

                  const isToday = latest?.lastCollectionTime 
                    ? new Date(latest.lastCollectionTime).toDateString() === new Date().toDateString()
                    : false;

                  return (
                    <TableRow key={acc.id} className="border-b border-slate-200/80 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-sky-500/30">
                            in
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900 dark:text-white">
                              {acc.username}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              {acc.platform}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {latest ? followers.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-semibold font-mono">
                        {latest ? (latest.views ?? 0).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-semibold font-mono">
                        {latest ? (latest.likes ?? 0).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-semibold font-mono">
                        {latest ? (latest.comments ?? 0).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-semibold font-mono">
                        {latest ? (latest.recentPosts ?? 0).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {latest?.lastCollectionTime ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                              {new Date(latest.lastCollectionTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[10px] font-bold flex items-center gap-1 mt-0.5 ${isToday ? 'text-emerald-500' : 'text-slate-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              {isToday ? 'Live Synced' : 'Scheduled'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending Stream</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/${acc.id}`}
                            prefetch={true}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-500 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all shadow-xs"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Analytics</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDisconnect(acc.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Disconnect profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
