import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="p-8 rounded-3xl bg-white/60 dark:bg-[#090d16]/60 border border-slate-200/80 dark:border-cyan-500/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-56 rounded-xl" />
              <Skeleton className="h-4 w-72 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}
