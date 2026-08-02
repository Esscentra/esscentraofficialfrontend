import { Building2, PieChart, Target, TrendingUp, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { CardGridSkeleton, ChartSkeleton, ErrorState } from '@/components/finance/States';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { LineChart } from '@/components/charts/LineChart';
import { SERIES } from '@/components/charts/chartTheme';
import { getShareValue, type ShareValueView } from '@/lib/investorFinanceApi';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr, inrExact, percent } from '@/lib/format';

/**
 * ============================================================================
 *  10. SHARE VALUE
 * ============================================================================
 *
 *      Investor value = Fully-funded valuation × Ownership %
 *
 * A single formula, given its own page because it is the number an investor
 * checks most often and the one that changes without them doing anything. It
 * moves when the company is re-valued and when they pay in more capital, and
 * nothing here is stored — it is recomputed from live valuation and ownership
 * on every load, so it cannot go stale.
 * ============================================================================
 */

export default function InvestorShareValue() {
  const { data, loading, error, reload } = useInvestorData<ShareValueView>(
    () => getShareValue(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Equity" title="Share value" />
        <CardGridSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Equity" title="Share value" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const isUp = data.gain >= 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Equity"
        title="Share value"
        subtitle="What your stake is worth right now. Updates automatically whenever the valuation changes."
      />

      {/* ------------------------------ the headline ----------------------------- */}
      <section className="glass-card relative overflow-hidden p-7 text-center">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{ background: 'rgba(16, 185, 129, 0.35)' }}
          aria-hidden
        />

        <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Your stake is worth
        </p>
        <p className="relative mt-3 font-display text-[3rem] font-bold leading-none tracking-tight tabular-nums text-white">
          {inr(data.investorValue)}
        </p>
        <p className="relative mt-4 text-sm text-slate-400">
          {percent(data.ownershipPercent)} of {inr(data.fullyFundedValuation)}
          {data.effectiveDate && (
            <>
              {' '}· valued {formatDate(data.effectiveDate)}
              {data.method ? ` by ${humanize(data.method).toLowerCase()}` : ''}
            </>
          )}
        </p>

        <div
          className={`relative mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
            isUp
              ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/25'
              : 'bg-rose-500/12 text-rose-300 ring-rose-500/25'
          }`}
        >
          <TrendingUp className={`h-4 w-4 ${isUp ? '' : 'rotate-180'}`} />
          {isUp ? '+' : ''}
          {inrExact(data.gain)} against {inr(data.investmentReceived)} paid in
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={Building2}
          label="Fully-funded valuation"
          value={data.fullyFundedValuation}
          format={inr}
          hint={data.method ? humanize(data.method) : 'Opening valuation'}
          tone="sky"
        />
        <FinanceCard
          icon={PieChart}
          label="Your ownership"
          value={data.ownershipPercent}
          format={(value) => percent(value)}
          hint={`Agreed: ${percent(data.agreedOwnershipPercent, 2)}`}
          tone="violet"
        />
        <FinanceCard
          icon={Trophy}
          label="Your value"
          value={data.investorValue}
          format={inr}
          hint="Fully-funded valuation × ownership"
          tone="green"
        />
        <FinanceCard
          icon={Target}
          label="At full ownership"
          value={data.investorValueAtFullOwnership}
          format={inr}
          hint={`If you fund the full commitment`}
          tone="amber"
        />
      </div>

      {/* ------------------------------- the formula ----------------------------- */}
      <section className="glass-card p-5">
        <h2 className="text-sm font-semibold tracking-tight text-white">The formula</h2>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="font-display text-base text-slate-200">
            Investor value = Company valuation × Ownership %
          </p>
          <p className="mt-3 text-sm tabular-nums text-slate-400">
            {inr(data.fullyFundedValuation)} × {percent(data.ownershipPercent)} ={' '}
            <span className="font-semibold text-white">{inrExact(data.investorValue)}</span>
          </p>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          This figure is recalculated from the live valuation and your current ownership
          every time the page loads. It is never stored, so it cannot fall out of step
          with either input.
        </p>
      </section>

      {/* -------------------------------- the trend ------------------------------ */}
      <ChartFrame
        title="Your stake over time"
        subtitle="Value at each recorded valuation event"
        isEmpty={data.trend.length < 2}
        emptyMessage="At least two valuation events are needed to draw a trend."
        legend={[
          { label: 'Company valuation', color: SERIES.valuation },
          { label: 'Your share value', color: SERIES.netProfit },
        ]}
      >
        <LineChart
          categories={data.trend.map((point) => formatDate(point.effectiveDate))}
          series={[
            {
              key: 'company',
              label: 'Company valuation',
              color: SERIES.valuation,
              values: data.trend.map((point) => point.companyValuation),
            },
            {
              key: 'investor',
              label: 'Your share value',
              color: SERIES.netProfit,
              values: data.trend.map((point) => point.investorValue),
              area: true,
            },
          ]}
        />
      </ChartFrame>
    </div>
  );
}
