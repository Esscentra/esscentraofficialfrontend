import { Skeleton } from './ui/Skeleton';

/**
 * Full-layout skeleton for the overview/investor dashboard. Mirrors the real
 * composition (hero → KPI row → chart grid) so the swap to live data is
 * seamless rather than a jarring pop-in.
 */
export function DashboardSkeleton() {
  return (
    <div className="page-enter">
      {/* Hero banner */}
      <div className="glass-card mb-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <div className="w-full space-y-2.5 sm:w-auto sm:text-right">
            <Skeleton className="h-3 w-28 sm:ml-auto" />
            <Skeleton className="h-10 w-40 sm:ml-auto" />
            <Skeleton className="h-6 w-24 rounded-full sm:ml-auto" />
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-4 h-7 w-24" />
            <Skeleton className="mt-2.5 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Chart cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-2 h-3 w-28" />
            <Skeleton className="mt-6 h-40 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
