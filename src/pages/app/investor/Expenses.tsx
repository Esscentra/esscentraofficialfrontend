import { useState } from 'react';
import { CheckCircle2, Clock, Receipt, Repeat, Wallet } from 'lucide-react';
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
import { CardGridSkeleton, ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { DonutChart } from '@/components/charts/DonutChart';
import { BarChart } from '@/components/charts/BarChart';
import { SERIES, categoricalColor } from '@/components/charts/chartTheme';
import {
  getExpenseView,
  type ExpenseRow,
  type ExpenseView,
  type FundSpendRow,
} from '@/lib/investorFinanceApi';
import { downloadExpenseAttachment } from '@/lib/commitmentApi';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr } from '@/lib/format';

/**
 * ============================================================================
 *  5. EXPENSE DASHBOARD
 * ============================================================================
 *
 * The cost side of the profit calculation, with its approval state visible.
 *
 * Only APPROVED and PAID costs are counted. Showing the pending figure
 * separately is deliberate: an investor should be able to see what is coming
 * without it having already been deducted from the profit they are owed.
 * ============================================================================
 */

export default function InvestorExpenses() {
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });

  const { data, loading, error, reload } = useInvestorData<ExpenseView>(
    () => getExpenseView(range),
    [range.from, range.to],
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Company performance"
        title="Business expenses"
        subtitle="What it costs to run Esscentra. Deducted from revenue to give net profit."
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
              icon={Wallet}
              label="Total expenses"
              value={data.totals.totalExpenses}
              format={inr}
              hint={`${data.totals.recognisedCount} recognised item${
                data.totals.recognisedCount === 1 ? '' : 's'
              }`}
              tone="rose"
            />
            <FinanceCard
              icon={CheckCircle2}
              label="Paid"
              value={data.totals.paidAmount}
              format={inr}
              hint="Settled with the vendor"
              tone="green"
            />
            <FinanceCard
              icon={Clock}
              label="Approved, unpaid"
              value={data.totals.unpaidApprovedAmount}
              format={inr}
              hint="Counted in profit, not yet settled"
              tone="sky"
            />
            <FinanceCard
              icon={Receipt}
              label="Awaiting approval"
              value={data.totals.pendingAmount}
              format={inr}
              hint={`${data.totals.pendingCount} item${
                data.totals.pendingCount === 1 ? '' : 's'
              } — not in profit yet`}
              tone="amber"
            />
          </div>

          {/*
            Costs reach the P&L from three modules. Naming them keeps the
            headline reconcilable — an investor can see why the total is larger
            than the expense ledger alone.
          */}
          {(data.totals.vendorBillAmount > 0 ||
            data.totals.contractorPaymentAmount > 0) && (
            <div className="glass-card flex flex-wrap gap-x-10 gap-y-4 p-5">
              <SourceFigure
                label="Recorded expenses"
                value={data.totals.businessExpenseAmount}
              />
              <SourceFigure label="Vendor bills" value={data.totals.vendorBillAmount} />
              <SourceFigure
                label="Contractor payments"
                value={data.totals.contractorPaymentAmount}
              />
            </div>
          )}

          {data.totals.pendingAmount > 0 && (
            <InfoNote tone="info">
              {inr(data.totals.pendingAmount)} of costs is still awaiting approval or
              release and has <strong>not</strong> been deducted from profit. Net profit
              will fall by that amount once all of it is approved and paid.
            </InfoNote>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            <ChartFrame
              title="Expenses by category"
              subtitle="Share of approved spend in this period"
              isEmpty={data.byCategory.length === 0}
            >
              <DonutChart
                slices={data.byCategory.map((category, index) => ({
                  label: category.label,
                  value: category.total,
                  color: categoricalColor(index),
                }))}
                formatValue={inr}
                centerLabel="Expenses"
              />
            </ChartFrame>

            <ChartFrame
              title="Spend per category"
              subtitle="Approved spend, largest first"
              isEmpty={data.byCategory.length === 0}
            >
              <BarChart
                categories={data.byCategory.map((category) => category.label)}
                series={[
                  {
                    key: 'spend',
                    label: 'Spend',
                    color: SERIES.expenses,
                    values: data.byCategory.map((category) => category.total),
                  },
                ]}
              />
            </ChartFrame>
          </div>

          <Section
            title="Expense records"
            description="Only approved and paid expenses reduce net profit."
          >
            <FinanceTable<ExpenseRow>
              rows={data.rows}
              rowKey={(row) => row.id}
              emptyTitle="No expenses in this period"
              emptyMessage="Business costs recorded by the admin team will appear here."
              maxHeight={620}
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  render: (row) => (
                    <span className="whitespace-nowrap text-slate-300">
                      {formatDate(row.spentAt)}
                    </span>
                  ),
                },
                {
                  key: 'category',
                  header: 'Category',
                  render: (row) => <Pill tone="blue">{humanize(row.category)}</Pill>,
                },
                {
                  key: 'description',
                  header: 'Description',
                  render: (row) => (
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-slate-200">
                        {row.description}
                        {row.isRecurring && (
                          <Repeat
                            className="h-3.5 w-3.5 shrink-0 text-brand-300"
                            aria-label="Recurring cost"
                          />
                        )}
                      </p>
                      {row.vendor && (
                        <p className="truncate text-xs text-slate-500">{row.vendor}</p>
                      )}
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
                  key: 'approver',
                  header: 'Approved by',
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="text-slate-400">{row.approvedByName ?? '—'}</span>
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
                  <TotalCell numeric={false} colSpan={3}>
                    Total expenses
                  </TotalCell>
                  <TotalCell>{inr(data.totals.totalExpenses)}</TotalCell>
                  <TotalCell numeric={false} hideOnMobile>
                    <span />
                  </TotalCell>
                  <TotalCell numeric={false}>
                    <span />
                  </TotalCell>
                </>
              }
            />
          </Section>

          {data.fundSpend && data.fundSpend.rows.length > 0 && (
            <Section
              title="Spent from your investment funds"
              description="How money from your commitments was used, recorded by the admin team with proof files. Shown for transparency — this is capital deployment, not an operating cost, so it is not deducted from net profit."
            >
              <FinanceTable<FundSpendRow>
                rows={data.fundSpend.rows}
                rowKey={(row) => row.id}
                emptyTitle="No fund spend recorded"
                emptyMessage="Money spent from your commitments will appear here."
                maxHeight={480}
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
                    render: (row) => (
                      <span className="whitespace-nowrap text-slate-300">
                        {formatDate(row.spentAt)}
                      </span>
                    ),
                  },
                  {
                    key: 'category',
                    header: 'Category',
                    render: (row) => <Pill tone="blue">{humanize(row.category)}</Pill>,
                  },
                  {
                    key: 'description',
                    header: 'Description',
                    render: (row) => (
                      <div className="min-w-0">
                        <p className="truncate text-slate-200">{row.description || '—'}</p>
                        {row.commitmentTitle && (
                          <p className="truncate text-xs text-slate-500">
                            {row.commitmentTitle}
                          </p>
                        )}
                        {row.attachments.length > 0 && (
                          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            {row.attachments.map((file, index) =>
                              file.unavailable ? (
                                <span
                                  key={index}
                                  className="text-[11px] text-slate-600 line-through"
                                  title="File no longer stored"
                                >
                                  {file.originalName ?? `proof-${index + 1}`}
                                </span>
                              ) : (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() =>
                                    void downloadExpenseAttachment(
                                      row.id,
                                      index,
                                      file.originalName ?? `proof-${index + 1}`,
                                    )
                                  }
                                  className="text-[11px] text-brand-300 underline-offset-2 hover:underline"
                                >
                                  {file.originalName ?? `proof-${index + 1}`}
                                </button>
                              ),
                            )}
                          </p>
                        )}
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
                ]}
                footer={
                  <>
                    <TotalCell numeric={false} colSpan={3}>
                      Total spent from your funds
                    </TotalCell>
                    <TotalCell>{inr(data.fundSpend.totals.total)}</TotalCell>
                  </>
                }
              />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/** One source's contribution to the recognised total. */
function SourceFigure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{inr(value)}</p>
    </div>
  );
}
