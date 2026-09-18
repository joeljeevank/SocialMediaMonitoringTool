'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, ChevronDown } from 'lucide-react';
import axios from 'axios';

type Account = {
  id: number;
  username: string;
  platform?: string;
  status?: string;
  profileUrl?: string;
};

export default function ReportsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get('http://localhost:3001/accounts');
        setAccounts(res.data);
      } catch (error) {
        console.error('Failed to fetch accounts', error);
      }
    };
    fetchAccounts();
  }, []);

  const handleFetchReportData = async (accountId: string) => {
    setSelectedAccountId(accountId);
    if (!accountId) {
      setAnalytics([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3001/analytics/${accountId}`);
      setAnalytics(res.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
      setAnalytics([]);
    }
    setLoading(false);
  };

  const downloadCSV = () => {
    if (analytics.length === 0) return;
    
    const selectedAcc = accounts.find(a => String(a.id) === String(selectedAccountId));
    const accName = selectedAcc?.username || `account_${selectedAccountId}`;

    const headers = ['Date', 'Followers', 'Views', 'Likes', 'Comments', 'Shares', 'Recent Posts'];
    const csvContent = [
      headers.join(','),
      ...analytics.map(row => [
        row.date,
        row.followers || 0,
        row.views || 0,
        row.likes || 0,
        row.comments || 0,
        row.shares || 0,
        row.recentPosts || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkedin_report_${accName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto select-none">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">Report Generation</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Select a connected LinkedIn account to generate and download analytics reports.</p>
      </div>

      <Card className="bg-white/90 dark:bg-[#090d16]/80 border border-slate-200 dark:border-cyan-500/20 shadow-xl backdrop-blur-2xl rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Select LinkedIn Account</label>
            <div className="relative">
              <select 
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-cyan-500/40 text-slate-900 dark:text-white h-12 px-4 pr-10 rounded-2xl focus:ring-2 focus:ring-cyan-500 outline-none appearance-none cursor-pointer transition-all shadow-sm font-medium text-sm"
                value={selectedAccountId}
                onChange={(e) => handleFetchReportData(e.target.value)}
              >
                <option value="" className="bg-white text-slate-500 dark:bg-[#090d16] dark:text-gray-400">
                  -- Select an account --
                </option>
                {accounts.map(acc => (
                  <option 
                    key={acc.id} 
                    value={acc.id} 
                    className="bg-white text-slate-900 dark:bg-[#090d16] dark:text-white py-2"
                  >
                    {acc.username} {acc.platform ? `(${acc.platform})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-cyan-500">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {loading && (
             <div className="py-8 text-center text-slate-500 dark:text-gray-400 animate-pulse text-sm">
               Fetching report telemetry data...
             </div>
          )}

          {!loading && selectedAccountId && analytics.length === 0 && (
            <div className="py-8 text-center text-slate-500 dark:text-gray-400 text-sm">
               No analytics data available for this account. Try collecting data first.
            </div>
          )}

          {!loading && analytics.length > 0 && (
            <div className="space-y-6 mt-6 pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="bg-cyan-500/10 rounded-2xl p-5 border border-cyan-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Report Ready</h3>
                  <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5">Contains {analytics.length} days of historical data including Posts, Likes, Views, and Comments.</p>
                </div>
                <Button 
                  onClick={downloadCSV}
                  className="rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-cyan-500/20 border-none gap-2 px-6 h-11 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Report
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Followers</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{analytics[analytics.length -1].followers?.toLocaleString()}</div>
                 </div>
                 <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Views</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{analytics[analytics.length -1].views?.toLocaleString()}</div>
                 </div>
                 <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Likes</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{analytics[analytics.length -1].likes?.toLocaleString()}</div>
                 </div>
                 <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Comments</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{analytics[analytics.length -1].comments?.toLocaleString()}</div>
                 </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
