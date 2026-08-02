import { useState } from 'react';
import { AlertCircle, Clock, IndianRupee, Receipt, Repeat, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import {
  Pill,
  RangeFilter,
  Section,
  statusTone,
  type DateRange,
} from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { DonutChart } from '@/components/charts/DonutChart';
import { getRevenueView, type RevenueRow, type RevenueView } from '@/lib/investorFinanceApi';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr } from '@/lib/format';

/**
 * ============================================================================
 *  4. REVENUE DASHBOARD
 * ============================================================================
 *
 * Every client payment that makes up the revenue line, so the investor can see
 * the number rather than take it.
 *
 * The distinction the page insists on: reported revenue is cash RECEIVED.
 * Invoices raised but unpaid are shown separately and never fold into the
 * total, because a profit share paid out of money that has not arrived is a
 * loan, not a distribution.
 * ============================================================================
 */

export default function InvestorRevenue() {
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });

  const { data, loading, error, reload } = useInvestorData<RevenueView>(
    () => getRevenueView(range),
    [range.from, range.to],
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Company performance"
        title="Revenue"
        subtitle="Money received from clients. This is the top line of the profit calculation."
      />

      <RangeFilter range={range} onChange={setRange} />

      {loading ? (
        <>
          <CardGridSkeleton />
          <TableSkeleton />
        </>
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              icon={IndianRupee}
              label="Revenue received"
              value={data.totals.totalRevenue}
              format={inr}
              hint={`${data.totals.receivedCount} payment${
                data.totals.receivedCount === 1 ? '' : 's'
              }`}
              tone="green"
            />
            <FinanceCard
              icon={Clock}
              label="Awaiting payment"
              value={data.totals.pendingAmount}
              format={inr}
              hint={`${data.totals.pendingCount} invoice${
                data.totals.pendingCount === 1 ? '' : 's'
              } outstanding`}
              tone="amber"
            />
            <FinanceCard
              icon={AlertCircle}
              label="Overdue"
              value={data.totals.overdueAmount}
              format={inr}
              hint={`${data.totals.overdueCount} past due`}
              tone={data.totals.overdueAmount > 0 ? 'rose' : 'brand'}
            />
            <FinanceCard
              icon={Receipt}
              label="Average payment"
              value={data.totals.averageInvoice}
              format={inr}
              hint="per received invoice"
              tone="sky"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-5">
            <ChartFrame
              title="Revenue by client"
              subtitle="Share of received revenue in this period"
              isEmpty={data.byClient.length === 0}
              className="xl:col-span-3"
            >
              <DonutChart
                slices={data.byClient.map((client) => ({
                  label: client.clientName,
                  value: client.total,
                }))}
                formatValue={inr}
                centerLabel="Revenue"
              />
            </ChartFrame>

            <section className="glass-card p-5 xl:col-span-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                <Users className="h-4 w-4 text-brand-300" />
                Top clients
              </h3>

              <ul className="mt-4 space-y-3">
                {data.byClient.slice(0, 6).map((client) => (
                  <li key={client.clientName} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">{client.clientName}</p>
                      <p className="text-xs text-slate-500">
                        {client.count} payment{client.count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                      {inr(client.total)}
                    </span>
                  </li>
                ))}
                {data.byClient.length === 0 && (
                  <li className="text-sm text-slate-500">No client payments in this period.</li>
                )}
              </ul>
            </section>
          </div>

          <Section
            title="Client payments"
            description="Only payments marked as received count toward revenue."
          >
            <FinanceTable<RevenueRow>
              rows={data.rows}
              rowKey={(row) => row.id}
              emptyTitle="No revenue in this period"
              emptyMessage="Client payments recorded by the admin team will appear here."
              maxHeight={620}
              columns={[
                {
                  key: 'client',
                  header: 'Client',
                  render: (row) => (
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium text-white">
                        {row.clientName}
                        {row.isRecurring && (
                          <Repeat
                            className="h-3.5 w-3.5 shrink-0 text-brand-300"
                            aria-label="Recurring retainer"
                          />
                        )}
                      </p>
                      {row.description && (
                        <p className="truncate text-xs text-slate-500">{row.description}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'invoice',
                  header: 'Invoice no.',
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="font-mono text-xs text-slate-400">
                      {row.invoiceNumber ?? '—'}
                    </span>
                  ),
                },
                {
                  key: 'date',
                  header: 'Payment date',
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="whitespace-nowrap text-slate-300">
                      {formatDate(row.receivedAt ?? row.paymentDate)}
                    </span>
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
                    <Pill tone={statusTone(row.status)}>{humanize(row.status)}</Pill>
                  ),
                },
              ]}
              footer={
                <>
                  <TotalCell numeric={false}>Total revenue</TotalCell>
                  <TotalCell numeric={false} hideOnMobile>
                    <span />
                  </TotalCell>
                  <TotalCell numeric={false} hideOnMobile>
                    <span />
                  </TotalCell>
                  <TotalCell>{inr(data.totals.totalRevenue)}</TotalCell>
                  <TotalCell numeric={false}>
                    <span />
                  </TotalCell>
                </>
              }
            />
          </Section>
        </>
      )}
    </div>
  );
}
