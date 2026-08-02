import { useState } from 'react';
import { AlertCircle, Clock, IndianRupee, Plus, Receipt, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import {
  ExportButtons,
  Pill,
  RangeFilter,
  SelectControl,
  statusTone,
  type DateRange,
} from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import {
  PAYMENT_MODES,
  REVENUE_STATUSES,
  createRevenue,
  deleteRevenue,
  exportRevenue,
  listRevenue,
  type RevenueListResult,
  type RevenueRecord,
  type RevenueStatus,
} from '@/lib/financeApi';
import { useInvestorData } from '../investor/useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { formatDate, humanize, inr } from '@/lib/format';

/**
 * ============================================================================
 *  ADMIN — REVENUE
 * ============================================================================
 *
 * Where client payments are recorded. Everything an investor sees on their
 * revenue page originates here, which is why the form insists on a status: a
 * payment marked RECEIVED enters the profit calculation immediately, and one
 * marked PENDING does not.
 * ============================================================================
 */

const EMPTY_FORM = {
  clientName: '',
  invoiceNumber: '',
  description: '',
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  status: 'RECEIVED' as RevenueStatus,
  paymentMode: 'BANK_TRANSFER',
  referenceNumber: '',
  notes: '',
};

export default function RevenueAdmin() {
  const toast = useToast();
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useInvestorData<RevenueListResult>(
    () => listRevenue({ ...range, status: status || undefined, search: search || undefined, limit: 200 }),
    [range.from, range.to, status, search],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createRevenue(
        {
          clientName: form.clientName,
          invoiceNumber: form.invoiceNumber || undefined,
          description: form.description || undefined,
          amount: form.amount,
          paymentDate: form.paymentDate,
          status: form.status,
          paymentMode: form.paymentMode as never,
          referenceNumber: form.referenceNumber || undefined,
          notes: form.notes || undefined,
        },
        files,
      );

      toast.success('Revenue recorded', `${inr(Number(form.amount))} from ${form.clientName}.`);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFiles([]);
      reload();
    } catch (thrown) {
      toast.error('Could not record revenue', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: RevenueRecord) => {
    // A revenue record feeds the profit split, so deleting one changes what
    // investors are owed. Worth one confirmation.
    if (!window.confirm(`Delete the ${inr(row.amount)} payment from ${row.clientName}?`)) {
      return;
    }

    try {
      await deleteRevenue(row._id);
      toast.success('Deleted', 'The revenue record has been removed.');
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  const exportAs = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      await exportRevenue(format, range);
    } catch (thrown) {
      toast.error('Export failed', getErrorMessage(thrown));
    } finally {
      setExporting(false);
    }
  };

  const set = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Revenue"
        subtitle="Record every client payment. Only received payments count toward profit."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              busy={exporting}
              onCsv={() => void exportAs('csv')}
              onExcel={() => void exportAs('excel')}
            />
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Record revenue
            </Button>
          </div>
        }
      />

      <RangeFilter
        range={range}
        onChange={setRange}
        extra={
          <>
            <SelectControl
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'All statuses' },
                ...REVENUE_STATUSES.map((value) => ({ value, label: humanize(value) })),
              ]}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Client or invoice…"
                className="h-10 w-44 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/25"
              />
            </label>
          </>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              icon={IndianRupee}
              label="Revenue received"
              value={data.totals.totalRevenue}
              format={inr}
              hint={`${data.totals.receivedCount} payments`}
              tone="green"
            />
            <FinanceCard
              icon={Clock}
              label="Outstanding"
              value={data.totals.pendingAmount}
              format={inr}
              hint={`${data.totals.pendingCount} unpaid invoices`}
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
              tone="sky"
            />
          </div>

          <FinanceTable<RevenueRecord>
            rows={data.rows}
            rowKey={(row) => row._id}
            emptyTitle="No revenue recorded"
            emptyMessage="Record your first client payment to start the profit calculation."
            maxHeight={640}
            columns={[
              {
                key: 'client',
                header: 'Client',
                render: (row) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{row.clientName}</p>
                    {row.description && (
                      <p className="truncate text-xs text-slate-500">{row.description}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'invoice',
                header: 'Invoice',
                hideOnMobile: true,
                render: (row) => (
                  <span className="font-mono text-xs text-slate-400">
                    {row.invoiceNumber ?? '—'}
                  </span>
                ),
              },
              {
                key: 'date',
                header: 'Date',
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
                key: 'mode',
                header: 'Mode',
                hideOnMobile: true,
                render: (row) => (
                  <span className="text-slate-400">{humanize(row.paymentMode)}</span>
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
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                    aria-label={`Delete revenue from ${row.clientName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ),
              },
            ]}
            footer={
              <>
                <TotalCell numeric={false}>Total received</TotalCell>
                <TotalCell numeric={false} hideOnMobile>
                  <span />
                </TotalCell>
                <TotalCell numeric={false}>
                  <span />
                </TotalCell>
                <TotalCell>{inr(data.totals.totalRevenue)}</TotalCell>
                <TotalCell numeric={false} hideOnMobile>
                  <span />
                </TotalCell>
                <TotalCell numeric={false} colSpan={2}>
                  <span />
                </TotalCell>
              </>
            }
          />
        </>
      )}

      {/* --------------------------------- form --------------------------------- */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record revenue">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Client name"
              value={form.clientName}
              onChange={(event) => set('clientName')(event.target.value)}
              required
              autoFocus
            />
            <Input
              label="Amount (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => set('amount')(event.target.value)}
              required
            />
            <Input
              label="Invoice number"
              value={form.invoiceNumber}
              onChange={(event) => set('invoiceNumber')(event.target.value)}
              hint="Optional, but must be unique"
            />
            <Input
              label="Payment date"
              type="date"
              value={form.paymentDate}
              onChange={(event) => set('paymentDate')(event.target.value)}
              required
            />

            <SelectControl
              label="Status"
              value={form.status}
              onChange={(value) => set('status')(value)}
              options={REVENUE_STATUSES.map((value) => ({ value, label: humanize(value) }))}
            />
            <SelectControl
              label="Payment mode"
              value={form.paymentMode}
              onChange={(value) => set('paymentMode')(value)}
              options={PAYMENT_MODES.map((value) => ({ value, label: humanize(value) }))}
            />
          </div>

          <Input
            label="Description"
            value={form.description}
            onChange={(event) => set('description')(event.target.value)}
          />
          <Input
            label="Reference number"
            value={form.referenceNumber}
            onChange={(event) => set('referenceNumber')(event.target.value)}
            hint="Bank reference or transaction id"
          />

          <label className="block space-y-1.5">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Attachments
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.docx"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-white/[0.14]"
            />
          </label>

          {form.status === 'RECEIVED' && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-200">
              This payment will be counted as revenue immediately and will change every
              investor&rsquo;s profit share for {formatDate(form.paymentDate)}&rsquo;s month.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Record revenue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
