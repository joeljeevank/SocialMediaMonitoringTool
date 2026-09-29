import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileDetailLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-8 w-64 rounded-xl" />
      </div>
      <div className="p-6 rounded-3xl bg-white/60 dark:bg-[#090d16]/60 border border-slate-200/80 dark:border-cyan-500/20 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}
