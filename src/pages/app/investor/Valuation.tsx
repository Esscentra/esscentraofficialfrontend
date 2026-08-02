import { Building2, Coins, Layers, PieChart, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ChartSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { LineChart } from '@/components/charts/LineChart';
import { SERIES } from '@/components/charts/chartTheme';
import {
  getValuationView,
  type ValuationPoint,
  type ValuationView,
} from '@/lib/investorFinanceApi';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr, inrCompact, percent } from '@/lib/format';

/**
 * ============================================================================
 *  3. COMPANY VALUATION
 * ============================================================================
 *
 * Valuation is the number that decides what a stake is worth, so this page
 * leads with the thing investors most often get wrong: revenue does not set
 * valuation. An arm's-length event does — a round, an acquisition, a mutual
 * agreement, or an independent assessment.
 * ============================================================================
 */

const METHOD_TONE: Record<string, 'blue' | 'green' | 'violet' | 'amber'> = {
  NEW_INVESTMENT: 'blue',
  ACQUISITION: 'green',
  MUTUAL_AGREEMENT: 'amber',
  INDEPENDENT_VALUATION: 'violet',
};

export default function InvestorValuation() {
  const { data, loading, error, reload } = useInvestorData<ValuationView>(
    () => getValuationView(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Company" title="Company valuation" />
        <CardGridSkeleton count={5} />
        <ChartSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Company" title="Company valuation" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const history = data.history;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Company"
        title="Company valuation"
        subtitle="What Esscentra is worth, and what your stake is worth inside it."
      />

      {data.isDefault && (
        <InfoNote tone="warning">
          No valuation event has been recorded yet. Figures below use the opening
          pre-money valuation of {inr(data.preMoneyValuation)} from the term sheet.
        </InfoNote>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FinanceCard
          icon={Layers}
          label="Pre-money valuation"
          value={data.preMoneyValuation}
          format={inr}
          hint="Before capital in"
          tone="sky"
        />
        <FinanceCard
          icon={Coins}
          label="Post-money valuation"
          value={data.postMoneyValuation}
          format={inr}
          hint={`+ ${inr(data.totalInvestmentReceived)} capital received`}
          tone="teal"
        />
        <FinanceCard
          icon={Building2}
          label="Fully-funded valuation"
          value={data.fullyFundedValuation}
          format={inr}
          hint={`+ ${inr(data.committedCapital)} committed · sets the share price`}
          tone="brand"
        />
        <FinanceCard
          icon={PieChart}
          label="Your ownership"
          value={data.ownershipPercent}
          format={(value) => percent(value)}
          hint={`vesting toward ${percent(data.agreedOwnershipPercent, 2)}`}
          tone="violet"
        />
        <FinanceCard
          icon={Trophy}
          label="Your share value"
          value={data.investorShareValue}
          format={inr}
          hint={`${percent(data.ownershipPercent)} × ${inrCompact(data.fullyFundedValuation)}`}
          tone="green"
        />
        <FinanceCard
          icon={Coins}
          label="Gain on your capital"
          value={data.investorShareValue - data.investorInvestment}
          format={inr}
          hint={
            data.isDefault
              ? `at the round price · ${inr(data.investorInvestment)} paid in`
              : `against ${inr(data.investorInvestment)} paid in`
          }
          tone={data.investorShareValue >= data.investorInvestment ? 'green' : 'rose'}
        />
      </div>

      {/* --------------------------- how it is derived -------------------------- */}
      <section className="glass-card p-5">
        <h2 className="text-sm font-semibold tracking-tight text-white">
          How this is calculated
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Post-money valuation
            </p>
            <p className="mt-2 font-display text-sm text-slate-200">
              Pre-money + Capital received
            </p>
            <p className="mt-2 text-sm tabular-nums text-slate-400">
              {inr(data.preMoneyValuation)} + {inr(data.totalInvestmentReceived)} ={' '}
              <span className="font-semibold text-white">{inr(data.postMoneyValuation)}</span>
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              What the company is worth on the cash actually in it today.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Fully-funded valuation
            </p>
            <p className="mt-2 font-display text-sm text-slate-200">
              Pre-money + Capital committed
            </p>
            <p className="mt-2 text-sm tabular-nums text-slate-400">
              {inr(data.preMoneyValuation)} + {inr(data.committedCapital)} ={' '}
              <span className="font-semibold text-white">
                {inr(data.fullyFundedValuation)}
              </span>
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              The price your percentage was agreed at, so this is what values your stake.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Your share value
            </p>
            <p className="mt-2 font-display text-sm text-slate-200">
              Fully-funded valuation × Ownership %
            </p>
            <p className="mt-2 text-sm tabular-nums text-slate-400">
              {inr(data.fullyFundedValuation)} × {percent(data.ownershipPercent)} ={' '}
              <span className="font-semibold text-white">{inr(data.investorShareValue)}</span>
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Ownership vests as {inr(data.investorInvestment)} ÷{' '}
              {inr(data.investorCommitted)} × {percent(data.agreedOwnershipPercent, 2)}.
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Your percentage is a slice of the company once every commitment is funded, so it
          is valued at that same fully-funded price — which is why capital paid in shows no
          gain or loss until Esscentra is genuinely re-valued. Revenue does not set
          valuation. Esscentra is re-valued only on a new investment, an acquisition, a
          mutual agreement between shareholders, or an independent valuation — the events
          listed in the history below.
        </p>
      </section>

      {/* --------------------------------- trend -------------------------------- */}
      <ChartFrame
        title="Valuation over time"
        subtitle="Company worth and the value of your stake at each valuation event"
        isEmpty={history.length < 2}
        emptyMessage="At least two valuation events are needed to draw a trend."
        legend={[
          { label: 'Company valuation', color: SERIES.valuation },
          { label: 'Your share value', color: SERIES.investorProfit },
        ]}
      >
        <LineChart
          categories={history.map((point) => formatDate(point.effectiveDate))}
          series={[
            {
              key: 'company',
              label: 'Company valuation',
              color: SERIES.valuation,
              values: history.map((point) => point.postMoneyValuation),
              area: true,
            },
            {
              key: 'investor',
              label: 'Your share value',
              color: SERIES.investorProfit,
              values: history.map((point) => point.investorShareValue),
            },
          ]}
        />
      </ChartFrame>

      {/* -------------------------------- history ------------------------------- */}
      <Section title="Valuation history" description="Every recorded valuation event.">
        <FinanceTable<ValuationPoint>
          rows={history}
          rowKey={(row) => row.id}
          emptyTitle="No valuation events recorded"
          emptyMessage="Valuations appear here as they are recorded by the admin team."
          columns={[
            {
              key: 'date',
              header: 'Effective',
              render: (row) => (
                <span className="whitespace-nowrap text-slate-300">
                  {formatDate(row.effectiveDate)}
                </span>
              ),
            },
            {
              key: 'method',
              header: 'Basis',
              render: (row) => (
                <Pill tone={METHOD_TONE[row.method] ?? 'gray'}>{humanize(row.method)}</Pill>
              ),
            },
            {
              key: 'source',
              header: 'Source',
              hideOnMobile: true,
              render: (row) => <span className="text-slate-400">{row.source ?? '—'}</span>,
            },
            {
              key: 'pre',
              header: 'Pre-money',
              numeric: true,
              hideOnMobile: true,
              render: (row) => (
                <span className="text-slate-300">{inr(row.preMoneyValuation)}</span>
              ),
            },
            {
              key: 'post',
              header: 'Company worth',
              numeric: true,
              render: (row) => (
                <span className="font-semibold text-white">{inr(row.postMoneyValuation)}</span>
              ),
            },
            {
              key: 'share',
              header: 'Your stake',
              numeric: true,
              render: (row) => (
                <span className="font-semibold text-emerald-300">
                  {inr(row.investorShareValue)}
                </span>
              ),
            },
          ]}
        />
      </Section>
    </div>
  );
}
