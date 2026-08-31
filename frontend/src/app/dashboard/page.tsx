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
    window.location.href = 'http://localhost:3001/auth/linkedin';
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">LinkedIn</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Manage and monitor your system.</p>
        </div>
        
        {(role === 'user' || role === 'manager' || role === 'super_admin') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-slate-900 dark:text-white gap-2 font-bold shadow-[0_0_20px_rgba(255,41,117,0.3)] hover:shadow-[0_0_25px_rgba(255,41,117,0.5)] border-none">
                <Plus className="w-4 h-4" /> Connect Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white border-none p-0 overflow-hidden shadow-2xl">
              <div className="bg-[#0077b5] p-4 flex items-center justify-between">
                <div className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
                  <div className="bg-white text-[#0077b5] w-6 h-6 rounded flex items-center justify-center font-bold text-xs">in</div>
                  LinkedIn
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 text-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-slate-900 dark:text-white font-bold text-xl shadow-lg">SM</div>
                  <div>
                    <h3 className="font-semibold text-lg">MonitorHQ</h3>
                    <p className="text-sm text-slate-500">would like to access your profile.</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                  <h4 className="font-medium text-slate-700 text-sm">MonitorHQ will be able to:</h4>
                  <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                    <li>Use your basic profile including your name, photo, and headline.</li>
                    <li>Access your post analytics and engagement metrics.</li>
                  </ul>
                </div>
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm your Username</Label>
                    <Input
                      placeholder="e.g. johndoe"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                      className="bg-white border-slate-300 text-slate-900 focus:ring-[#0077b5] focus:border-[#0077b5]"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-50" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#0077b5] hover:bg-[#006097] text-slate-900 dark:text-white font-semibold" disabled={loading}>
                      {loading ? 'Connecting...' : 'Allow Access'}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">

        <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-purple-500/50 shadow-lg">
          <CardHeader className="px-6 pt-6 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2 flex flex-col justify-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{accounts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-purple-500/50 shadow-xl overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Connected Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-purple-900/10 hover:bg-purple-900/10">
              <TableRow className="border-b border border-purple-200 dark:border-purple-500/50 hover:bg-transparent">
                <TableHead className="text-purple-700 dark:text-purple-300 font-medium">Account</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300 font-medium">Followers</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300 font-medium">Views</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300 font-medium">Likes</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300 font-medium">Comments</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300 font-medium">Recent Posts</TableHead>
                <TableHead className="text-purple-700 dark:text-purple-300 font-medium">Last Updated</TableHead>
                <TableHead className="text-right text-purple-700 dark:text-purple-300 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No accounts connected yet.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((acc) => {
                  const latestAnalytics = acc.analytics && acc.analytics.length > 0 
                    ? acc.analytics[acc.analytics.length - 1] 
                    : null;
                  
                  return (
                    <TableRow key={acc.id} className="border-b border border-purple-200 dark:border-purple-500/50 hover:bg-purple-500/5 transition-colors">
                      <TableCell className="font-medium text-slate-900 dark:text-white flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">in</div>
                          <span>{acc.username}</span>
                        </div>
                        <span className="text-slate-500 dark:text-gray-400 text-xs">{acc.platform} Connected</span>
                        <span className="inline-flex items-center gap-1 mt-1 py-0.5 px-2 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-max">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          {acc.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300 font-semibold">{latestAnalytics ? (latestAnalytics.followers ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300">{latestAnalytics ? (latestAnalytics.views ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300">{latestAnalytics ? (latestAnalytics.likes ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300">{latestAnalytics ? (latestAnalytics.comments ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300">{latestAnalytics ? (latestAnalytics.recentPosts ?? 0).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-slate-600 dark:text-gray-300 text-xs">
                        {latestAnalytics?.lastCollectionTime 
                          ? new Date(latestAnalytics.lastCollectionTime).toLocaleString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) 
                          : (latestAnalytics?.date ? new Date(latestAnalytics.date).toLocaleDateString() : '-')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild className="text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-400/10">
                            <Link href={`/dashboard/${acc.id}`}>
                              <Activity className="w-4 h-4 mr-2" />
                              View Detail
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDisconnect(acc.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
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
