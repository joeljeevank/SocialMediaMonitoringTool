'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Eye, Activity, MessageCircle, ThumbsUp, AlertTriangle, Building2, ExternalLink, Calendar, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function CompanyDashboard() {
  const [accountId, setAccountId] = useState<number>(1);
  const [orgUrn, setOrgUrn] = useState<string>('');
  
  const [me, setMe] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [followers, setFollowers] = useState<any>(null);
  const [pageStats, setPageStats] = useState<any>(null);
  const [posts, setPosts] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for visual appeal while waiting for API approval
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
        setOrgUrn(selectedOrg);
        
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
    <div className="space-y-8 text-slate-900 dark:text-white min-h-screen pb-12">
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#090014]/80 via-[#1a0b2e]/60 to-[#090014]/80 p-8 rounded-2xl border border-purple-200 dark:border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl mix-blend-screen pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-600/20 p-1 shadow-inner border border-slate-200 dark:border-white/10 flex-shrink-0">
              <div className="w-full h-full rounded-xl bg-slate-900/80 flex items-center justify-center overflow-hidden backdrop-blur-md">
                {loading ? (
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                ) : company?.logoV2?.original ? (
                  <img src={company.logoV2.original} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  {loading ? 'Loading...' : company?.localizedName || 'Company Analytics'}
                </h1>
                {!loading && (
                  <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 
                    Active Sync
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-gray-400 text-sm flex items-center gap-2">
                <span className="opacity-80">Administered by:</span> 
                <span className="font-semibold text-purple-700 dark:text-purple-300">{loading ? '...' : me?.name || 'Unknown'}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button 
              onClick={fetchDashboardData} 
              disabled={loading} 
              className="bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white border border-slate-200 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Syncing Data...' : 'Sync Now'}
            </Button>
            <div className="text-xs text-gray-500 font-medium tracking-wide">
              Data retrieved via Official LinkedIn APIs
            </div>
          </div>
        </div>
      </div>

      {/* ERRORS / API LIMITATIONS - Beautifully Styled */}
      {errors.length > 0 && (
        <Card className="bg-gradient-to-r from-red-950/40 to-orange-950/40 border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.1)] backdrop-blur-md overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-orange-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-red-400 flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              API Access Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600 dark:text-gray-300 mb-4 leading-relaxed max-w-4xl">
              We successfully connected to your account, but LinkedIn has not yet approved the required developer products for your application. To see live data, your app must be approved for the <strong className="text-slate-900 dark:text-white">Community Management API</strong>. The dashboard below displays visual placeholders in the meantime.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {errors.map((e, idx) => (
                <div key={idx} className="bg-black/40 p-3 rounded-lg border border-red-500/20 flex flex-col justify-center">
                  <div className="font-semibold text-red-300 text-sm">{e.source}</div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">{e.error}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Followers', value: totalFollowers, icon: Users, color: 'from-blue-500 to-cyan-400' },
          { label: 'Page Views', value: totalViews, icon: Eye, color: 'from-indigo-500 to-purple-400' },
          { label: 'Impressions', value: undefined, icon: Activity, color: 'from-pink-500 to-rose-400' },
          { label: 'Reactions', value: undefined, icon: ThumbsUp, color: 'from-emerald-500 to-teal-400' },
          { label: 'Comments', value: undefined, icon: MessageCircle, color: 'from-orange-500 to-amber-400' },
          { label: 'Engagement', value: undefined, icon: Activity, color: 'from-purple-500 to-fuchsia-400', isPercent: true },
        ].map((stat, i) => (
          <Card key={i} className="relative group bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-white/5 hover:bg-white/[0.02] hover:border-slate-200 transition-all duration-300 overflow-hidden shadow-lg backdrop-blur-sm">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
            <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full pt-6">
              <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br ${stat.color} bg-opacity-10 shadow-inner border border-slate-200 dark:border-white/10 group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon className="w-6 h-6 text-slate-900 dark:text-white" />
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">{stat.label}</p>
              
              {loading ? (
                <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
              ) : stat.value !== undefined ? (
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {stat.value.toLocaleString()}{stat.isPercent ? '%' : ''}
                </h3>
              ) : (
                <div className="flex items-center gap-2 text-gray-500 font-medium">
                  <Lock className="w-4 h-4" /> Locked
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-white/5 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex justify-between items-center">
              <span>Traffic Overview</span>
              {errors.length > 0 && <span className="text-xs font-normal text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/20">Preview Data</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 relative">
            {errors.length > 0 && (
              <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center shadow-2xl">
                  <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-900 dark:text-white">API Access Required</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-[200px]">Waiting for LinkedIn Community Management API approval.</p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dummyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="views" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-white/5 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex justify-between items-center">
              <span>Engagement Breakdown</span>
              {errors.length > 0 && <span className="text-xs font-normal text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/20">Preview Data</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 relative">
             {errors.length > 0 && (
              <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center shadow-2xl">
                  <Lock className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-900 dark:text-white">API Access Required</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-[200px]">Data will appear once permissions are granted.</p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dummyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="engagement" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* RECENT POSTS FEED */}
      <Card className="bg-white/80 dark:bg-[#090014]/40 border border-purple-200 dark:border-white/5 shadow-xl backdrop-blur-sm">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Recent Content Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-100 dark:bg-white/5 rounded-xl p-5 border border-purple-200 dark:border-white/5 flex flex-col gap-3 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                  <div className="flex gap-4 mt-2">
                    <div className="h-6 w-16 bg-white/10 rounded-full" />
                    <div className="h-6 w-16 bg-white/10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts?.elements && posts.elements.length > 0 ? (
            <div className="space-y-4">
              {posts.elements.map((post: any, idx: number) => (
                <div key={idx} className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-colors rounded-xl p-5 border border-purple-200 dark:border-white/5 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date().toLocaleDateString()} {/* Placeholder for post date */}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed">{post.commentary || 'Shared content or media without text description.'}</p>
                  
                  <div className="flex items-center gap-6 mt-5 pt-4 border-t border-purple-200 dark:border-white/5">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 text-sm">
                      <ThumbsUp className="w-4 h-4" />
                      <span>--</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 text-sm">
                      <MessageCircle className="w-4 h-4" />
                      <span>--</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 text-sm ml-auto">
                      <span className="text-xs">ID: {post.id?.split(':').pop() || post.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-600 dark:text-gray-300 mb-2">Content Feed Locked</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Once LinkedIn approves your Community Management API request, your recent company posts will securely stream directly into this feed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
