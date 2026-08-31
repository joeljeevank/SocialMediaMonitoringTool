'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart2 } from 'lucide-react';
import axios from 'axios';

type Account = {
  id: number;
  linkedinUsername: string;
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
    link.setAttribute('download', `linkedin_report_${selectedAccountId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Report Generation</h1>
        <p className="text-slate-500 dark:text-gray-400">Select a connected LinkedIn account to generate and download analytics reports.</p>
      </div>

      <Card className="bg-white/80 dark:bg-[#090014]/60 border border-purple-200 dark:border-purple-500/20 shadow-xl backdrop-blur-2xl rounded-2xl">
        <CardHeader className="border-b border-purple-200 dark:border-purple-500/20 pb-4">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Select LinkedIn Account</label>
            <select 
              className="w-full bg-white/60 dark:bg-black/40 border border-purple-200 dark:border-purple-500/50 text-slate-900 dark:text-white h-12 px-4 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
              value={selectedAccountId}
              onChange={(e) => handleFetchReportData(e.target.value)}
            >
              <option value="" className="text-slate-900 dark:text-gray-400 bg-white dark:bg-[#090014]">-- Select an account --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="text-slate-900 dark:text-white bg-white dark:bg-[#090014]">
                  {acc.linkedinUsername}
                </option>
              ))}
            </select>
          </div>

          {loading && (
             <div className="py-8 text-center text-slate-500 dark:text-gray-400 animate-pulse">
               Fetching report data...
             </div>
          )}

          {!loading && selectedAccountId && analytics.length === 0 && (
            <div className="py-8 text-center text-slate-500 dark:text-gray-400">
               No analytics data available for this account. Try collecting data first.
            </div>
          )}

          {!loading && analytics.length > 0 && (
            <div className="space-y-6 mt-6 pt-6 border-t border-purple-200 dark:border-purple-500/20">
              <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-5 border border-purple-100 dark:border-purple-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Report Ready</h3>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Contains {analytics.length} days of historical data including Posts, Likes, Views, and Comments.</p>
                </div>
                <Button 
                  onClick={downloadCSV}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-slate-900 dark:text-white font-bold shadow-lg shadow-purple-500/20 border-none gap-2 px-6 h-12"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Report
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-white/60 dark:bg-black/40 p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 text-center">
                    <div className="text-sm text-slate-500 dark:text-gray-400 mb-1">Total Followers</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{analytics[analytics.length -1].followers?.toLocaleString()}</div>
                 </div>
                 <div className="bg-white/60 dark:bg-black/40 p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 text-center">
                    <div className="text-sm text-slate-500 dark:text-gray-400 mb-1">Total Views</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{analytics[analytics.length -1].views?.toLocaleString()}</div>
                 </div>
                 <div className="bg-white/60 dark:bg-black/40 p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 text-center">
                    <div className="text-sm text-slate-500 dark:text-gray-400 mb-1">Total Likes</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{analytics[analytics.length -1].likes?.toLocaleString()}</div>
                 </div>
                 <div className="bg-white/60 dark:bg-black/40 p-4 rounded-xl border border-purple-100 dark:border-purple-500/20 text-center">
                    <div className="text-sm text-slate-500 dark:text-gray-400 mb-1">Total Comments</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{analytics[analytics.length -1].comments?.toLocaleString()}</div>
                 </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
