import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-40 rounded-2xl" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/60 dark:bg-[#090d16]/60 border border-slate-200/80 dark:border-cyan-500/20 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content Card Skeleton */}
      <div className="p-6 rounded-3xl bg-white/60 dark:bg-[#090d16]/60 border border-slate-200/80 dark:border-cyan-500/20 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/5">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
