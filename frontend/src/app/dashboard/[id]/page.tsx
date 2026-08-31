'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, ThumbsUp, MessageCircle, Share2, Eye, Users, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import axios from 'axios';

export default function AnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/analytics/${id}`);
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      }
      setLoading(false);
    };
    if (id) fetchAnalytics();
  }, [id]);

  if (loading) return <div className="text-slate-900 dark:text-white text-center py-20">Loading analytics...</div>;
  if (!data || data.length === 0) return <div className="text-slate-900 dark:text-white text-center py-20">No data available for this account.</div>;

  const latest = data[data.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-500 dark:text-gray-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Profile Analytics</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Detailed performance metrics for this account</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button 
            onClick={async () => {
              setCollecting(true);
              try {
                const res = await axios.post(`http://localhost:3001/api/linkedin/collect?accountId=${id}`);
                const result = res.data;
                if (result.status === 'success') {
                  setScrapedData(result.data);
                  // Refresh analytics to get the newly inserted row
                  const aRes = await axios.get(`http://localhost:3001/analytics/${id}`);
                  setData(aRes.data);
                } else {
                  alert('Error collecting data: ' + result.message);
                }
              } catch (e: any) {
                console.error(e);
                const errorMsg = e.response?.data?.message || e.response?.data?.error || e.message;
                alert('Error collecting data: ' + errorMsg);
              }
              setCollecting(false);
            }} 
            disabled={collecting}
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white font-semibold px-6 shadow-lg shadow-indigo-500/20"
          >
            {collecting ? 'Collecting Data...' : 'Collect LinkedIn Data'}
          </Button>
        </div>
      </div>

      {scrapedData && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8 text-slate-900 dark:text-white">
          <h2 className="text-xl font-bold mb-4">Latest Collection Results</h2>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="col-span-2">
              <span className="text-slate-500 dark:text-gray-400">Last Updated:</span> {new Date(scrapedData.lastCollectionTime).toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
            </div>
            <div><span className="text-slate-500 dark:text-gray-400">Source:</span> {scrapedData.dataSource}</div>
            <div className="col-span-2"><span className="text-slate-500 dark:text-gray-400">Unavailable Analytics (Not supported by public profile view):</span> {scrapedData.unavailable.join(', ')}</div>
          </div>
          
          <h3 className="font-semibold mb-2 mt-4 text-lg">Recent Posts Scraped</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700 text-slate-500 dark:text-gray-400">
                  <th className="py-2 px-4">Author</th>
                  <th className="py-2 px-4">Post Content</th>
                  <th className="py-2 px-4">Reactions</th>
                  <th className="py-2 px-4">Comments</th>
                  <th className="py-2 px-4">Post Date</th>
                </tr>
              </thead>
              <tbody>
                {scrapedData.posts?.map((post: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-3 px-4">{post.author || 'Unknown'}</td>
                    <td className="py-3 px-4 truncate max-w-xs">
                      {post.postUrl ? (
                        <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {post.content || '(Media / No text)'}
                        </a>
                      ) : (
                        post.content || '(Media / No text)'
                      )}
                    </td>
                    <td className="py-3 px-4">{post.likes ?? '-'}</td>
                    <td className="py-3 px-4">{post.comments ?? '-'}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{post.postDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-4xl bg-gray-900 text-slate-900 dark:text-white border-gray-700 max-h-[80vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">{activeModal} Details</h2>
          
          {!scrapedData?.posts || scrapedData.posts.length === 0 ? (
            <div className="text-slate-500 dark:text-gray-400 py-8 text-center">
              No detailed data available yet. Please click "Collect LinkedIn Data" first to fetch the latest post details.
            </div>
          ) : (
            <div className="space-y-6">
              {activeModal === 'Comments' && (
                <div className="bg-blue-900/20 text-blue-400 p-4 rounded-lg text-sm mb-4">
                  <strong>Note:</strong> The current scraper configuration extracts the total comment <em>count</em> per post. To protect user privacy and respect LinkedIn API limits, the actual text and names of individual commenters are not scraped. Below are the posts that received comments.
                </div>
              )}
              
              {scrapedData.posts
                .filter((p: any) => {
                   if (activeModal === 'Comments') return p.comments > 0;
                   if (activeModal === 'Likes') return p.likes > 0;
                   if (activeModal === 'Recent Posts') return true;
                   return false; // For Followers, Views, Shares we don't have per-post granular data currently
                })
                .map((post: any, idx: number) => (
                <div key={idx} className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-lg text-slate-900 dark:text-white">{post.author}</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{post.postDate}</p>
                    </div>
                    {post.postUrl && (
                      <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white px-3 py-1 rounded-full transition-colors">
                        View on LinkedIn
                      </a>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-gray-300 text-sm mb-4 whitespace-pre-wrap">{post.content || '(Media / No text)'}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400 border-t border-gray-700 pt-3">
                    <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.comments}</span>
                  </div>
                </div>
              ))}
              
              {activeModal === 'Comments' && scrapedData.posts.filter((p: any) => p.comments > 0).length === 0 && (
                 <div className="text-slate-500 dark:text-gray-400 py-8 text-center">None of the recent posts have comments.</div>
              )}
              {activeModal === 'Likes' && scrapedData.posts.filter((p: any) => p.likes > 0).length === 0 && (
                 <div className="text-slate-500 dark:text-gray-400 py-8 text-center">None of the recent posts have likes.</div>
              )}
              {['Followers', 'Views', 'Shares'].includes(activeModal) && (
                 <div className="text-slate-500 dark:text-gray-400 py-8 text-center">Granular per-post data for {activeModal} is not available via the public profile view.</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Followers', value: latest.followers ?? 0, icon: Users, color: 'text-blue-400' },
          { label: 'Views', value: latest.views ?? 0, icon: Eye, color: 'text-indigo-400' },
          { label: 'Likes', value: latest.likes ?? 0, icon: ThumbsUp, color: 'text-pink-400' },
          { label: 'Comments', value: latest.comments ?? 0, icon: MessageCircle, color: 'text-emerald-400' },
          { label: 'Shares', value: latest.shares ?? 0, icon: Share2, color: 'text-orange-400' },
          { label: 'Recent Posts', value: latest.recentPosts ?? 0, icon: FileText, color: 'text-purple-600 dark:text-purple-400' },
        ].map((stat, i) => (
          <Card 
            key={i} 
            className={`glass border border-purple-200 dark:border-white/5 cursor-pointer transition-all hover:scale-105 hover:bg-slate-100 dark:bg-white/5 ${activeModal === stat.label ? 'ring-2 ring-indigo-500' : ''}`}
            onClick={() => setActiveModal(stat.label)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value.toLocaleString()}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Engagement Overview (Views)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="views" stroke="#818cf8" fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Interactions (Likes, Comments, Shares)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', borderColor: 'rgba(255,255,255,0.1)' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Legend />
                <Bar dataKey="likes" fill="#f472b6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comments" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="shares" fill="#fb923c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
