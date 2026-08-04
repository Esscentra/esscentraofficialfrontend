import { useState } from 'react';
import { CalendarClock, Coins, Lock, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import {
  listMarketerPayments,
  type MarketerPayment,
  type MarketerPaymentsView,
} from '@/lib/marketerApi';
import { useMarketerData } from './useMarketerData';
import { humanize, inr } from '@/lib/format';

/**
 * ============================================================================
 *  PAYMENTS — the contractor's statement
 * ============================================================================
 *
 * Three buckets, and a rupee sits in exactly one of them:
 *
 *   RECEIVED — in their hands
 *   LOCKED   — earned, held as security until the milestone or contract ends
 *   UPCOMING — scheduled, not yet paid
 *
 * Read-only. This is the company's stated position on what it owes; only a
 * super admin writes it.
 * ============================================================================
 */

/** DD-MM-YYYY, as asked for — unambiguous on a payment schedule. */
function ddmmyyyy(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

/** The date that matters for a row, which depends on where the money is. */
function relevantDate(row: MarketerPayment): string {
  if (row.status === 'RECEIVED') return ddmmyyyy(row.receivedAt);
  if (row.status === 'LOCKED') return ddmmyyyy(row.releaseDate);
  return ddmmyyyy(row.dueDate);
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'blue'> = {
  RECEIVED: 'green',
  LOCKED: 'amber',
  UPCOMING: 'blue',
};

type Tab = '' | 'RECEIVED' | 'LOCKED' | 'UPCOMING';

export default function MarketerPayments() {
  const [tab, setTab] = useState<Tab>('');

  const { data, loading, error, reload } = useMarketerData<MarketerPaymentsView>(
    () => listMarketerPayments(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your engagement" title="Payments" />
        <CardGridSkeleton count={4} />
        <TableSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your engagement" title="Payments" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const { summary } = data;
  const rows = tab ? data.rows.filter((row) => row.status === tab) : data.rows;

  const TABS: Array<{ value: Tab; label: string; count?: number }> = [
    { value: '', label: 'All', count: data.rows.length },
    { value: 'RECEIVED', label: 'Received', count: summary.received.count },
    { value: 'LOCKED', label: 'Locked', count: summary.locked.count },
    { value: 'UPCOMING', label: 'Upcoming', count: summary.upcoming.count },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your engagement"
        title="Payments"
        subtitle="What you have been paid, what is being held, and what is scheduled next."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={Wallet}
          label="Received"
          value={summary.received.amount}
          format={inr}
          hint={`${summary.received.count} payment${summary.received.count === 1 ? '' : 's'}`}
          tone="green"
        />
        <FinanceCard
          icon={Lock}
          label="Locked"
          value={summary.locked.amount}
          format={inr}
          hint="Held until release"
          tone="amber"
        />
        <FinanceCard
          icon={CalendarClock}
          label="Upcoming"
          value={summary.upcoming.amount}
          format={inr}
          hint={
            summary.nextPaymentDate
              ? `next on ${ddmmyyyy(summary.nextPaymentDate)}`
              : 'nothing scheduled'
          }
          tone="sky"
        />
        <FinanceCard
          icon={Coins}
          label="Total engagement"
          value={summary.totalEngagement}
          format={inr}
          hint="Received + locked + upcoming"
          tone="brand"
        />
      </div>

      {summary.locked.amount > 0 && (
        <InfoNote tone="info">
          {inr(summary.locked.amount)} is held as security and will be released on
          the dates shown below. It is yours — it has been earned, not deducted.
        </InfoNote>
      )}

      {/* ------------------------------- tabs -------------------------------- */}
      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-1">
        {TABS.map((entry) => {
          const active = tab === entry.value;
          return (
            <button
              key={entry.value || 'all'}
              type="button"
              onClick={() => setTab(entry.value)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 !text-white shadow'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {entry.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? 'bg-white/20 !text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {entry.count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <Section
        title="Payment records"
        description="Every line recorded against your engagement."
      >
        <FinanceTable<MarketerPayment>
          rows={rows}
          rowKey={(row) => row._id}
          emptyTitle={
            tab === 'RECEIVED'
              ? 'Nothing received yet'
              : tab === 'LOCKED'
                ? 'Nothing held'
                : tab === 'UPCOMING'
                  ? 'Nothing scheduled'
                  : 'No payments yet'
          }
          emptyMessage="Payments recorded against your engagement will appear here."
          maxHeight={620}
          columns={[
            {
              key: 'title',
              header: 'Payment',
              render: (row) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-100">{row.title}</p>
                  {row.description && (
                    <p className="truncate text-xs text-slate-500">
                      {row.description}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: 'task',
              header: 'Task',
              hideOnMobile: true,
              render: (row) => (
                <span className="text-slate-400">
                  {typeof row.taskId === 'object' && row.taskId
                    ? row.taskId.title
                    : '—'}
                </span>
              ),
            },
            {
              key: 'date',
              header: 'Date',
              render: (row) => (
                <div className="whitespace-nowrap">
                  <p className="text-slate-300">{relevantDate(row)}</p>
                  <p className="text-[11px] text-slate-500">
                    {row.status === 'RECEIVED'
                      ? 'received'
                      : row.status === 'LOCKED'
                        ? 'releases'
                        : 'due'}
                  </p>
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              numeric: true,
              render: (row) => (
                <span className="font-semibold text-white">{inr(row.amount)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              render: (row) => (
                <div className="flex flex-col items-center gap-1">
                  <Pill tone={STATUS_TONE[row.status] ?? 'gray'}>
                    {humanize(row.status)}
                  </Pill>
                  {row.status === 'LOCKED' && row.lockReason && (
                    <span className="max-w-[12rem] truncate text-[11px] text-slate-500">
                      {row.lockReason}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'reference',
              header: 'Reference',
              hideOnMobile: true,
              render: (row) => (
                <span className="text-xs text-slate-400">
                  {row.referenceNumber || (row.paymentMode ? humanize(row.paymentMode) : '—')}
                </span>
              ),
            },
          ]}
          footer={
            <>
              <TotalCell numeric={false}>Total</TotalCell>
              <TotalCell numeric={false} hideOnMobile>
                <span />
              </TotalCell>
              <TotalCell numeric={false}>
                <span className="text-slate-400">
                  {rows.length} record{rows.length === 1 ? '' : 's'}
                </span>
              </TotalCell>
              <TotalCell>
                {inr(rows.reduce((sum, row) => sum + row.amount, 0))}
              </TotalCell>
              <TotalCell numeric={false}>
                <span />
              </TotalCell>
              <TotalCell numeric={false} hideOnMobile>
                <span />
              </TotalCell>
            </>
          }
        />
      </Section>
    </div>
  );
}
