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
  RefreshCw
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
  const [role, setRole] = useState('');

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
    setRole(userRole || '');
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

  const totalPosts = accounts.reduce((sum, a) => {
    const latest = a.analytics && a.analytics.length > 0 ? a.analytics[a.analytics.length - 1] : null;
    return sum + (latest?.recentPosts || 0);
  }, 0);

  const syncedTodayCount = accounts.filter(a => {
    const latest = a.analytics && a.analytics.length > 0 ? a.analytics[a.analytics.length - 1] : null;
    return latest?.lastCollectionTime && new Date(latest.lastCollectionTime).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            in
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              LinkedIn Monitoring
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Live impressions, follower growth, reactions, and automated post tracking
            </p>
          </div>
        </div>

        {(role === 'user' || role === 'manager' || role === 'super_admin' || !role) && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm h-10 px-4 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all">
                <Plus className="w-4 h-4" />
                <span>Connect LinkedIn Profile</span>
              </Button>
            } />
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    in
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Connect LinkedIn Account
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter public profile vanity handle to start tracking metrics
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    Automated Data Sync includes:
                  </p>
                  <ul className="space-y-1 list-disc pl-4 text-[11px] text-slate-500 dark:text-slate-400">
                    <li>Public vanity name, headline & follower counts</li>
                    <li>Live post impressions, reactions, comments & date stamps</li>
                    <li>Automated synchronization on-demand or periodic cycles</li>
                  </ul>
                </div>

                <form onSubmit={handleConnect} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      LinkedIn Profile Vanity Handle
                    </Label>
                    <Input
                      placeholder="e.g. johndoe or joeljeevankumar"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                      className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-10 rounded-xl"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Found in: linkedin.com/in/<strong>username</strong>
                    </p>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 rounded-xl h-10 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <span>Authorize & Track</span>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPI Overview Tiles with Vibrant Icon Containers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Tracked Profiles</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {accounts.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Active monitoring handles
          </p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Followers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {totalFollowers.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Aggregated follower reach
          </p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Impressions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {totalImpressions.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Total post view counts
          </p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Synchronized Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {syncedTodayCount} / {accounts.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Up-to-date data collections
          </p>
        </div>
      </div>

      {/* Accounts Table Card */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              Monitored LinkedIn Profiles
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {accounts.length} Profiles Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
              <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Profile</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Followers</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Impressions</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reactions</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Comments</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Posts</span>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last Synced</span>
                  </div>
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">No accounts connected yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Connect a LinkedIn account username to begin collecting real-time impressions and metrics.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl h-9 px-4"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
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
                    <TableRow key={acc.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                            in
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-slate-900 dark:text-white">
                              {acc.username}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              {acc.platform}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {latest ? followers.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {latest ? (latest.views ?? 0).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {latest ? (latest.likes ?? 0).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {latest ? (latest.comments ?? 0).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {latest ? (latest.recentPosts ?? 0).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {latest?.lastCollectionTime ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {new Date(latest.lastCollectionTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[10px] font-semibold flex items-center gap-1 mt-0.5 ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              {isToday ? 'Synced today' : 'Scheduled'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending Sync</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/${acc.id}`}
                            prefetch={true}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 transition-colors"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Analytics</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDisconnect(acc.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Disconnect profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
