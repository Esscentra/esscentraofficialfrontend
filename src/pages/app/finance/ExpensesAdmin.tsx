import { useState } from 'react';
import { CheckCircle2, Clock, Plus, Trash2, Wallet, XCircle } from 'lucide-react';
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
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  PAYMENT_MODES,
  approveExpense,
  createExpense,
  deleteExpense,
  exportExpenses,
  listExpenses,
  rejectExpense,
  type ExpenseCategory,
  type ExpenseListResult,
  type ExpenseRecord,
  type ExpenseStatus,
} from '@/lib/financeApi';
import { useInvestorData } from '../investor/useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { formatDate, humanize, inr } from '@/lib/format';

/**
 * ============================================================================
 *  ADMIN — BUSINESS EXPENSES
 * ============================================================================
 *
 * The cost side of the P&L, with an explicit approval step.
 *
 * The approve/reject buttons are separate endpoints rather than a status
 * dropdown, so the audit trail records who approved a cost and when — the
 * control that stops an expense from quietly reducing what investors are owed.
 * ============================================================================
 */

const EMPTY_FORM = {
  category: 'MARKETING' as ExpenseCategory,
  description: '',
  vendor: '',
  amount: '',
  spentAt: new Date().toISOString().slice(0, 10),
  status: 'APPROVED' as ExpenseStatus,
  paymentMode: 'BANK_TRANSFER',
  referenceNumber: '',
  notes: '',
};

export default function ExpensesAdmin() {
  const toast = useToast();
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const { data, loading, error, reload } = useInvestorData<ExpenseListResult>(
    () =>
      listExpenses({
        ...range,
        status: status || undefined,
        category: category || undefined,
        limit: 200,
      }),
    [range.from, range.to, status, category],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createExpense(
        {
          category: form.category,
          description: form.description,
          vendor: form.vendor || undefined,
          amount: form.amount,
          spentAt: form.spentAt,
          status: form.status,
          paymentMode: form.paymentMode as never,
          referenceNumber: form.referenceNumber || undefined,
          notes: form.notes || undefined,
        },
        files,
      );

      toast.success('Expense recorded', `${inr(Number(form.amount))} — ${form.description}.`);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFiles([]);
      reload();
    } catch (thrown) {
      toast.error('Could not record expense', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const approve = async (row: ExpenseRecord) => {
    setActing(row._id);
    try {
      await approveExpense(row._id);
      toast.success('Approved', `${inr(row.amount)} now counts toward expenses.`);
      reload();
    } catch (thrown) {
      toast.error('Could not approve', getErrorMessage(thrown));
    } finally {
      setActing(null);
    }
  };

  const reject = async (row: ExpenseRecord) => {
    const reason = window.prompt('Why is this expense being rejected?') ?? undefined;
    if (reason === undefined) return;

    setActing(row._id);
    try {
      await rejectExpense(row._id, reason);
      toast.success('Rejected', 'The expense has been excluded from profit.');
      reload();
    } catch (thrown) {
      toast.error('Could not reject', getErrorMessage(thrown));
    } finally {
      setActing(null);
    }
  };

  const remove = async (row: ExpenseRecord) => {
    if (!window.confirm(`Delete the ${inr(row.amount)} expense "${row.description}"?`)) return;

    try {
      await deleteExpense(row._id);
      toast.success('Deleted', 'The expense has been removed.');
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  const exportAs = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      await exportExpenses(format, range);
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
        title="Business expenses"
        subtitle="Operating costs. Only approved expenses reduce net profit."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              busy={exporting}
              onCsv={() => void exportAs('csv')}
              onExcel={() => void exportAs('excel')}
            />
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Add expense
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
                ...EXPENSE_STATUSES.map((value) => ({ value, label: humanize(value) })),
              ]}
            />
            <SelectControl
              label="Category"
              value={category}
              onChange={setCategory}
              options={[
                { value: '', label: 'All categories' },
                ...EXPENSE_CATEGORIES.map((value) => ({ value, label: humanize(value) })),
              ]}
            />
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
              icon={Wallet}
              label="Counted in profit"
              value={data.totals.totalExpenses}
              format={inr}
              hint={`${data.totals.recognisedCount} approved`}
              tone="rose"
            />
            <FinanceCard
              icon={CheckCircle2}
              label="Paid"
              value={data.totals.paidAmount}
              format={inr}
              tone="green"
            />
            <FinanceCard
              icon={Clock}
              label="Awaiting approval"
              value={data.totals.pendingAmount}
              format={inr}
              hint={`${data.totals.pendingCount} to review`}
              tone="amber"
            />
            <FinanceCard
              icon={XCircle}
              label="Rejected"
              value={data.totals.rejectedAmount}
              format={inr}
              hint="Excluded from profit"
              tone="sky"
            />
          </div>

          <FinanceTable<ExpenseRecord>
            rows={data.rows}
            rowKey={(row) => row._id}
            emptyTitle="No expenses recorded"
            emptyMessage="Add your first business cost to complete the profit calculation."
            maxHeight={640}
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
                    <p className="truncate text-slate-200">{row.description}</p>
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
                render: (row) =>
                  row.approvedBy ? (
                    <span className="text-slate-400">
                      {[row.approvedBy.firstName, row.approvedBy.lastName]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
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
                  <div className="flex items-center justify-end gap-1">
                    {row.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={acting === row._id}
                          onClick={() => void approve(row)}
                          className="rounded-lg p-1.5 text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-40"
                          aria-label="Approve expense"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={acting === row._id}
                          onClick={() => void reject(row)}
                          className="rounded-lg p-1.5 text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-40"
                          aria-label="Reject expense"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => void remove(row)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                      aria-label="Delete expense"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            footer={
              <>
                <TotalCell numeric={false} colSpan={3}>
                  Counted in profit
                </TotalCell>
                <TotalCell>{inr(data.totals.totalExpenses)}</TotalCell>
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
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add business expense">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectControl
              label="Category"
              value={form.category}
              onChange={(value) => set('category')(value)}
              options={EXPENSE_CATEGORIES.map((value) => ({ value, label: humanize(value) }))}
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
          </div>

          <Input
            label="Description"
            value={form.description}
            onChange={(event) => set('description')(event.target.value)}
            required
            autoFocus
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Vendor"
              value={form.vendor}
              onChange={(event) => set('vendor')(event.target.value)}
            />
            <Input
              label="Date incurred"
              type="date"
              value={form.spentAt}
              onChange={(event) => set('spentAt')(event.target.value)}
              required
            />
            <SelectControl
              label="Status"
              value={form.status}
              onChange={(value) => set('status')(value)}
              options={EXPENSE_STATUSES.map((value) => ({ value, label: humanize(value) }))}
            />
            <SelectControl
              label="Payment mode"
              value={form.paymentMode}
              onChange={(value) => set('paymentMode')(value)}
              options={PAYMENT_MODES.map((value) => ({ value, label: humanize(value) }))}
            />
          </div>

          <Input
            label="Reference number"
            value={form.referenceNumber}
            onChange={(event) => set('referenceNumber')(event.target.value)}
          />

          <label className="block space-y-1.5">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Receipts / bills
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.docx"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-white/[0.14]"
            />
          </label>

          {(form.status === 'APPROVED' || form.status === 'PAID') && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
              Recording this as {humanize(form.status).toLowerCase()} approves it in your
              name and reduces net profit — and therefore every investor&rsquo;s profit
              share — for {formatDate(form.spentAt)}&rsquo;s month.
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
              Add expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
