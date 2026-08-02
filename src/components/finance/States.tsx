import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * The three states every data page needs, in one place.
 *
 * They exist as shared components because inconsistent loading and error
 * states are how a dashboard starts feeling unreliable: one page spinning,
 * one page blank, one page showing a raw stack trace.
 */

/** A grid of card-shaped skeletons, matching the KPI row's layout. */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass-card p-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-4 h-7 w-28" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** A skeleton shaped like a chart card. */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="glass-card p-5">
      <Skeleton className="h-4 w-40" />
      {/* Skeleton only takes a className, so the dynamic height goes on a
          wrapper rather than being forced through the component's API. */}
      <div className="mt-4 w-full" style={{ height }}>
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}

/** A skeleton shaped like a table. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.025] px-5 py-3.5">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-page skeleton: KPI row, a chart, a table. */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-3 h-3.5 w-80" />
      </div>
      <CardGridSkeleton />
      <ChartSkeleton />
      <TableSkeleton />
    </div>
  );
}

/**
 * An error state that offers a way out.
 *
 * Deliberately shows the backend's message: "Cap table exceeded: 95% is
 * already committed" is actionable, whereas "Something went wrong" sends the
 * user to support for a problem they could have fixed themselves.
 */
export function ErrorState({
  message,
  onRetry,
  title = 'Could not load this data',
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-rose-400/15 to-rose-700/5 text-rose-300 ring-1 ring-rose-400/20">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 className="mt-1 text-base font-semibold text-white">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * A section-level notice, for the "this feature has no data because nothing
 * has been recorded yet" case — which is normal on a new deployment and
 * should not read like a failure.
 */
export function InfoNote({
  icon: Icon = AlertTriangle,
  children,
  tone = 'neutral',
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'info';
}) {
  const tones = {
    neutral: 'border-white/10 bg-white/[0.04] text-slate-300',
    warning: 'border-amber-500/25 bg-amber-500/[0.07] text-amber-200',
    info: 'border-brand-500/25 bg-brand-500/[0.07] text-brand-200',
  } as const;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}
