'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Activity, Users, Trash2 } from 'lucide-react';

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
          username: newUsername
        }),
      });
      if (res.ok) {
        setIsDialogOpen(false);
        setNewUsername('');
        fetchAccounts();
      } else {
        alert('Failed to connect account');
      }
    } catch (error) {
      console.error('Error connecting account', error);
      alert('Error connecting account');
    }
    setLoading(false);
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm('Are you sure you want to disconnect this LinkedIn account?')) return;
    
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            LinkedIn Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Real-time scraping, impression metrics, and engagement telemetry.
          </p>
        </div>
        
        {(role === 'user' || role === 'manager' || role === 'super_admin') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button className="rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white gap-2 font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 border-none transition-all cursor-pointer h-11 px-5">
                <Plus className="w-4 h-4" /> Connect LinkedIn
              </Button>
            } />
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-cyan-500/30 p-0 overflow-hidden shadow-2xl rounded-3xl">
              <div className="bg-[#0077b5] p-5 flex items-center justify-between">
                <div className="text-white font-bold text-lg flex items-center gap-2.5">
                  <div className="bg-white text-[#0077b5] w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">in</div>
                  <span>Connect LinkedIn Account</span>
                </div>
              </div>
              <div className="p-6 space-y-5 text-slate-900 dark:text-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-cyan-500/20">
                    SM
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">MonitorHQ Analytics</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Playwright Scraping Engine Connector</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-cyan-500/20 space-y-2.5 text-xs text-slate-600 dark:text-gray-300">
                  <h4 className="font-semibold text-slate-800 dark:text-cyan-300 text-xs uppercase tracking-wider">MonitorHQ will automatically:</h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-xs">
                    <li>Extract public profile vanity name and headline</li>
                    <li>Collect live post impressions, reactions, and comment counts</li>
                    <li>Synchronize data on-demand or on hourly automated cycles</li>
                  </ul>
                </div>

                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-gray-300">LinkedIn Profile Username / Vanity URL</Label>
                    <Input
                      placeholder="e.g. johndoe or joeljeevankumar"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                      className="bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-cyan-500/40 text-slate-900 dark:text-white h-11 px-3.5 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl h-11 cursor-pointer" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold rounded-xl h-11 shadow-md shadow-cyan-500/20 cursor-pointer" 
                      disabled={loading}
                    >
                      {loading ? 'Connecting...' : 'Authorize & Connect'}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        <Card className="bg-white/80 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-sm hover:shadow-md rounded-2xl cursor-default transition-all hover:scale-[1.02]">
          <CardHeader className="px-5 pt-5 pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center justify-between">
              <span>Connected Accounts</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">in</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{accounts.length}</div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">LinkedIn monitoring active</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-sm hover:shadow-md rounded-2xl cursor-default transition-all hover:scale-[1.02]">
          <CardHeader className="px-5 pt-5 pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center justify-between">
              <span>Synchronized Today</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {accounts.filter(a => {
                const latest = a.analytics && a.analytics.length > 0 ? a.analytics[a.analytics.length - 1] : null;
                return latest?.lastCollectionTime && new Date(latest.lastCollectionTime).toDateString() === new Date().toDateString();
              }).length}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Real-time synced profiles</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-sm hover:shadow-md rounded-2xl cursor-default transition-all hover:scale-[1.02]">
          <CardHeader className="px-5 pt-5 pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center justify-between">
              <span>Total Followers</span>
              <Users className="w-4 h-4 text-cyan-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {accounts.reduce((sum, a) => {
                const sorted = a.analytics && a.analytics.length > 0 
                  ? [...a.analytics].sort((x, y) => new Date(x.lastCollectionTime || x.date).getTime() - new Date(y.lastCollectionTime || y.date).getTime())
                  : [];
                const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
                const count = (latest?.followers && latest.followers > 0)
                  ? latest.followers
                  : (sorted.slice().reverse().find(x => x.followers > 0)?.followers || 0);
                return sum + count;
              }, 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Across monitored profiles</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-sm hover:shadow-md rounded-2xl cursor-default transition-all hover:scale-[1.02]">
          <CardHeader className="px-5 pt-5 pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center justify-between">
              <span>Posts Analyzed</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {accounts.reduce((sum, a) => {
                const latest = a.analytics && a.analytics.length > 0 ? a.analytics[a.analytics.length - 1] : null;
                return sum + (latest?.recentPosts || 0);
              }, 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Posts scraped & tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Profiles Table Card */}
      <Card className="bg-white/90 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Monitored LinkedIn Accounts</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              {accounts.length} Active
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-black/30">
              <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
                <TableHead className="text-slate-700 dark:text-cyan-300 font-bold">Account</TableHead>
                <TableHead className="text-slate-700 dark:text-cyan-300 font-bold">Followers</TableHead>
                <TableHead className="text-slate-700 dark:text-cyan-300 font-bold">Views</TableHead>
                <TableHead className="text-slate-700 dark:text-cyan-300 font-bold">Likes</TableHead>
                <TableHead className="text-slate-700 dark:text-cyan-300 font-bold">Comments</TableHead>
                <TableHead className="text-slate-700 dark:text-cyan-300 font-bold">Posts</TableHead>
                <TableHead className="text-slate-700 dark:text-cyan-300 font-bold">Last Synchronized</TableHead>
                <TableHead className="text-right text-slate-700 dark:text-cyan-300 font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-slate-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 dark:bg-white/5 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <Users className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-base text-slate-900 dark:text-white">No LinkedIn Profiles Connected</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Connect a LinkedIn profile username to start tracking metrics, post impressions, and engagement.</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        className="rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold px-5 h-9 shadow-md shadow-cyan-500/20 border-none mt-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Connect LinkedIn Account
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((acc) => {
                  const sortedAnalytics = acc.analytics 
                    ? [...acc.analytics].sort((a, b) => new Date(a.lastCollectionTime || a.date).getTime() - new Date(b.lastCollectionTime || b.date).getTime()) 
                    : [];
                  const latestAnalytics = sortedAnalytics.length > 0 
                    ? sortedAnalytics[sortedAnalytics.length - 1] 
                    : null;
                  
                  const effectiveFollowers = (latestAnalytics?.followers && latestAnalytics.followers > 0)
                    ? latestAnalytics.followers
                    : (sortedAnalytics.slice().reverse().find(x => x.followers > 0)?.followers || 0);

                  return (
                    <TableRow key={acc.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-cyan-500/5 transition-colors">
                      <TableCell className="font-medium text-slate-900 dark:text-white flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">in</div>
                          <span className="font-bold">{acc.username}</span>
                        </div>
                        <span className="text-slate-500 dark:text-gray-400 text-xs">{acc.platform} Connected</span>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                            <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                            {acc.status}
                          </span>
                          {latestAnalytics?.lastCollectionTime && (new Date(latestAnalytics.lastCollectionTime).toDateString() === new Date().toDateString()) ? (
                            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                              Synchronized
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                              Pending Sync
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-gray-200 font-bold">{latestAnalytics ? effectiveFollowers.toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300">{latestAnalytics ? (latestAnalytics.views ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300">{latestAnalytics ? (latestAnalytics.likes ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300">{latestAnalytics ? (latestAnalytics.comments ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300">{latestAnalytics ? (latestAnalytics.recentPosts ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300 text-xs">
                        {latestAnalytics?.lastCollectionTime ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {new Date(latestAnalytics.lastCollectionTime).toLocaleString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                              new Date(latestAnalytics.lastCollectionTime).toDateString() === new Date().toDateString()
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                new Date(latestAnalytics.lastCollectionTime).toDateString() === new Date().toDateString()
                                  ? 'bg-emerald-500 animate-pulse'
                                  : 'bg-amber-500'
                              }`}></span>
                              {new Date(latestAnalytics.lastCollectionTime).toDateString() === new Date().toDateString()
                                ? 'Synchronized'
                                : 'Out of sync'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-gray-500 text-[11px] italic">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Not Synced Yet
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 hover:bg-cyan-500/10 cursor-pointer rounded-xl font-semibold">
                            <Link href={`/dashboard/${acc.id}`} prefetch={true}>
                              <Activity className="w-4 h-4 mr-2" />
                              View Detail
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDisconnect(acc.id)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer rounded-xl font-semibold"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Disconnect
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
