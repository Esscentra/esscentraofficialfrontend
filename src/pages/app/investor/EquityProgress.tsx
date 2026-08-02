import { CheckCircle2, PieChart, Target, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { CircularProgress, ProgressBar } from '@/components/charts/CircularProgress';
import { getEquityProgress, type EquityProgressView } from '@/lib/investorFinanceApi';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr, percent } from '@/lib/format';

/**
 * ============================================================================
 *  9. EQUITY PROGRESS
 * ============================================================================
 *
 * Two dials, because they are genuinely two different things and investors
 * routinely conflate them:
 *
 *  - Investment progress: how much of the pledged capital has been paid.
 *  - Ownership progress: how much of the agreed equity has been earned.
 *
 * They move together on a single commitment, which is exactly why showing both
 * makes the mechanism legible: paying 16.53% of the money earns 16.53% of the
 * 10% on offer — that is 1.6532%, not 16.53%.
 * ============================================================================
 */

export default function InvestorEquityProgress() {
  const { data, loading, error, reload } = useInvestorData<EquityProgressView>(
    () => getEquityProgress(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Equity" title="Equity progress" />
        <CardGridSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Equity" title="Equity progress" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Equity"
        title="Equity progress"
        subtitle="How far through your commitment you are, and the ownership it has unlocked."
      />

      {data.isComplete && (
        <InfoNote tone="info" icon={CheckCircle2}>
          Your commitment is fully funded. You hold the full{' '}
          {percent(data.targetOwnershipPercent, 2)} agreed in your term sheet — ownership
          cannot go higher than this.
        </InfoNote>
      )}

      {/* -------------------------------- the dials ------------------------------ */}
      <section className="glass-card p-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="flex flex-col items-center">
            <CircularProgress
              value={data.investmentProgressPercent}
              size={184}
              color="#3f7bfd"
              label="Investment progress"
              caption={`${inr(data.investmentReceived)} of ${inr(data.committedInvestment)}`}
            />
            <p className="mt-4 max-w-[18rem] text-center text-xs leading-relaxed text-slate-500">
              {data.isComplete
                ? 'Every rupee of your commitment has been received.'
                : `${inr(data.remainingInvestment)} is still to be paid.`}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <CircularProgress
              value={data.ownershipProgressPercent}
              size={184}
              color="#a78bfa"
              valueLabel={percent(data.currentOwnershipPercent)}
              caption={`of ${percent(data.targetOwnershipPercent, 2)} target`}
              label="Ownership progress"
            />
            <p className="mt-4 max-w-[18rem] text-center text-xs leading-relaxed text-slate-500">
              Ownership vests in proportion to capital received and is capped at{' '}
              {percent(data.targetOwnershipPercent, 2)}.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={Wallet}
          label="Capital paid in"
          value={data.investmentReceived}
          format={inr}
          tone="brand"
          progress={data.investmentProgressPercent}
        />
        <FinanceCard
          icon={Target}
          label="Still to pay"
          value={data.remainingInvestment}
          format={inr}
          hint={data.isComplete ? 'Nothing outstanding' : 'To reach full ownership'}
          tone={data.isComplete ? 'green' : 'amber'}
        />
        <FinanceCard
          icon={PieChart}
          label="Ownership now"
          value={data.currentOwnershipPercent}
          format={(value) => percent(value)}
          tone="violet"
          progress={data.ownershipProgressPercent}
        />
        <FinanceCard
          icon={CheckCircle2}
          label="Target ownership"
          value={data.targetOwnershipPercent}
          format={(value) => percent(value, 2)}
          hint="Hard cap — never exceeded"
          tone="sky"
        />
      </div>

      {/* ----------------------------- per commitment ---------------------------- */}
      <Section
        title="Commitments"
        description="Each pledge vests independently against its own agreed equity."
      >
        <div className="space-y-4">
          {data.commitments.length === 0 && (
            <div className="glass-card px-6 py-12 text-center text-sm text-slate-500">
              No commitments have been recorded against your account yet.
            </div>
          )}

          {data.commitments.map((commitment) => (
            <div key={commitment.commitmentId} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {commitment.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {humanize(commitment.investmentType)} · started{' '}
                    {formatDate(commitment.startDate)}
                  </p>
                </div>
                <Pill tone={commitment.isFullyFunded ? 'green' : 'amber'}>
                  {commitment.isFullyFunded
                    ? 'Fully funded'
                    : `${percent(commitment.fundingProgressPercent, 1)} funded`}
                </Pill>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-xs text-slate-400">Capital</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-200">
                      {inr(commitment.receivedTotal)} / {inr(commitment.committedAmount)}
                    </span>
                  </div>
                  <ProgressBar value={commitment.fundingProgressPercent} />
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-xs text-slate-400">Ownership</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-200">
                      {percent(commitment.ownershipPercent)} /{' '}
                      {percent(commitment.agreedOwnershipPercent, 2)}
                    </span>
                  </div>
                  <ProgressBar
                    value={
                      commitment.agreedOwnershipPercent > 0
                        ? (commitment.ownershipPercent / commitment.agreedOwnershipPercent) * 100
                        : 0
                    }
                    color="#a78bfa"
                  />
                </div>
              </div>

              {!commitment.isFullyFunded && (
                <p className="mt-4 text-xs text-slate-500">
                  {inr(commitment.remainingAmount)} remaining would add{' '}
                  {percent(
                    commitment.agreedOwnershipPercent - commitment.ownershipPercent,
                  )}{' '}
                  of ownership.
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
