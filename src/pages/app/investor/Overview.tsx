import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Coins,
  HandCoins,
  IndianRupee,
  PiggyBank,
  PieChart,
  Receipt,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { CardGridSkeleton, ChartSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { ProgressBar } from '@/components/charts/CircularProgress';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import { SERIES } from '@/components/charts/chartTheme';
import { useAuth } from '@/context/AuthContext';
import {
  getInvestorOverview,
  getMonthlySeries,
  type InvestorOverview,
  type MonthlySeries,
} from '@/lib/investorFinanceApi';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr, inrCompact, percent, percentShort } from '@/lib/format';

/**
 * ============================================================================
 *  1. DASHBOARD OVERVIEW
 * ============================================================================
 *
 * The one screen an investor opens if they only open one. Nine KPI cards, the
 * funding position, and the two charts that answer "is this working?".
 *
 * Every figure here comes from a single `/overview` call rather than nine, so
 * the cards can never contradict each other mid-render.
 * ============================================================================
 */

/**
 * Month-on-month change for a metric, used for the trend chips.
 * Returns null when the previous month was zero — a jump from nothing is an
 * infinite percentage, and "∞%" on a KPI card is noise, not information.
 */
function monthOnMonth(
  series: MonthlySeries | null,
  pick: (point: MonthlySeries['points'][number]) => number,
): number | null {
  const points = series?.points ?? [];
  if (points.length < 2) return null;

  const current = pick(points[points.length - 1]!);
  const previous = pick(points[points.length - 2]!);

  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function InvestorOverview() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  const overview = useInvestorData<InvestorOverview>(() => getInvestorOverview(), []);
  const series = useInvestorData<MonthlySeries>(() => getMonthlySeries(12), []);

  if (overview.loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Investor dashboard"
          title={`Welcome back, ${firstName}`}
          subtitle="Loading your position…"
        />
        <CardGridSkeleton count={8} />
        <ChartSkeleton />
      </div>
    );
  }

  if (overview.error || !overview.data) {
    return (
      <div>
        <PageHeader eyebrow="Investor dashboard" title={`Welcome back, ${firstName}`} />
        <ErrorState
          message={overview.error ?? 'No data was returned.'}
          onRetry={overview.reload}
        />
      </div>
    );
  }

  const d = overview.data;
  const points = series.data?.points ?? [];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Investor dashboard"
        title={`Welcome back, ${firstName}`}
        subtitle={
          d.hasCommitment
            ? `You hold ${percent(d.currentOwnershipPercent)} of Esscentra, worth ${inr(
                d.investorShareValue,
              )} at the current valuation.`
            : 'Your investment position will appear here once a commitment is recorded.'
        }
      />

      {!d.hasCommitment && (
        <InfoNote tone="info" icon={HandCoins}>
          No investment commitment has been recorded against your account yet. Once the
          admin team adds one, your ownership, share value and profit share will start
          tracking here automatically.
        </InfoNote>
      )}

      {d.valuationIsDefault && d.hasCommitment && (
        <InfoNote tone="warning">
          No company valuation has been recorded yet, so share value is being shown
          against the opening pre-money figure. It will update the moment a valuation is
          entered.
        </InfoNote>
      )}

      {/* ------------------------------ KPI row ------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FinanceCard
          icon={Wallet}
          label="Investment received"
          value={d.investmentReceived}
          format={inr}
          hint={`of ${inr(d.committedInvestment)} committed`}
          tone="brand"
          progress={d.investmentProgressPercent}
        />

        <FinanceCard
          icon={Target}
          label="Remaining investment"
          value={d.remainingInvestment}
          format={inr}
          hint={
            d.isFullyFunded
              ? 'Commitment fully funded'
              : `${percent(100 - d.investmentProgressPercent, 2)} still to pay`
          }
          tone={d.isFullyFunded ? 'green' : 'amber'}
        />

        <FinanceCard
          icon={Receipt}
          label="Spent from your capital"
          value={d.capitalSpent}
          format={inr}
          hint={`${percent(d.capitalUtilisationPercent, 1)} of what you have paid in`}
          tone="rose"
          progress={d.capitalUtilisationPercent}
        />

        <FinanceCard
          icon={PiggyBank}
          label="Balance available"
          value={d.capitalBalance}
          format={inr}
          hint="Paid in, not yet spent"
          tone={d.capitalBalance < 0 ? 'rose' : 'green'}
        />

        <FinanceCard
          icon={PieChart}
          label="Current ownership"
          value={d.currentOwnershipPercent}
          format={(value) => percent(value)}
          hint={`Vesting toward ${percent(d.agreedOwnershipPercent, 2)}`}
          tone="violet"
          progress={
            d.agreedOwnershipPercent > 0
              ? (d.currentOwnershipPercent / d.agreedOwnershipPercent) * 100
              : 0
          }
        />

        <FinanceCard
          icon={Building2}
          label="Company valuation"
          value={d.companyValuation}
          format={inr}
          hint={
            d.valuationEffectiveDate
              ? `${humanize(d.valuationMethod)} · ${formatDate(d.valuationEffectiveDate)}`
              : 'Opening valuation'
          }
          tone="sky"
        />

        <FinanceCard
          icon={Coins}
          label="Post-money valuation"
          value={d.postMoneyValuation}
          format={inr}
          hint={`${inr(d.preMoneyValuation)} pre-money + capital in`}
          tone="teal"
        />

        <FinanceCard
          icon={Trophy}
          label="Your share value"
          value={d.investorShareValue}
          format={inr}
          hint={`${percent(d.currentOwnershipPercent)} of ${inrCompact(d.fullyFundedValuation)}`}
          tone="green"
        />

        <FinanceCard
          icon={HandCoins}
          label="Total profit received"
          value={d.totalProfitReceived}
          format={inr}
          hint={
            d.profitAwaitingPayment > 0
              ? `${inr(d.profitAwaitingPayment)} approved, awaiting payment`
              : d.lastPaidAt
                ? `Last paid ${formatDate(d.lastPaidAt)}`
                : 'No distributions paid yet'
          }
          tone="amber"
        />

        <FinanceCard
          icon={IndianRupee}
          label={`Profit share — ${d.monthLabel}`}
          value={d.monthlyProfit}
          format={inr}
          hint={`${percent(d.currentOwnershipPercent)} of ${inr(d.monthlyNetProfit)} net profit`}
          tone="brand"
          trend={{
            changePercent: monthOnMonth(series.data, (p) => p.investorProfit),
            label: 'vs last month',
          }}
        />

        <FinanceCard
          icon={TrendingUp}
          label="Return on investment"
          value={d.roiPercent === null ? '—' : d.roiPercent}
          format={percentShort}
          hint={
            d.multiple !== null
              ? `${d.multiple}× on capital · ${inr(d.unrealisedGain)} unrealised`
              : 'Awaiting your first payment'
          }
          tone={d.roiPercent !== null && d.roiPercent >= 0 ? 'green' : 'rose'}
        />
      </div>

      {/* --------------------------- funding position -------------------------- */}
      {d.hasCommitment && (
        <section className="glass-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white">
                Funding position
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Ownership unlocks in proportion to the capital received, capped at{' '}
                {percent(d.agreedOwnershipPercent, 2)}.
              </p>
            </div>
            <Link
              to="/app/investor/equity"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 transition hover:text-brand-200"
            >
              Equity progress
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-xs text-slate-400">Capital paid in</span>
                <span className="text-xs font-semibold tabular-nums text-slate-200">
                  {inr(d.investmentReceived)} / {inr(d.committedInvestment)}
                </span>
              </div>
              <ProgressBar value={d.investmentProgressPercent} showLabel />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-xs text-slate-400">Ownership earned</span>
                <span className="text-xs font-semibold tabular-nums text-slate-200">
                  {percent(d.currentOwnershipPercent)} / {percent(d.agreedOwnershipPercent, 2)}
                </span>
              </div>
              <ProgressBar
                value={
                  d.agreedOwnershipPercent > 0
                    ? (d.currentOwnershipPercent / d.agreedOwnershipPercent) * 100
                    : 0
                }
                color="#a78bfa"
                showLabel
              />
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------- charts ------------------------------- */}
      {series.loading ? (
        <ChartSkeleton />
      ) : series.error ? (
        <ErrorState message={series.error} onRetry={series.reload} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartFrame
            title="Revenue vs expenses"
            subtitle="Last 12 months, cash basis"
            isEmpty={points.every((p) => p.revenue === 0 && p.expenses === 0)}
            legend={[
              { label: 'Revenue', color: SERIES.revenue, value: inrCompact(series.data?.totals.revenue ?? 0) },
              { label: 'Expenses', color: SERIES.expenses, value: inrCompact(series.data?.totals.expenses ?? 0) },
            ]}
          >
            <BarChart
              categories={points.map((p) => p.label.split(' ')[0] ?? p.label)}
              series={[
                { key: 'revenue', label: 'Revenue', color: SERIES.revenue, values: points.map((p) => p.revenue) },
                { key: 'expenses', label: 'Expenses', color: SERIES.expenses, values: points.map((p) => p.expenses) },
              ]}
            />
          </ChartFrame>

          <ChartFrame
            title="Net profit and your share"
            subtitle="Your share is calculated at the ownership you held each month"
            isEmpty={points.every((p) => p.netProfit === 0)}
            legend={[
              { label: 'Net profit', color: SERIES.netProfit, value: inrCompact(series.data?.totals.netProfit ?? 0) },
              {
                label: 'Your share',
                color: SERIES.investorProfit,
                value: inrCompact(series.data?.totals.investorProfit ?? 0),
              },
            ]}
          >
            <LineChart
              categories={points.map((p) => p.label.split(' ')[0] ?? p.label)}
              series={[
                {
                  key: 'net',
                  label: 'Net profit',
                  color: SERIES.netProfit,
                  values: points.map((p) => p.netProfit),
                  area: true,
                },
                {
                  key: 'investor',
                  label: 'Your share',
                  color: SERIES.investorProfit,
                  values: points.map((p) => p.investorProfit),
                },
              ]}
            />
          </ChartFrame>
        </div>
      )}

      {/* ------------------------------ quick links ----------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[
          { to: '/app/investor/timeline', label: 'Investment timeline', icon: CalendarClock, hint: 'Every payment and the equity it bought' },
          { to: '/app/investor/profit', label: 'Profit dashboard', icon: IndianRupee, hint: 'Revenue, costs and your cut' },
          { to: '/app/investor/reports', label: 'Monthly reports', icon: TrendingUp, hint: 'Charts and exports' },
          { to: '/app/investor/fund-usage', label: 'Fund usage', icon: Receipt, hint: 'Every rupee spent, with the bill attached' },
          { to: '/app/investor/documents', label: 'Documents', icon: Building2, hint: 'Agreement, certificates, receipts' },
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
