'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Eye, Calendar, TrendingUp, Users, ThumbsUp, Share2 } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Legend,
  LineChart,
  Line
} from 'recharts';

interface YouTubeChartsProps {
  timeseries: any[];
  dateRange: string;
}

export default function YouTubeAnalyticsCharts({ timeseries, dateRange }: YouTubeChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Views & Watch Time Trend */}
      <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-500" />
                Views & Watch Time Trend
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Daily viewer traffic and watch time hours ({dateRange})
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2 h-80">
          {timeseries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 text-xs">
              <Calendar className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
              No daily time-series data available for this range yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViewsYt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorWatchYt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '1.25rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="views" name="Views" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorViewsYt)" />
                <Area type="monotone" dataKey="watchTimeHours" name="Watch Time (Hrs)" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorWatchYt)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Subscriber Growth (Gained vs Lost) */}
      <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Subscriber Growth
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Subscribers gained vs lost per day ({dateRange})
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2 h-80">
          {timeseries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 text-xs">
              <Users className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
              No subscriber growth data recorded for this range yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeseries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '1.25rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="subscribersGained" name="Gained" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="subscribersLost" name="Lost" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Engagement Over Time (Likes, Comments, Shares) */}
      <Card className="glass border border-purple-200 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden lg:col-span-2">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-pink-500" />
                Audience Engagement Over Time
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Tracking likes, comments, and shares across video uploads ({dateRange})
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2 h-72">
          {timeseries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-gray-400 text-xs">
              <Share2 className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
              No engagement records found for this range yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '1.25rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="likes" name="Likes" stroke="#ec4899" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="comments" name="Comments" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="shares" name="Shares" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
