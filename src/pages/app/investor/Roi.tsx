import { Calculator, Coins, HandCoins, Target, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { InfoNote, CardGridSkeleton, ErrorState } from '@/components/finance/States';
import { CircularProgress } from '@/components/charts/CircularProgress';
import { getRoiView, type RoiView } from '@/lib/investorFinanceApi';
import { useInvestorData } from './useInvestorData';
import { inr, inrExact, percent, percentShort } from '@/lib/format';

/**
 * ============================================================================
 *  8. ROI CALCULATOR
 * ============================================================================
 *
 * Two ROI figures are shown, deliberately.
 *
 *  - "Return on stake" is the spec's formula: (current value − investment) /
 *    investment. It measures paper appreciation only.
 *
 *  - "Total return" adds the profit already banked. A CFO quotes this one,
 *    because cash the investor has actually received is a real return that the
 *    first formula silently ignores.
 *
 * Showing only the first would understate the position for anyone who has
 * taken distributions; showing only the second would not match the term sheet.
 * ============================================================================
 */

export default function InvestorRoi() {
  const { data, loading, error, reload } = useInvestorData<RoiView>(() => getRoiView(), []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Returns" title="ROI calculator" />
        <CardGridSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Returns" title="ROI calculator" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const hasInvestment = data.totalInvestment > 0;
  const isPositive = (data.roiPercent ?? 0) >= 0;

  // The dial reads 0% at break-even and fills toward a 5× outcome, so a
  // healthy-but-not-spectacular return still shows visible movement.
  const dialValue = Math.min(100, Math.max(0, ((data.multiple ?? 0) / 5) * 100));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Returns"
        title="ROI calculator"
        subtitle="What your capital has become, on paper and in cash."
      />

      {!hasInvestment && (
        <InfoNote tone="info" icon={Calculator}>
          Return on investment cannot be calculated until capital has been paid in. Once
          your first payment is recorded, this page will populate automatically.
        </InfoNote>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={Wallet}
          label="Total investment"
          value={data.totalInvestment}
          format={inr}
          hint={`of ${inr(data.committedInvestment)} committed`}
          tone="brand"
        />
        <FinanceCard
          icon={Coins}
          label="Current share value"
          value={data.currentShareValue}
          format={inr}
          hint={`${percent(data.ownershipPercent)} of ${inr(data.fullyFundedValuation)}`}
          tone="sky"
        />
        <FinanceCard
          icon={HandCoins}
          label="Profit received"
          value={data.profitReceived}
          format={inr}
          hint="Distributions paid to you"
          tone="amber"
        />
        <FinanceCard
          icon={TrendingUp}
          label="Return on stake"
          value={data.roiPercent === null ? '—' : data.roiPercent}
          format={percentShort}
          hint={data.multiple !== null ? `${data.multiple}× on capital` : 'No capital in yet'}
          tone={isPositive ? 'green' : 'rose'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ------------------------------ the dial ----------------------------- */}
        <section className="glass-card flex flex-col items-center justify-center gap-4 p-6 lg:col-span-2">
          <CircularProgress
            value={dialValue}
            size={190}
            color={isPositive ? '#22c08a' : '#fb7185'}
            valueLabel={data.multiple !== null ? `${data.multiple}×` : '—'}
            caption="on capital"
            label="Return multiple"
          />
          <p className="max-w-[16rem] text-center text-xs leading-relaxed text-slate-500">
            The dial fills toward a 5× outcome. Your stake is currently worth{' '}
            {inr(data.currentShareValue)} against {inr(data.totalInvestment)} paid in.
          </p>
        </section>

        {/* ---------------------------- the workings --------------------------- */}
        <section className="glass-card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold tracking-tight text-white">The calculation</h2>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Return on stake
              </p>
              <p className="mt-2 font-display text-sm text-slate-300">
                (Current value − Investment) ÷ Investment × 100
              </p>
              <p className="mt-2 text-sm tabular-nums text-slate-400">
                ({inr(data.currentShareValue)} − {inr(data.totalInvestment)}) ÷{' '}
                {inr(data.totalInvestment)} × 100 ={' '}
                <span
                  className={`font-semibold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}
                >
                  {percentShort(data.roiPercent)}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300/80">
                Total return — including cash received
              </p>
              <p className="mt-2 font-display text-sm text-slate-300">
                (Current value + Profit received − Investment) ÷ Investment × 100
              </p>
              <p className="mt-2 text-sm tabular-nums text-slate-400">
                ({inr(data.currentShareValue)} + {inr(data.profitReceived)} −{' '}
                {inr(data.totalInvestment)}) ÷ {inr(data.totalInvestment)} × 100 ={' '}
                <span className="font-semibold text-brand-200">
                  {percentShort(data.totalReturnPercent)}
                </span>
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Unrealised gain</dt>
                <dd
                  className={`mt-1 font-semibold tabular-nums ${
                    data.unrealisedGain >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {inrExact(data.unrealisedGain)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Cash received</dt>
                <dd className="mt-1 font-semibold tabular-nums text-amber-300">
                  {inrExact(data.profitReceived)}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      {/* --------------------------- projected position -------------------------- */}
      {data.ownershipPercent < data.agreedOwnershipPercent && (
        <section className="glass-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            <Target className="h-4 w-4 text-brand-300" />
            If you complete your commitment
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            At today&rsquo;s round price of {inr(data.fullyFundedValuation)}, funding the full{' '}
            {inr(data.committedInvestment)} would take you to{' '}
            {percent(data.agreedOwnershipPercent, 2)} ownership.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ProjectionTile
              label="Capital in"
              value={inr(data.projected.investment)}
              delta={`+${inr(data.projected.investment - data.totalInvestment)}`}
            />
            <ProjectionTile
              label="Share value"
              value={inr(data.projected.shareValue)}
              delta={`+${inr(data.projected.shareValue - data.currentShareValue)}`}
              positive
            />
            <ProjectionTile
              label="Return on stake"
              value={percentShort(data.projected.roiPercent)}
              delta={
                data.projected.multiple !== null ? `${data.projected.multiple}× on capital` : '—'
              }
              positive={(data.projected.roiPercent ?? 0) >= 0}
            />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            A projection at the current valuation, not a forecast. Company valuation
            changes only on a new investment, an acquisition, a mutual agreement or an
            independent valuation.
          </p>
        </section>
      )}
    </div>
  );
}

function ProjectionTile({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-bold tabular-nums text-white">{value}</p>
      <p
        className={`mt-1 text-xs tabular-nums ${
          positive ? 'text-emerald-300' : 'text-slate-400'
        }`}
      >
        {delta}
      </p>
    </div>
  );
}
