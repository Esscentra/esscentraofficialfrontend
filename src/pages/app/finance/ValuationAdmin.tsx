import { useState } from 'react';
import { Building2, Coins, Layers, Plus, Trash2, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill, SelectControl, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { DonutChart } from '@/components/charts/DonutChart';
import { useToast } from '@/components/ui/Toast';
import {
  VALUATION_BASES,
  VALUATION_METHODS,
  createValuation,
  deleteValuation,
  getCurrentValuation,
  getValuationHistory,
  type CurrentValuation,
  type ValuationBasis,
  type ValuationMethod,
  type ValuationRecord,
} from '@/lib/financeApi';
import { getCapTable, type CapTable } from '@/lib/investorFinanceApi';
import { useInvestorData } from '../investor/useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { formatDate, humanize, inr, percent } from '@/lib/format';

/**
 * ============================================================================
 *  ADMIN — VALUATION AND CAP TABLE
 * ============================================================================
 *
 * Recording a valuation instantly changes what every investor's stake is
 * worth, so the form makes the pre-money / post-money distinction impossible
 * to skip past — entering ₹2.5Cr on the wrong basis misstates every share
 * value on the platform.
 * ============================================================================
 */

interface ValuationData {
  current: CurrentValuation;
  history: ValuationRecord[];
  capTable: CapTable;
}

const EMPTY_FORM = {
  value: '',
  basis: 'POST_MONEY' as ValuationBasis,
  method: 'INDEPENDENT_VALUATION' as ValuationMethod,
  effectiveDate: new Date().toISOString().slice(0, 10),
  source: '',
  notes: '',
};

export default function ValuationAdmin() {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useInvestorData<ValuationData>(
    async () => {
      const [current, history, capTable] = await Promise.all([
        getCurrentValuation(),
        getValuationHistory(),
        getCapTable(),
      ]);
      return { current, history, capTable };
    },
    [],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createValuation(
        {
          value: form.value,
          basis: form.basis,
          method: form.method,
          effectiveDate: form.effectiveDate,
          source: form.source || undefined,
          notes: form.notes || undefined,
        },
        files,
      );

      toast.success(
        'Valuation recorded',
        'Every investor has been notified that their share value has changed.',
      );
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFiles([]);
      reload();
    } catch (thrown) {
      toast.error('Could not record valuation', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: ValuationRecord) => {
    if (!window.confirm(`Delete the ${inr(row.value)} valuation from ${formatDate(row.effectiveDate)}?`)) {
      return;
    }

    try {
      await deleteValuation(row._id);
      toast.success('Deleted', 'The valuation has been removed.');
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  const set = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Live preview so the admin sees the consequence before saving.
  const previewValue = Number(form.value) || 0;
  const capitalIn = data?.current.investmentReceived ?? 0;
  const previewPost =
    form.basis === 'POST_MONEY' ? previewValue : previewValue + capitalIn;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Company valuation"
        subtitle="Set what Esscentra is worth. This drives every investor's share value."
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Record valuation
          </Button>
        }
      />

      {loading ? (
        <>
          <CardGridSkeleton />
          <TableSkeleton />
        </>
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <>
          {data.current.isDefault && (
            <InfoNote tone="warning">
              No valuation has been recorded. Investors are seeing the opening pre-money
              figure of {inr(data.current.preMoneyValuation)}.
            </InfoNote>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              icon={Layers}
              label="Pre-money"
              value={data.current.preMoneyValuation}
              format={inr}
              tone="sky"
            />
            <FinanceCard
              icon={Coins}
              label="Capital received"
              value={data.current.investmentReceived}
              format={inr}
              hint="All investors, all time"
              tone="amber"
            />
            <FinanceCard
              icon={Building2}
              label="Post-money"
              value={data.current.postMoneyValuation}
              format={inr}
              hint={
                data.current.effectiveDate
                  ? `${humanize(data.current.method)} · ${formatDate(data.current.effectiveDate)}`
                  : 'Opening valuation'
              }
              tone="brand"
            />
            <FinanceCard
              icon={Users}
              label="Founder ownership"
              value={data.capTable.founderOwnershipPercent}
              format={(value) => percent(value, 2)}
              hint={`${percent(data.capTable.founderOwnershipPercentFullyDiluted, 2)} fully diluted`}
              tone="green"
            />
          </div>

          {/* -------------------------------- cap table ------------------------------ */}
          <div className="grid gap-5 xl:grid-cols-5">
            <ChartFrame
              title="Cap table"
              subtitle="Ownership earned today, by holder"
              className="xl:col-span-2"
              isEmpty={data.capTable.investors.length === 0}
            >
              <DonutChart
                slices={[
                  ...data.capTable.investors.map((investor) => ({
                    label: investor.name,
                    value: investor.ownershipPercent,
                  })),
                  {
                    label: 'Founders',
                    value: data.capTable.founderOwnershipPercent,
                    color: '#22c08a',
                  },
                ]}
                formatValue={(value) => percent(value, 2)}
                centerLabel="Total"
              />
            </ChartFrame>

            <Section
              title="Investor holdings"
              description="Agreed equity vs equity actually earned."
              className="xl:col-span-3"
            >
              <FinanceTable
                rows={data.capTable.investors}
                rowKey={(row) => row.investorId}
                emptyTitle="No investors on the cap table"
                columns={[
                  {
                    key: 'name',
                    header: 'Investor',
                    render: (row) => (
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{row.name}</p>
                        <p className="truncate text-xs text-slate-500">{row.email}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'received',
                    header: 'Capital in',
                    numeric: true,
                    render: (row) => (
                      <span className="text-slate-300">{inr(row.receivedTotal)}</span>
                    ),
                  },
                  {
                    key: 'committed',
                    header: 'Committed',
                    numeric: true,
                    hideOnMobile: true,
                    render: (row) => (
                      <span className="text-slate-400">{inr(row.committedAmount)}</span>
                    ),
                  },
                  {
                    key: 'earned',
                    header: 'Owns now',
                    numeric: true,
                    render: (row) => (
                      <span className="font-semibold text-violet-300">
                        {percent(row.ownershipPercent)}
                      </span>
                    ),
                  },
                  {
                    key: 'agreed',
                    header: 'Agreed',
                    numeric: true,
                    render: (row) => (
                      <span className="text-slate-300">
                        {percent(row.agreedOwnershipPercent, 2)}
                      </span>
                    ),
                  },
                ]}
              />

              {data.capTable.allocatedAgreedPercent > 100 && (
                <InfoNote tone="warning">
                  The cap table is over-allocated at{' '}
                  {percent(data.capTable.allocatedAgreedPercent, 2)}. Adjust the agreed
                  ownership on one or more commitments so the total is 100% or less.
                </InfoNote>
              )}
            </Section>
          </div>

          {/* ------------------------------- history -------------------------------- */}
          <Section title="Valuation history" description="Every recorded valuation event.">
            <FinanceTable<ValuationRecord>
              rows={data.history}
              rowKey={(row) => row._id}
              emptyTitle="No valuations recorded"
              emptyMessage="Record a valuation to set what the company — and every stake in it — is worth."
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
                  header: 'Method',
                  render: (row) => <Pill tone="violet">{humanize(row.method)}</Pill>,
                },
                {
                  key: 'basis',
                  header: 'Basis',
                  render: (row) => (
                    <Pill tone={row.basis === 'POST_MONEY' ? 'teal' : 'blue'}>
                      {humanize(row.basis)}
                    </Pill>
                  ),
                },
                {
                  key: 'value',
                  header: 'As recorded',
                  numeric: true,
                  render: (row) => (
                    <span className="font-semibold text-white">{inr(row.value)}</span>
                  ),
                },
                {
                  key: 'post',
                  header: 'Post-money',
                  numeric: true,
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="text-emerald-300">
                      {inr(row.postMoneyValuation ?? row.value)}
                    </span>
                  ),
                },
                {
                  key: 'source',
                  header: 'Source',
                  hideOnMobile: true,
                  render: (row) => <span className="text-slate-400">{row.source ?? '—'}</span>,
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => void remove(row)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                      aria-label="Delete valuation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ),
                },
              ]}
            />
          </Section>
        </>
      )}

      {/* --------------------------------- form --------------------------------- */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record a valuation">
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Valuation (₹)"
            type="number"
            min="0"
            step="1"
            value={form.value}
            onChange={(event) => set('value')(event.target.value)}
            required
            autoFocus
          />

          <SelectControl
            label="Is this figure pre-money or post-money?"
            value={form.basis}
            onChange={(value) => set('basis')(value)}
            options={VALUATION_BASES.map((value) => ({ value, label: humanize(value) }))}
          />

          {/* The consequence of the basis choice, shown before saving. */}
          <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.06] p-4 text-sm">
            <p className="font-semibold text-brand-100">This would set:</p>
            <dl className="mt-2 space-y-1 text-brand-100/80">
              <div className="flex justify-between gap-4">
                <dt>Pre-money</dt>
                <dd className="tabular-nums">
                  {inr(form.basis === 'POST_MONEY' ? Math.max(0, previewValue - capitalIn) : previewValue)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Capital received</dt>
                <dd className="tabular-nums">{inr(capitalIn)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-brand-400/20 pt-1 font-semibold">
                <dt>Company worth</dt>
                <dd className="tabular-nums">{inr(previewPost)}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectControl
              label="What set this valuation?"
              value={form.method}
              onChange={(value) => set('method')(value)}
              options={VALUATION_METHODS.map((value) => ({ value, label: humanize(value) }))}
            />
            <Input
              label="Effective date"
              type="date"
              value={form.effectiveDate}
              onChange={(event) => set('effectiveDate')(event.target.value)}
              required
            />
          </div>

          <Input
            label="Source"
            value={form.source}
            onChange={(event) => set('source')(event.target.value)}
            hint="The valuer, acquirer, or lead investor"
          />

          <label className="block space-y-1.5">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Supporting document
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-white/[0.14]"
            />
          </label>

          <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
            Saving this notifies every investor and immediately changes the share value
            shown on their dashboard.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Record valuation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
