import { useEffect, useState } from 'react';
import { CalendarClock, CalendarCheck, TriangleAlert } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { StatusBadge, type Tone as BadgeTone } from './StatusBadge';
import {
  getInvestorNextDue,
  getMyNextDue,
  type NextDue,
  type NextDueEntry,
} from '@/lib/commitmentApi';
import { cn, getErrorMessage, isNotFound } from '@/lib/utils';

/* ------------------------------ formatting ------------------------------ */

/** Currency formatter for whatever currency the commitment is denominated in. */
function money(amount: number, currency?: string | null): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${currency || 'INR'} ${Math.round(amount || 0).toLocaleString('en-IN')}`;
  }
}

/**
 * Due dates are stored at UTC midnight, so they must be read back in UTC —
 * rendering them in the browser's local zone shifts the day for anyone west
 * of Greenwich.
 */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

/** "due today" / "in 6 days" / "3 days overdue" from the server's day count. */
function relativeDue(days: number): string {
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  if (days > 1) return `in ${days} days`;
  const late = Math.abs(days);
  return `${late} ${late === 1 ? 'day' : 'days'} overdue`;
}

function ordinal(day: number): string {
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
  const suffix = ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th';
  return `${day}${suffix}`;
}

/* --------------------------------- hook --------------------------------- */

/**
 * Loads a next-due record. Pass an `investorId` for the admin endpoint;
 * omit it for the logged-in investor's own. Set `enabled` to false to skip
 * the request entirely (used when the caller supplies its own data).
 */
export function useNextDue(investorId?: string, enabled = true) {
  const [data, setData] = useState<NextDue | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setUnavailable(false);

    const request = investorId ? getInvestorNextDue(investorId) : getMyNextDue();
    request
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (!active) return;
        // 404 = the endpoint isn't deployed, or this investor has no record.
        // Neither is an error worth alarming an admin about.
        if (isNotFound(e)) setUnavailable(true);
        else setError(getErrorMessage(e, 'Could not load the next due date.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [investorId, enabled]);

  return { data, loading, error, unavailable };
}

/* ------------------------------- component ------------------------------ */

type Tone = 'overdue' | 'soon' | 'later' | 'clear';

const TONE: Record<Tone, { wrap: string; chip: string; icon: string; text: string }> = {
  overdue: {
    wrap: 'border-rose-400/30 bg-rose-500/[0.07]',
    chip: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
    icon: 'text-rose-300',
    text: 'text-rose-100',
  },
  soon: {
    wrap: 'border-amber-400/25 bg-amber-500/[0.07]',
    chip: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
    icon: 'text-amber-300',
    text: 'text-amber-100',
  },
  later: {
    wrap: 'border-brand-400/25 bg-brand-500/[0.06]',
    chip: 'bg-brand-500/15 text-brand-200 ring-brand-400/30',
    icon: 'text-brand-300',
    text: 'text-slate-200',
  },
  clear: {
    wrap: 'border-white/[0.08] bg-white/[0.03]',
    chip: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
    icon: 'text-emerald-300',
    text: 'text-slate-300',
  },
};

/** Overdue → rose, within a week → amber, otherwise the neutral brand tone. */
function toneFor(days: number | null): Tone {
  if (days === null) return 'clear';
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'later';
}

export interface NextDueCardProps {
  /** Admin: whose next due date to show. Omit for the current investor. */
  investorId?: string;
  /** Supply already-fetched data to skip the internal request. */
  data?: NextDue | null;
  loading?: boolean;
  error?: string | null;
  /** Heading text. Defaults to "Next payment due". */
  title?: string;
  /** Show the remaining pending commitments below the headline. */
  showUpcoming?: boolean;
  className?: string;
}

/**
 * Renders `GET /commitments/my/next-due` (or the admin per-investor variant)
 * as a single banner: the date, how far off it is, and what's outstanding.
 * Fetches on its own unless `data` is passed in.
 */
export function NextDueCard({
  investorId,
  data: dataProp,
  loading: loadingProp,
  error: errorProp,
  title = 'Next payment due',
  showUpcoming = true,
  className,
}: NextDueCardProps) {
  const controlled = dataProp !== undefined;
  const fetched = useNextDue(investorId, !controlled);

  // A controlled card must not also fire the request.
  const data = controlled ? dataProp : fetched.data;
  const loading = controlled ? !!loadingProp : fetched.loading;
  const error = controlled ? errorProp ?? null : fetched.error;
  const unavailable = !controlled && fetched.unavailable;

  if (loading) {
    return (
      <div className={cn('rounded-xl border border-white/[0.08] bg-white/[0.03] p-4', className)}>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-6 w-48" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3',
          className,
        )}
      >
        <TriangleAlert className="h-4 w-4 shrink-0 text-rose-300" />
        <p className="text-sm text-rose-100">{error}</p>
      </div>
    );
  }

  // Nothing outstanding: every commitment is either funded, inactive or has
  // no due day set. Still worth showing so the absence reads as deliberate.
  if (unavailable || !data || !data.commitment || !data.nextDueDate || data.daysUntilDue === null) {
    const tone = TONE.clear;
    return (
      <div
        className={cn('flex items-center gap-3 rounded-xl border px-4 py-3', tone.wrap, className)}
      >
        <CalendarCheck className={cn('h-4 w-4 shrink-0', tone.icon)} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {unavailable ? 'Due date unavailable' : 'No payment due'}
          </p>
          <p className="text-xs text-slate-500">
            {unavailable
              ? 'The server did not return a due date for this investor.'
              : 'Nothing outstanding on an active commitment right now.'}
          </p>
        </div>
      </div>
    );
  }

  const next = data.commitment;
  const tone = TONE[toneFor(data.daysUntilDue)];
  const rest = showUpcoming ? data.upcoming.filter((u) => u.commitmentId !== next.commitmentId) : [];

  return (
    <div className={cn('rounded-xl border px-4 py-3.5', tone.wrap, className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <CalendarClock className={cn('mt-0.5 h-4 w-4 shrink-0', tone.icon)} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {title}
            </p>
            <p className={cn('mt-1 text-sm', tone.text)}>
              <span className="font-display text-base font-bold text-white">
                {data.nextDueDateLabel || fmtDate(data.nextDueDate)}
              </span>
              <span
                className={cn(
                  'ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                  tone.chip,
                )}
              >
                {relativeDue(data.daysUntilDue)}
              </span>
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {next.title} · every {ordinal(next.dueDay)} of the month
              {next.dueReminderEnabled ? '' : ' · reminders off'}
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="font-display text-lg font-bold leading-none text-white tabular-nums">
            {money(data.pendingAmount, data.currency)}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Pending
          </p>
        </div>
      </div>

      {rest.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-white/10 pt-2.5">
          {rest.map((u: NextDueEntry) => (
            <li key={u.commitmentId} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-1 w-1 shrink-0 rounded-full bg-slate-500" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{u.title}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {u.nextDueDateLabel || fmtDate(u.nextDueDate)}
              </span>
              <span className="shrink-0 tabular-nums text-slate-300">
                {money(u.pendingAmount, u.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


/* ------------------------------ full panel ------------------------------ */

const BADGE_TONE: Record<Tone, BadgeTone> = {
  overdue: 'red',
  soon: 'amber',
  later: 'blue',
  clear: 'gray',
};

/** Short status word for the badge, from the same day count as the banner. */
function statusLabel(days: number | null): string {
  if (days === null) return 'Nothing due';
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days <= 7) return 'Due soon';
  return 'Scheduled';
}

function Tile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        accent
          ? 'border-brand-400/25 bg-brand-500/[0.08]'
          : 'border-white/[0.07] bg-white/[0.03]',
      )}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="font-display text-base font-bold leading-none text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}

/**
 * The full next-due record, laid out for the admin investor-records view:
 * headline date and countdown, the money breakdown behind it, and every other
 * pending commitment queued after it.
 *
 * Same data source as `NextDueCard` — this is the expanded presentation.
 */
export function NextDuePanel({
  investorId,
  title = 'Next payment due',
  className,
}: {
  /** Omit for the logged-in investor's own record. */
  investorId?: string;
  title?: string;
  className?: string;
}) {
  const { data, loading, error, unavailable } = useNextDue(investorId);

  const shell = (children: React.ReactNode) => (
    <div className={cn('glass-card p-5', className)}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30">
          <CalendarClock className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          <p className="text-[11px] text-slate-500">
            Soonest installment across this investor's active commitments
          </p>
        </div>
        {data?.daysUntilDue !== undefined && !loading && !error && (
          <span className="ml-auto shrink-0">
            <StatusBadge tone={BADGE_TONE[toneFor(data?.daysUntilDue ?? null)]}>
              {statusLabel(data?.daysUntilDue ?? null)}
            </StatusBadge>
          </span>
        )}
      </div>
      {children}
    </div>
  );

  if (loading) {
    return shell(
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>,
    );
  }

  if (error) {
    return shell(
      <div className="flex items-center gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3">
        <TriangleAlert className="h-4 w-4 shrink-0 text-rose-300" />
        <p className="text-sm text-rose-100">{error}</p>
      </div>,
    );
  }

  if (unavailable || !data?.commitment || !data.nextDueDate || data.daysUntilDue === null) {
    return shell(
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
        <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-300" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {unavailable ? 'Due date unavailable' : 'No payment due'}
          </p>
          <p className="text-xs text-slate-500">
            {unavailable
              ? 'The server did not return a due date for this investor.'
              : 'Every active commitment is either fully funded or has no due day set.'}
          </p>
        </div>
      </div>,
    );
  }

  const next = data.commitment;
  const tone = TONE[toneFor(data.daysUntilDue)];
  const rest = data.upcoming.filter((u) => u.commitmentId !== next.commitmentId);

  return shell(
    <>
      {/* Headline: the date, the countdown, the amount */}
      <div
        className={cn(
          'flex flex-wrap items-end justify-between gap-x-6 gap-y-3 rounded-xl border px-4 py-3.5',
          tone.wrap,
        )}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Due date
          </p>
          <p className="mt-1 font-display text-2xl font-bold leading-none text-white">
            {data.nextDueDateLabel || fmtDate(data.nextDueDate)}
          </p>
          <p className={cn('mt-1.5 text-xs font-semibold', tone.text)}>
            {relativeDue(data.daysUntilDue)}
            {data.isOverdue ? ' · payment is late' : ''}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Amount pending
          </p>
          <p className="mt-1 font-display text-2xl font-bold leading-none text-white tabular-nums">
            {money(data.pendingAmount, data.currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            every {ordinal(next.dueDay)} of the month
          </p>
        </div>
      </div>

      {/* What the due amount is derived from */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tile label="Committed" value={money(next.committedAmount, next.currency)} accent />
        <Tile label="Received" value={money(next.receivedTotal, next.currency)} />
        <Tile label="Pending" value={money(next.pendingAmount, next.currency)} />
        <Tile label="Due day" value={ordinal(next.dueDay)} />
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span className="truncate font-medium text-slate-300">{next.title}</span>
        <span aria-hidden>·</span>
        <span className={next.dueReminderEnabled ? 'text-emerald-300' : 'text-amber-300'}>
          {next.dueReminderEnabled ? 'Reminders on' : 'Reminders off'}
        </span>
        <span aria-hidden>·</span>
        <span>{data.currency ?? next.currency}</span>
      </p>

      {/* Everything queued behind it */}
      {rest.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Also pending ({rest.length})
          </p>
          <ul className="space-y-1.5">
            {rest.map((u: NextDueEntry) => (
              <li key={u.commitmentId} className="flex items-center gap-2.5 text-xs">
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    u.daysUntilDue < 0 ? 'bg-rose-400' : 'bg-slate-500',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-slate-300">{u.title}</span>
                <span className="shrink-0 text-slate-500">
                  {u.nextDueDateLabel || fmtDate(u.nextDueDate)}
                </span>
                <span className="w-20 shrink-0 text-right text-slate-500">
                  {relativeDue(u.daysUntilDue)}
                </span>
                <span className="w-24 shrink-0 text-right tabular-nums text-white">
                  {money(u.pendingAmount, u.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>,
  );
}
