import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-36 rounded-2xl" />
      </div>

      <div className="p-6 rounded-3xl bg-white/60 dark:bg-[#090d16]/60 border border-slate-200/80 dark:border-cyan-500/20 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/5">
          <Skeleton className="h-5 w-44 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
