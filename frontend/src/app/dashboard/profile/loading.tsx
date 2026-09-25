import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="p-6 sm:p-8 rounded-3xl bg-white/60 dark:bg-[#090d16]/60 border border-slate-200/80 dark:border-cyan-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Skeleton className="w-20 h-20 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="p-6 rounded-3xl bg-white/60 dark:bg-[#090d16]/60 border border-slate-200/80 dark:border-cyan-500/20 space-y-4">
        <Skeleton className="h-6 w-44 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
