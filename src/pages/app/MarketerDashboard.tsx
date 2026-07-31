import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  FileCheck2,
  FolderKanban,
  Hourglass,
  ListChecks,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard, type StatTone } from '@/components/ui/StatCard';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { getMarketerOverview } from '@/lib/projectApi';
import { getErrorMessage } from '@/lib/utils';
import type { ContractStatus, MarketerOverview, PaymentStatus } from '@/types';

const CONTRACT_TONE: Record<ContractStatus, Tone> = {
  PENDING: 'amber',
  ACTIVE: 'green',
  COMPLETED: 'gray',
};

/** Payment tiles read green only when the money has actually landed. */
function paymentTone(status: PaymentStatus | null): StatTone {
  if (status === 'PAID') return 'green';
  if (status === 'OVERDUE') return 'amber';
  if (status === 'PARTIAL') return 'sky';
  return 'brand';
}

/** Colour the "days remaining" tile by urgency rather than always brand-blue. */
function daysTone(days: number | null): StatTone {
  if (days === null) return 'brand';
  if (days <= 7) return 'amber';
  if (days <= 30) return 'sky';
  return 'green';
}

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const relative = (iso?: string | null) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/**
 * The contract marketer's Overview.
 *
 * Everything here is scoped to the signed-in contractor by the backend — their
 * contract, their projects, their reports, their notifications. It replaces
 * the workspace card grid, which points at pages they cannot open.
 */
export default function MarketerDashboard() {
  const toast = useToast();
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  const [data, setData] = useState<MarketerOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMarketerOverview()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) toast.error('Could not load your overview', getErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  if (loading) return <DashboardSkeleton />;

  if (!data) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Overview unavailable"
        description="We couldn't load your contract details. Please refresh in a moment."
      />
    );
  }

  const hasContract = !!data.currentProject;

  return (
    <div>
      <PageHeader
        eyebrow="Freelance performance marketer"
        title={`Welcome back, ${firstName}`}
        subtitle={
          hasContract
            ? 'Your contract at a glance, and what needs your attention next.'
            : 'No project has been assigned to you yet.'
        }
        action={
          data.contractStatus ? (
            <StatusBadge tone={CONTRACT_TONE[data.contractStatus]}>
              {humanize(data.contractStatus)}
            </StatusBadge>
          ) : undefined
        }
      />

      {!hasContract ? (
        <EmptyState
          icon={FolderKanban}
          title="Nothing assigned yet"
          description="Once a super admin assigns you to a project, your contract dates, documents and deliverables will show up here."
        />
      ) : (
        <div className="space-y-5">
          {/* --------------------------- current project --------------------------- */}
          <Link
            to={`/app/projects/${data.currentProject!.id}`}
            className="glass-card card-lift group flex items-start gap-4 p-5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
              <FolderKanban className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Current project
              </p>
              <h2 className="mt-0.5 flex items-center gap-1.5 font-display text-lg font-bold text-white">
                {data.currentProject!.name}
                <span
                  className="translate-x-0 text-brand-300 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                  aria-hidden
                >
                  →
                </span>
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {humanize(data.currentProject!.status)}
                {data.currentProject!.documentCount > 0 &&
                  ` · ${data.currentProject!.documentCount} document${
                    data.currentProject!.documentCount === 1 ? '' : 's'
                  }`}
                {data.projectCount > 1 && ` · ${data.projectCount} projects assigned`}
              </p>
            </div>
          </Link>

          {/* ------------------------------- KPI tiles ----------------------------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={ShieldCheck}
              label="Contract status"
              value={data.contractStatus ? humanize(data.contractStatus) : '—'}
              tone={data.contractStatus === 'ACTIVE' ? 'green' : 'amber'}
              hint="Set by your account manager"
            />
            <StatCard
              icon={Wallet}
              label="Payment status"
              value={data.paymentStatus ? humanize(data.paymentStatus) : '—'}
              tone={paymentTone(data.paymentStatus)}
              hint={data.paymentStatus === 'OVERDUE' ? 'Chase your account manager' : undefined}
            />
            <StatCard
              icon={Hourglass}
              label="Days remaining"
              value={data.daysRemaining ?? '—'}
              tone={daysTone(data.daysRemaining)}
              hint={data.contractEndDate ? `Ends ${day(data.contractEndDate)}` : 'No end date set'}
            />
            <StatCard
              icon={CalendarDays}
              label="Contract start"
              value={day(data.contractStartDate)}
              tone="violet"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={FileCheck2}
              label="Weekly reports"
              value={data.weeklyReportsSubmitted}
              tone="sky"
              hint={
                data.lastReportWeekStart
                  ? `Last: week of ${day(data.lastReportWeekStart)}`
                  : 'None submitted yet'
              }
            />
            <StatCard
              icon={ListChecks}
              label="Pending deliverables"
              value={data.pendingDeliverables}
              tone={data.pendingDeliverables > 0 ? 'amber' : 'green'}
              hint={`${data.completedDeliverables} of ${data.totalDeliverables} done`}
            />
            <StatCard
              icon={Bell}
              label="Notifications"
              value={data.unreadNotifications}
              tone={data.unreadNotifications > 0 ? 'brand' : 'green'}
              hint={data.unreadNotifications > 0 ? 'Unread' : 'All caught up'}
            />
            <StatCard
              icon={CalendarRange}
              label="Contract end"
              value={day(data.contractEndDate)}
              tone="violet"
            />
          </div>

          {/* -------------------- deadlines + notifications ------------------- */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="glass-card p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-brand-300" />
                <h2 className="font-display text-base font-bold text-white">
                  Upcoming deadlines
                </h2>
              </div>

              {data.upcomingDeadlines.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Nothing due in the next 60 days.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {data.upcomingDeadlines.map((d) => (
                    <li
                      key={`${d.type}-${d.id}`}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{d.title}</p>
                        <p className="text-xs text-slate-500">
                          {day(d.dueDate)}
                          {d.projectName && d.type === 'DELIVERABLE' && ` · ${d.projectName}`}
                        </p>
                      </div>
                      {d.overdue ? (
                        <StatusBadge tone="red">overdue</StatusBadge>
                      ) : (
                        <span className="shrink-0 text-xs tabular-nums text-slate-400">
                          {d.daysRemaining === 0 ? 'today' : `${d.daysRemaining}d`}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="glass-card p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-300" />
                <h2 className="font-display text-base font-bold text-white">Notifications</h2>
              </div>

              {data.notifications.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Nothing new.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {data.notifications.map((n) => (
                    <li key={n.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          n.isRead ? 'bg-slate-600' : 'bg-brand-400'
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs text-slate-400">{n.message}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">
                        {relative(n.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
