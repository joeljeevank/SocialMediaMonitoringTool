'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Users, 
  Eye, 
  Activity, 
  MessageCircle, 
  ThumbsUp, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  Lock, 
  CheckCircle2, 
  TrendingUp 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function CompanyDashboard() {
  const accountId = 1;
  const [me, setMe] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [followers, setFollowers] = useState<any>(null);
  const [pageStats, setPageStats] = useState<any>(null);
  const [posts, setPosts] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Standard sample distribution data
  const dummyChartData = [
    { name: 'Mon', views: 4000, engagement: 2400 },
    { name: 'Tue', views: 3000, engagement: 1398 },
    { name: 'Wed', views: 2000, engagement: 9800 },
    { name: 'Thu', views: 2780, engagement: 3908 },
    { name: 'Fri', views: 1890, engagement: 4800 },
    { name: 'Sat', views: 2390, engagement: 3800 },
    { name: 'Sun', views: 3490, engagement: 4300 },
  ];

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrors([]);
    try {
      const meRes = await fetch(`http://localhost:3001/api/linkedin/me?accountId=${accountId}`);
      const meData = await meRes.json();
      setMe(meData);

      const orgsRes = await fetch(`http://localhost:3001/api/linkedin/organizations?accountId=${accountId}`);
      const orgsData = await orgsRes.json();
      
      if (orgsData.error) {
        setErrors(prev => [...prev, { source: 'Organizations', ...orgsData }]);
        setLoading(false);
        return;
      }

      const orgsList = orgsData.organizations || [];
      if (orgsList.length > 0) {
        const selectedOrg = orgsList[0];
        
        const compRes = await fetch(`http://localhost:3001/api/linkedin/company/${encodeURIComponent(selectedOrg)}?accountId=${accountId}`);
        const compData = await compRes.json();
        if (compData.error) setErrors(prev => [...prev, { source: 'Company Details', ...compData }]);
        else setCompany(compData);

        const folRes = await fetch(`http://localhost:3001/api/linkedin/company/${encodeURIComponent(selectedOrg)}/followers?accountId=${accountId}`);
        const folData = await folRes.json();
        if (folData.error) setErrors(prev => [...prev, { source: 'Followers', ...folData }]);
        else setFollowers(folData);

        const statsRes = await fetch(`http://localhost:3001/api/linkedin/company/${encodeURIComponent(selectedOrg)}/page-statistics?accountId=${accountId}`);
        const statsData = await statsRes.json();
        if (statsData.error) setErrors(prev => [...prev, { source: 'Page Statistics', ...statsData }]);
        else setPageStats(statsData);

        const postsRes = await fetch(`http://localhost:3001/api/linkedin/company/${encodeURIComponent(selectedOrg)}/posts?accountId=${accountId}`);
        const postsData = await postsRes.json();
        if (postsData.error) setErrors(prev => [...prev, { source: 'Recent Posts', ...postsData }]);
        else setPosts(postsData);
      } else {
        setErrors(prev => [...prev, { source: 'Organizations', error: 'No organizations found for this user.' }]);
      }
    } catch (err: any) {
      setErrors(prev => [...prev, { source: 'General', error: err.message }]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalFollowers = followers?.elements?.[0]?.followerCountsByAssociationType?.ANY;
  const totalViews = pageStats?.elements?.[0]?.views?.allPageViews?.pageViews;

  return (
    <div className="space-y-6 text-slate-900 dark:text-white pb-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
              {loading ? (
                <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              ) : company?.logoV2?.original ? (
                <img src={company.logoV2.original} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {loading ? 'Loading Organization...' : company?.localizedName || 'Company Analytics'}
                </h1>
                {!loading && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Sync
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>Managed by:</span> 
                <span className="font-semibold text-slate-800 dark:text-slate-200">{loading ? '...' : me?.name || 'Administrator'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={fetchDashboardData} 
              disabled={loading} 
              variant="outline"
              className="rounded-xl h-10 px-4 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              {loading ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>
      </div>

      {/* Permissions / Notices Banner */}
      {errors.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                Community Management API Authorization Notice
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                LinkedIn requires approval for the <strong>Community Management API</strong> to stream live company page statistics. While pending, standard analytics projections are previewed below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Followers', value: totalFollowers, icon: Users, tint: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' },
          { label: 'Page Views', value: totalViews, icon: Eye, tint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400' },
          { label: 'Impressions', value: undefined, icon: Activity, tint: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' },
          { label: 'Reactions', value: undefined, icon: ThumbsUp, tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' },
          { label: 'Comments', value: undefined, icon: MessageCircle, tint: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400' },
          { label: 'Engagement', value: undefined, icon: TrendingUp, tint: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400', isPercent: true },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.tint}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ) : stat.value !== undefined ? (
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {stat.value.toLocaleString()}{stat.isPercent ? '%' : ''}
                  </h3>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex justify-between items-center">
              <span>Traffic & View Trends</span>
              {errors.length > 0 && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">Preview</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dummyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViewsCompany" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Area type="monotone" dataKey="views" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorViewsCompany)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white flex justify-between items-center">
              <span>Audience Engagement</span>
              {errors.length > 0 && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">Preview</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dummyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="engagement" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Content Feed Card */}
      <Card className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Recent Organization Content
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : posts?.elements && posts.elements.length > 0 ? (
            <div className="space-y-3">
              {posts.elements.map((post: any, idx: number) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">{post.commentary || 'Shared update'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Company Content Stream Locked</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Approved LinkedIn Community Management API access will stream recent company publications directly to this feed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
