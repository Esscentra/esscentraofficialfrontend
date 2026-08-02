import { useState } from 'react';
import { ArrowRight, HandCoins, IndianRupee, PieChart, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { RangeFilter, type DateRange } from '@/components/finance/Controls';
import { CardGridSkeleton, ChartSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { SERIES } from '@/components/charts/chartTheme';
import {
  getMonthlySeries,
  getProfitView,
  type MonthlySeries,
  type ProfitView,
} from '@/lib/investorFinanceApi';
import { useInvestorData } from './useInvestorData';
import { inr, inrCompact, inrExact, percent, percentShort } from '@/lib/format';

/**
 * ============================================================================
 *  6. PROFIT DASHBOARD
 * ============================================================================
 *
 * The whole chain in one place: revenue, minus expenses, gives net profit;
 * net profit times CURRENT ownership gives the investor's share; the rest goes
 * to the founders.
 *
 * The emphasis on "current" is the important part. Paying the headline 10% to
 * an investor who has funded 16.5% of their commitment would be handing over
 * founder equity value for free — so the page shows the working, and shows
 * what the same profit would pay once the commitment is complete.
 * ============================================================================
 */

export default function InvestorProfit() {
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });

  const profit = useInvestorData<ProfitView>(
    () => getProfitView(range),
    [range.from, range.to],
  );
  const series = useInvestorData<MonthlySeries>(() => getMonthlySeries(12), []);

  const points = series.data?.points ?? [];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Company performance"
        title="Profit"
        subtitle="Revenue less expenses, and how the result is split between you and the founders."
      />

      <RangeFilter range={range} onChange={setRange} />

      {profit.loading ? (
        <>
          <CardGridSkeleton count={5} />
          <ChartSkeleton />
        </>
      ) : profit.error || !profit.data ? (
        <ErrorState message={profit.error ?? 'No data was returned.'} onRetry={profit.reload} />
      ) : (
        <>
          {profit.data.isLoss && (
            <InfoNote tone="warning" icon={TrendingDown}>
              This period ran at a loss of {inr(Math.abs(profit.data.netProfit))}. Profit
              share is a distribution, not a capital call — your share for a loss-making
              period is nil, and the founders absorb the shortfall.
            </InfoNote>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <FinanceCard
              icon={IndianRupee}
              label="Revenue"
              value={profit.data.revenue}
              format={inr}
              hint="Received from clients"
              tone="brand"
            />
            <FinanceCard
              icon={TrendingDown}
              label="Expenses"
              value={profit.data.expenses}
              format={inr}
              hint="Approved business costs"
              tone="rose"
            />
            <FinanceCard
              icon={TrendingUp}
              label="Net profit"
              value={profit.data.netProfit}
              format={inr}
              hint={
                profit.data.netMarginPercent !== null
                  ? `${percentShort(profit.data.netMarginPercent)} margin`
                  : 'No revenue in this period'
              }
              tone={profit.data.isLoss ? 'rose' : 'green'}
            />
            <FinanceCard
              icon={HandCoins}
              label="Your profit share"
              value={profit.data.investorProfit}
              format={inr}
              hint={`at ${percent(profit.data.ownershipPercent)} ownership`}
              tone="violet"
            />
            <FinanceCard
              icon={Users}
              label="Founder profit"
              value={profit.data.founderProfit}
              format={inr}
              hint="Remaining after your share"
              tone="sky"
            />
          </div>

          {/* --------------------------- the calculation --------------------------- */}
          <section className="glass-card p-5">
            <h2 className="text-sm font-semibold tracking-tight text-white">
              How your share is calculated
            </h2>

            <div className="mt-4 space-y-3">
              <CalcRow
                label="Revenue received"
                value={inr(profit.data.revenue)}
                tone="text-slate-200"
              />
              <CalcRow
                label="Less: approved business expenses"
                value={`− ${inr(profit.data.expenses)}`}
                tone="text-rose-300"
              />
              <div className="border-t border-white/10 pt-3">
                <CalcRow
                  label="Net profit"
                  value={inr(profit.data.netProfit)}
                  tone={profit.data.isLoss ? 'text-rose-300' : 'text-emerald-300'}
                  strong
                />
              </div>
              <CalcRow
                label={`Your current ownership`}
                value={percent(profit.data.ownershipPercent)}
                tone="text-violet-300"
              />
              <div className="border-t border-white/10 pt-3">
                <CalcRow
                  label="Your profit share"
                  value={inrExact(profit.data.investorProfit)}
                  tone="text-white"
                  strong
                />
              </div>
            </div>

            {profit.data.ownershipPercent < profit.data.agreedOwnershipPercent && (
              <div className="mt-5 rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-4">
                <p className="text-sm text-brand-100">
                  At your agreed {percent(profit.data.agreedOwnershipPercent, 2)} ownership,
                  the same profit would pay you{' '}
                  <strong className="tabular-nums">
                    {inr(profit.data.investorProfitAtFullOwnership)}
                  </strong>
                  .
                </p>
                <Link
                  to="/app/investor/equity"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 transition hover:text-brand-200"
                >
                  See what is left to fund
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>

          <div className="grid gap-5 xl:grid-cols-5">
            <ChartFrame
              title="Profit split"
              subtitle="How this period's net profit divides"
              isEmpty={profit.data.netProfit <= 0}
              emptyMessage={
                profit.data.isLoss
                  ? 'There is no profit to split for this period.'
                  : 'No profit recorded for this period yet.'
              }
              className="xl:col-span-2"
            >
              <DonutChart
                slices={[
                  {
                    label: 'Your share',
                    value: profit.data.investorProfit,
                    color: SERIES.investorProfit,
                  },
                  {
                    label: 'Founders',
                    value: profit.data.founderProfit,
                    color: SERIES.founderProfit,
                  },
                ]}
                formatValue={inr}
                centerLabel="Net profit"
              />
            </ChartFrame>

            <ChartFrame
              title="Monthly profit"
              subtitle="Net profit and your share, month by month"
              isEmpty={points.every((point) => point.netProfit === 0)}
              className="xl:col-span-3"
              legend={[
                { label: 'Net profit', color: SERIES.netProfit },
                { label: 'Your share', color: SERIES.investorProfit },
              ]}
            >
              <BarChart
                categories={points.map((point) => point.label.split(' ')[0] ?? point.label)}
                series={[
                  {
                    key: 'net',
                    label: 'Net profit',
                    color: SERIES.netProfit,
                    values: points.map((point) => point.netProfit),
                  },
                  {
                    key: 'investor',
                    label: 'Your share',
                    color: SERIES.investorProfit,
                    values: points.map((point) => point.investorProfit),
                  },
                ]}
                formatValue={inrCompact}
              />
            </ChartFrame>
          </div>

          {/* ---------------------------- what you got ---------------------------- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FinanceCard
              icon={HandCoins}
              label="Profit paid to you"
              value={profit.data.totalProfitReceived}
              format={inr}
              hint="Distributions actually settled, all time"
              tone="green"
              footer={
                <Link
                  to="/app/investor/payments"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 transition hover:text-brand-200"
                >
                  Payment history
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <FinanceCard
              icon={PieChart}
              label="Approved, awaiting payment"
              value={profit.data.profitAwaitingPayment}
              format={inr}
              hint="Declared but not yet transferred"
              tone="amber"
            />
          </div>
        </>
      )}
    </div>
  );
}

/** One line of the profit working, label left, figure right. */
function CalcRow({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`text-sm ${strong ? 'font-semibold text-white' : 'text-slate-400'}`}>
        {label}
      </span>
      <span
        className={`shrink-0 tabular-nums ${tone} ${
          strong ? 'font-display text-lg font-bold' : 'text-sm font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
