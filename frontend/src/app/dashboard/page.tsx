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
  FileText 
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
        alert('Failed to connect LinkedIn account. Please check the username.');
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
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            LinkedIn Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor LinkedIn profile analytics, follower growth, and post metrics.
          </p>
        </div>

        {(role === 'user' || role === 'manager' || role === 'super_admin' || !role) && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm h-10 px-4 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Connect Profile</span>
              </Button>
            } />
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base">
                    in
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Connect LinkedIn Profile
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter the LinkedIn username or vanity URL to track
                    </p>
                  </div>
                </div>

                <form onSubmit={handleConnect} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      LinkedIn Username / Public Handle
                    </Label>
                    <Input
                      placeholder="e.g. johndoe or joeljeevankumar"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                      className="bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-sm h-10 rounded-xl"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      The public vanity handle found in the LinkedIn profile URL.
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
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 text-xs font-semibold"
                    >
                      {loading ? 'Connecting...' : 'Connect Profile'}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Tracked Profiles</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">in</div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {accounts.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Active monitored accounts
          </p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Followers</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {totalFollowers.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Across all monitored profiles
          </p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Tracked Posts</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {totalPosts.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Posts analyzed & monitored
          </p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Synced Today</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {syncedTodayCount} / {accounts.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Up-to-date data collections
          </p>
        </div>
      </div>

      {/* Accounts Table Card */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              Monitored Profiles
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              List of connected LinkedIn handles with latest metrics
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {accounts.length} accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
              <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Account</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Followers</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Impressions</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reactions</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Comments</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Posts</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-300">Last Synced</TableHead>
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
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
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
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {latest ? (latest.views ?? 0).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {latest ? (latest.likes ?? 0).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {latest ? (latest.comments ?? 0).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {latest ? (latest.recentPosts ?? 0).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {latest?.lastCollectionTime ? (
                          <div className="flex flex-col">
                            <span>
                              {new Date(latest.lastCollectionTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[10px] font-medium ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {isToday ? 'Synced today' : 'Scheduled'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/${acc.id}`}
                            prefetch={true}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                          >
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
