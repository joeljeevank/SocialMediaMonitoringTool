import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
      </div>
      <div className="p-6 sm:p-8 rounded-3xl bg-white/60 dark:bg-[#090d16]/60 border border-slate-200/80 dark:border-cyan-500/20 space-y-4">
        <Skeleton className="h-6 w-40 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
