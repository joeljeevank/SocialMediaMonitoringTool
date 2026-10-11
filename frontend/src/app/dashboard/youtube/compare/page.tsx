import { Suspense } from 'react';
import { YouTubeComparisonDashboard } from '@/components/youtube/youtube-comparison-dashboard';

export const metadata = {
  title: 'YouTube Channel Comparison - SocialPulse',
  description: 'Side-by-side benchmarking and comparison of YouTube channels for views, subscriber growth, and comments.',
};

export default function YouTubeComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading Comparison Dashboard...</div>}>
      <YouTubeComparisonDashboard />
    </Suspense>
  );
}
