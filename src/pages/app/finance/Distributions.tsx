import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  Calculator,
  CheckCircle2,
  HandCoins,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill, PeriodPicker, SelectControl, Section, statusTone } from '@/components/finance/Controls';
import { ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import {
  PAYMENT_MODES,
  approveDistribution,
  cancelDistribution,
  createDistribution,
  deleteDistribution,
  listDistributions,
  payDistribution,
  previewDistribution,
  type DistributionPreview,
  type DistributionRecord,
} from '@/lib/financeApi';
import { listInvestors, type InvestorDirectoryEntry } from '@/lib/investorFinanceApi';
import { useInvestorData } from '../investor/useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { currentPeriodKey, formatDate, humanize, inr, inrExact, percent } from '@/lib/format';

/**
 * ============================================================================
 *  ADMIN — PROFIT DISTRIBUTIONS
 * ============================================================================
 *
 * The approval workflow: calculate → draft → approve → pay.
 *
 * The preview step is the important one. It shows the period's revenue, costs,
 * net profit and the investor's ownership AT THE CLOSE OF THAT PERIOD before
 * anything is written — so nobody approves a payout without first seeing the
 * arithmetic that produced it.
 * ============================================================================
 */

interface DistributionsData {
  rows: DistributionRecord[];
  investors: InvestorDirectoryEntry[];
}

function investorName(row: DistributionRecord): string {
  const investor = row.investorId;
  if (typeof investor === 'string') return 'Investor';
  return [investor?.firstName, investor?.lastName].filter(Boolean).join(' ') || 'Investor';
}

export default function Distributions() {
  const toast = useToast();

  const [showCalc, setShowCalc] = useState(false);
  const [payTarget, setPayTarget] = useState<DistributionRecord | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const { data, loading, error, reload } = useInvestorData<DistributionsData>(
    async () => {
      const [list, investors] = await Promise.all([
        listDistributions({ limit: 200 }),
        listInvestors(),
      ]);
      return { rows: list.rows, investors };
    },
    [],
  );

  const approve = async (row: DistributionRecord) => {
    setActing(row._id);
    try {
      await approveDistribution(row._id);
      toast.success('Approved', `${inr(row.investorProfit)} declared to ${investorName(row)}.`);
      reload();
    } catch (thrown) {
      toast.error('Could not approve', getErrorMessage(thrown));
    } finally {
      setActing(null);
    }
  };

  const cancel = async (row: DistributionRecord) => {
    const reason = window.prompt('Why is this distribution being cancelled?') ?? undefined;
    if (reason === undefined) return;

    setActing(row._id);
    try {
      await cancelDistribution(row._id, reason);
      toast.success('Cancelled', 'The distribution has been withdrawn.');
      reload();
    } catch (thrown) {
      toast.error('Could not cancel', getErrorMessage(thrown));
    } finally {
      setActing(null);
    }
  };

  const remove = async (row: DistributionRecord) => {
    if (!window.confirm(`Delete this ${inr(row.investorProfit)} draft?`)) return;

    try {
      await deleteDistribution(row._id);
      toast.success('Deleted', 'The draft has been removed.');
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Profit distributions"
        subtitle="Calculate, approve and pay each investor's share of monthly profit."
        action={
          <Button size="sm" onClick={() => setShowCalc(true)}>
            <Plus className="h-4 w-4" />
            New distribution
          </Button>
        }
      />

      <InfoNote tone="info" icon={Calculator}>
        A distribution is calculated at the investor&rsquo;s ownership <strong>as at the
        close of the period</strong>, and those figures are frozen at approval. Correcting
        a revenue record later will not silently change a payout that has already been
        declared.
      </InfoNote>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <Section title="All distributions" description="Newest period first.">
          <FinanceTable<DistributionRecord>
            rows={data.rows}
            rowKey={(row) => row._id}
            emptyTitle="No distributions yet"
            emptyMessage="Calculate a monthly profit share to get started."
            maxHeight={680}
            columns={[
              {
                key: 'investor',
                header: 'Investor',
                render: (row) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{investorName(row)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {row.reason ?? humanize(row.type)}
                    </p>
                  </div>
                ),
              },
              {
                key: 'period',
                header: 'Period',
                render: (row) => (
                  <span className="whitespace-nowrap text-slate-300">
                    {row.periodLabel ?? '—'}
                  </span>
                ),
              },
              {
                key: 'net',
                header: 'Net profit',
                numeric: true,
                hideOnMobile: true,
                render: (row) =>
                  row.type === 'PROFIT_SHARE' ? (
                    <span className="text-slate-300">{inr(row.netProfit)}</span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  ),
              },
              {
                key: 'ownership',
                header: 'Ownership',
                numeric: true,
                hideOnMobile: true,
                render: (row) => (
                  <span className="text-violet-300">{percent(row.ownershipPercent)}</span>
                ),
              },
              {
                key: 'amount',
                header: 'Investor share',
                numeric: true,
                render: (row) => (
                  <span className="font-semibold text-white">{inrExact(row.investorProfit)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                align: 'center',
                render: (row) => (
                  <div className="flex flex-col items-center gap-1">
                    <Pill tone={statusTone(row.status)}>{humanize(row.status)}</Pill>
                    {row.paidAt && (
                      <span className="text-[10px] text-slate-500">
                        {formatDate(row.paidAt)}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <div className="flex items-center justify-end gap-1">
                    {row.status === 'DRAFT' && (
                      <>
                        <button
                          type="button"
                          disabled={acting === row._id}
                          onClick={() => void approve(row)}
                          className="rounded-lg p-1.5 text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-40"
                          title="Approve"
                          aria-label="Approve distribution"
                        >
                          <BadgeCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                          title="Delete draft"
                          aria-label="Delete draft"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {row.status === 'APPROVED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPayTarget(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-2.5 py-1.5 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/25"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Mark paid
                        </button>
                        <button
                          type="button"
                          disabled={acting === row._id}
                          onClick={() => void cancel(row)}
                          className="rounded-lg p-1.5 text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-40"
                          title="Cancel"
                          aria-label="Cancel distribution"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {row.status === 'PAID' && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {row.referenceNumber}
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Section>
      )}

      <CalculateModal
        open={showCalc}
        investors={data?.investors ?? []}
        onClose={() => setShowCalc(false)}
        onCreated={() => {
          setShowCalc(false);
          reload();
        }}
      />

      <PayModal
        distribution={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          setPayTarget(null);
          reload();
        }}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Calculate + create                                                         */
/* ========================================================================== */

function CalculateModal({
  open,
  investors,
  onClose,
  onCreated,
}: {
  open: boolean;
  investors: InvestorDirectoryEntry[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [investorId, setInvestorId] = useState('');
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const [preview, setPreview] = useState<DistributionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Default to the first investor as soon as the directory arrives, so the
  // admin does not have to make a choice that is usually obvious.
  useEffect(() => {
    if (!investorId && investors.length > 0) setInvestorId(investors[0]!.id);
  }, [investors, investorId]);

  useEffect(() => {
    if (!open || !investorId || !periodKey) return;

    let cancelled = false;
    setLoading(true);
    setProblem(null);

    previewDistribution(investorId, periodKey)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((thrown) => {
        if (!cancelled) {
          setPreview(null);
          setProblem(getErrorMessage(thrown));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, investorId, periodKey]);

  const create = async () => {
    setSaving(true);
    try {
      await createDistribution({ investorId, periodKey, type: 'PROFIT_SHARE' });
      toast.success('Draft created', 'Review it, then approve to declare the payout.');
      onCreated();
    } catch (thrown) {
      toast.error('Could not create', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const blocked =
    !preview ||
    preview.isLoss ||
    preview.investorProfit <= 0 ||
    Boolean(preview.existingDistributionId);

  return (
    <Modal open={open} onClose={onClose} title="Calculate a profit share">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectControl
            label="Investor"
            value={investorId}
            onChange={setInvestorId}
            options={investors.map((investor) => ({
              value: investor.id,
              label: investor.name,
            }))}
          />
          <PeriodPicker value={periodKey} onChange={setPeriodKey} />
        </div>

        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
            Calculating…
          </div>
        )}

        {problem && !loading && <InfoNote tone="warning">{problem}</InfoNote>}

        {preview && !loading && (
          <>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {preview.period.label}
              </p>

              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Revenue received" value={inr(preview.revenueTotal)} />
                <Row
                  label="Less: approved expenses"
                  value={`− ${inr(preview.expenseTotal)}`}
                  tone="text-rose-300"
                />
                <div className="border-t border-white/10 pt-2">
                  <Row
                    label="Net profit"
                    value={inr(preview.netProfit)}
                    tone={preview.isLoss ? 'text-rose-300' : 'text-emerald-300'}
                    strong
                  />
                </div>
                <Row
                  label={`${preview.investorName}'s ownership at period end`}
                  value={percent(preview.ownershipPercent)}
                  tone="text-violet-300"
                />
                <div className="border-t border-white/10 pt-2">
                  <Row
                    label="Investor share"
                    value={inrExact(preview.investorProfit)}
                    tone="text-white"
                    strong
                  />
                  <Row label="Founder share" value={inrExact(preview.founderProfit)} />
                </div>
              </dl>
            </div>

            {preview.existingDistributionId && (
              <InfoNote tone="warning">
                A {preview.existingStatus?.toLowerCase()} distribution already exists for{' '}
                {preview.period.label}. Cancel it before creating another.
              </InfoNote>
            )}

            {preview.isLoss && (
              <InfoNote tone="warning">
                {preview.period.label} ran at a loss of {inr(Math.abs(preview.netProfit))}.
                There is no profit to distribute — the founders absorb the shortfall.
              </InfoNote>
            )}

            {!preview.isLoss && preview.investorProfit <= 0 && (
              <InfoNote tone="neutral">
                Nothing to distribute for this period at{' '}
                {percent(preview.ownershipPercent)} ownership.
              </InfoNote>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" disabled={blocked} loading={saving} onClick={() => void create()}>
            <HandCoins className="h-4 w-4" />
            Create draft
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ========================================================================== */
/*  Mark as paid                                                               */
/* ========================================================================== */

function PayModal({
  distribution,
  onClose,
  onPaid,
}: {
  distribution: DistributionRecord | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const toast = useToast();
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!distribution) return;

    setSaving(true);
    try {
      await payDistribution(
        distribution._id,
        { referenceNumber, paidAt, paymentMode: paymentMode as never },
        receipt,
      );
      toast.success('Marked as paid', 'The investor has been notified.');
      setReferenceNumber('');
      setReceipt(null);
      onPaid();
    } catch (thrown) {
      toast.error('Could not record payment', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(distribution)} onClose={onClose} title="Record the payment">
      <form onSubmit={submit} className="space-y-4">
        {distribution && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
            <p className="text-sm text-emerald-100">
              Paying{' '}
              <strong className="tabular-nums">{inrExact(distribution.investorProfit)}</strong>{' '}
              to {investorName(distribution)} for {distribution.periodLabel}.
            </p>
          </div>
        )}

        <Input
          label="Payment reference number"
          value={referenceNumber}
          onChange={(event) => setReferenceNumber(event.target.value)}
          required
          autoFocus
          hint="Required so the transfer can be traced"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Paid on"
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            required
          />
          <SelectControl
            label="Payment mode"
            value={paymentMode}
            onChange={setPaymentMode}
            options={PAYMENT_MODES.map((value) => ({ value, label: humanize(value) }))}
          />
        </div>

        <label className="block space-y-1.5">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            Receipt (shared with the investor)
          </span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-white/[0.14]"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            <Send className="h-4 w-4" />
            Mark as paid
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Row({
  label,
  value,
  tone = 'text-slate-300',
  strong,
}: {
  label: string;
  value: string;
  tone?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? 'font-semibold text-white' : 'text-slate-400'}>{label}</dt>
      <dd className={`shrink-0 tabular-nums ${tone} ${strong ? 'font-semibold' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
