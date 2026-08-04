import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Coins,
  FileSignature,
  LifeBuoy,
  Lock,
  Megaphone,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { useAuth } from '@/context/AuthContext';
import { getMarketerOverview, type MarketerOverview } from '@/lib/marketerApi';
import { useMarketerData } from './useMarketerData';
import { humanize, inr } from '@/lib/format';

/**
 * ============================================================================
 *  CONTRACTOR OVERVIEW
 * ============================================================================
 *
 * One screen answering the three questions a freelancer actually opens the
 * app for: what am I meant to be doing, when am I getting paid, and is anyone
 * dealing with the thing I raised.
 * ============================================================================
 */

/** DD-MM-YYYY, matching the payment schedule. */
function ddmmyyyy(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

const PRIORITY_TONE: Record<string, 'gray' | 'blue' | 'amber' | 'red'> = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'amber',
  URGENT: 'red',
};

export default function MarketerOverview() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  const { data, loading, error, reload } = useMarketerData<MarketerOverview>(
    () => getMarketerOverview(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your workspace" title="Overview" />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your workspace" title="Overview" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const { tasks, payments, documents, tickets } = data;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your workspace"
        title={`Welcome back, ${firstName}`}
        subtitle="Your work, your money and your open issues, in one place."
      />

      {payments.nextPaymentDate && (
        <InfoNote tone="info">
          Your next payment is dated{' '}
          <strong>{ddmmyyyy(payments.nextPaymentDate)}</strong>
          {payments.upcoming.amount > 0
            ? ` — ${inr(payments.upcoming.amount)} scheduled.`
            : '.'}
        </InfoNote>
      )}

      {/* -------------------------------- money -------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FinanceCard
          icon={Wallet}
          label="Received"
          value={payments.received.amount}
          format={inr}
          hint={`${payments.received.count} payment${payments.received.count === 1 ? '' : 's'}`}
          tone="green"
        />
        <FinanceCard
          icon={Lock}
          label="Locked"
          value={payments.locked.amount}
          format={inr}
          hint="Held until release"
          tone="amber"
        />
        <FinanceCard
          icon={CalendarClock}
          label="Upcoming"
          value={payments.upcoming.amount}
          format={inr}
          hint={
            payments.nextPaymentDate
              ? `next on ${ddmmyyyy(payments.nextPaymentDate)}`
              : 'nothing scheduled'
          }
          tone="sky"
        />
      </div>

      {/* -------------------------------- work --------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={ClipboardList}
          label="Tasks assigned"
          value={tasks.total}
          hint={`${tasks.inProgress} in progress · ${tasks.completed} done`}
          tone="brand"
        />
        <FinanceCard
          icon={Megaphone}
          label="Meta ads spend"
          value={tasks.metaAdsSpend}
          format={inr}
          hint="Booked across your tasks"
          tone="violet"
        />
        <FinanceCard
          icon={FileSignature}
          label="Agreements"
          value={documents.agreements}
          hint={`${documents.total} documents shared`}
          tone="teal"
        />
        <FinanceCard
          icon={LifeBuoy}
          label="Open tickets"
          value={tickets.open + tickets.inProgress}
          hint={`${tickets.total} raised in total`}
          tone={tickets.open > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* ----------------------------- what is due ----------------------------- */}
      <Section
        title="Coming up"
        description="Your nearest deadlines. Full detail, and your remarks, live on My tasks."
      >
        {tasks.upcoming.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="font-display text-base font-semibold text-white">
              Nothing due
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Tasks with a deadline will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.upcoming.map((task) => (
              <div
                key={task.id}
                className="glass-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    Due {ddmmyyyy(task.dueDate)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Pill tone={PRIORITY_TONE[task.priority] ?? 'gray'}>
                    {humanize(task.priority)}
                  </Pill>
                  <Pill tone="blue">{humanize(task.status)}</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ------------------------------ shortcuts ------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            to: '/app/marketer/tasks',
            label: 'My tasks',
            icon: ClipboardList,
            hint: 'Scope, dates, budget — and your remarks',
          },
          {
            to: '/app/marketer/payments',
            label: 'Payments',
            icon: Coins,
            hint: 'Received, locked and upcoming',
          },
          {
            to: '/app/marketer/documents',
            label: 'Documents',
            icon: FileSignature,
            hint: 'Your agreements, ready to download',
          },
          {
            to: '/app/marketer/tickets',
            label: 'Raise a ticket',
            icon: LifeBuoy,
            hint: 'Anything blocking you',
          },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="glass-card card-lift group flex items-start gap-3 p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
              <link.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                {link.label}
                <ArrowRight className="h-3.5 w-3.5 translate-x-0 text-brand-300 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{link.hint}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
