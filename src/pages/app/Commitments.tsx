import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Download,
  FileText,
  HandCoins,
  Image as ImageIcon,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { FileField } from '@/components/ui/FileField';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import { listUsers } from '@/lib/adminApi';
import { createInvestment, invoiceDownloadUrl } from '@/lib/investmentApi';
import {
  listCommitments,
  getCommitment,
  createCommitment,
  updateCommitment,
  deleteCommitment as apiDeleteCommitment,
  addExpense,
  deleteExpense as apiDeleteExpense,
  type Commitment,
  type CommitmentStatus,
} from '@/lib/commitmentApi';
import type { User } from '@/types';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const STATUS_TONE: Record<CommitmentStatus, Tone> = {
  ACTIVE: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Thin progress meter: fill + lighter track of the same hue. */
function Meter({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-brand-500/15">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function CommitmentsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Commitment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // create / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [busy, setBusy] = useState(false);

  // detail modal (payments + expenses)
  const [detail, setDetail] = useState<Commitment | null>(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);

  /* ------------------------------- Load data ------------------------------- */
  const reloadList = useCallback(() => {
    listCommitments()
      .then(setItems)
      .catch((e) =>
        toast.error('Could not load commitments', getErrorMessage(e, 'Admin access required.')),
      );
  }, [toast]);

  useEffect(() => {
    let on = true;
    setLoading(true);
    Promise.all([listCommitments(), listUsers()])
      .then(([c, u]) => {
        if (!on) return;
        setItems(c);
        setUsers(u);
      })
      .catch(
        (e) =>
          on &&
          toast.error('Could not load commitments', getErrorMessage(e, 'Admin access required.')),
      )
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [toast]);

  const investorOptions = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const ai = a.role === 'INVESTOR' ? 0 : 1;
      const bi = b.role === 'INVESTOR' ? 0 : 1;
      return ai - bi || a.name.localeCompare(b.name);
    });
    return sorted.map((u) => ({
      value: u.id,
      label: `${u.name} (${u.email})${u.role === 'INVESTOR' ? '' : ` — ${u.role}`}`,
    }));
  }, [users]);

  /** Refresh both the open detail view and the list totals. */
  const refreshDetail = useCallback(
    async (id: string) => {
      try {
        const fresh = await getCommitment(id);
        setDetail(fresh);
        reloadList();
      } catch (e) {
        toast.error('Could not refresh', getErrorMessage(e));
      }
    },
    [reloadList, toast],
  );

  /* --------------------------- Create / edit form --------------------------- */
  const onSubmitCommitment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      if (editing) {
        await updateCommitment(editing.id, {
          title: String(f.get('title') ?? ''),
          committedAmount: Number(f.get('committedAmount') ?? 0),
          startDate: String(f.get('startDate') ?? ''),
          notes: String(f.get('notes') ?? ''),
          status: String(f.get('status') ?? 'ACTIVE') as CommitmentStatus,
        });
        toast.success('Commitment updated');
      } else {
        await createCommitment({
          investorId: String(f.get('investorId') ?? ''),
          title: String(f.get('title') ?? ''),
          committedAmount: Number(f.get('committedAmount') ?? 0),
          startDate: String(f.get('startDate') ?? ''),
          notes: String(f.get('notes') ?? ''),
        });
        toast.success('Commitment created', 'Now record installments as the money arrives.');
      }
      setFormOpen(false);
      reloadList();
    } catch (err) {
      toast.error('Could not save', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteCommitment = async (c: Commitment) => {
    if (!window.confirm(`Delete "${c.title}" (${inr.format(c.committedAmount)})?`)) return;
    try {
      await apiDeleteCommitment(c.id);
      setItems((prev) => prev.filter((i) => i.id !== c.id));
      toast.info('Commitment deleted');
    } catch (err) {
      toast.error('Could not delete', getErrorMessage(err));
    }
  };

  /* ------------------------ Add payment (installment) ------------------------ */
  const onAddPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!detail) return;
    const f = new FormData(e.currentTarget);
    const invoice = f.get('invoice');
    setBusy(true);
    try {
      await createInvestment({
        investorId: detail.investor?.id ?? '',
        commitmentId: detail.id,
        amount: Number(f.get('amount') ?? 0),
        investedAt: String(f.get('investedAt') ?? ''),
        notes: String(f.get('notes') ?? ''),
        invoice: invoice instanceof File && invoice.size > 0 ? invoice : undefined,
      });
      toast.success('Installment recorded', 'The investor sees it (and its invoice) instantly.');
      setShowPayForm(false);
      await refreshDetail(detail.id);
    } catch (err) {
      toast.error('Could not record payment', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ Add expense ------------------------------ */
  const onAddExpense = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!detail) return;
    const f = new FormData(e.currentTarget);
    const proofs = f
      .getAll('attachments')
      .filter((x): x is File => x instanceof File && x.size > 0);
    setBusy(true);
    try {
      await addExpense(detail.id, {
        amount: Number(f.get('amount') ?? 0),
        category: String(f.get('category') ?? ''),
        description: String(f.get('description') ?? ''),
        spentAt: String(f.get('spentAt') ?? ''),
        attachments: proofs,
      });
      toast.success('Expense recorded');
      setShowExpForm(false);
      await refreshDetail(detail.id);
    } catch (err) {
      toast.error('Could not record expense', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteExpense = async (expenseId: string) => {
    if (!detail) return;
    try {
      await apiDeleteExpense(expenseId);
      toast.info('Expense removed');
      await refreshDetail(detail.id);
    } catch (err) {
      toast.error('Could not remove expense', getErrorMessage(err));
    }
  };

  /* --------------------------------- Table --------------------------------- */
  const columns: Column<Commitment>[] = [
    {
      key: 'investor',
      header: 'Investor',
      render: (c) => (
        <div>
          <p className="font-medium text-white">{c.investor?.name || '—'}</p>
          <p className="text-xs text-slate-500">{c.title}</p>
        </div>
      ),
    },
    {
      key: 'committed',
      header: 'Committed',
      render: (c) => <span className="font-semibold tabular-nums">{inr.format(c.committedAmount)}</span>,
    },
    {
      key: 'received',
      header: 'Received',
      render: (c) => {
        const pct = c.committedAmount > 0 ? Math.round((c.receivedTotal / c.committedAmount) * 100) : 0;
        return (
          <div className="min-w-[120px]">
            <p className="tabular-nums text-slate-200">
              {inr.format(c.receivedTotal)}{' '}
              <span className="text-xs text-slate-500">({pct}%)</span>
            </p>
            <div className="mt-1.5 w-28">
              <Meter value={c.receivedTotal} max={c.committedAmount} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'spent',
      header: 'Spent',
      render: (c) => <span className="tabular-nums text-slate-300">{inr.format(c.spentTotal)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (c) => (
        <span className="font-semibold tabular-nums text-emerald-300">
          {inr.format(c.balanceAvailable)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge tone={STATUS_TONE[c.status]}>{c.status.toLowerCase()}</StatusBadge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (c) => (
        <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
          <RowButton
            onClick={() => {
              setEditing(c);
              setFormOpen(true);
            }}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton danger onClick={() => onDeleteCommitment(c)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Commitments"
        subtitle="Investor pledges paid in installments — track received money, spending, and balance."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> New commitment
          </Button>
        }
      />

      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No commitments yet"
          description='Example: an investor agrees to ₹1,00,000 — create the commitment, then record each installment (₹15,000 today, more next month) as it arrives.'
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> New commitment
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          onRowClick={(c) => {
            setShowPayForm(false);
            setShowExpForm(false);
            setDetail(c);
            void refreshDetail(c.id);
          }}
        />
      )}

      {/* --------------------------- Create / edit --------------------------- */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit commitment' : 'New commitment'}
      >
        <form onSubmit={onSubmitCommitment} className="space-y-4">
          {editing ? (
            <p className="text-sm text-slate-400">
              Investor: <span className="text-white">{editing.investor?.name}</span>
            </p>
          ) : (
            <Select
              label="Investor"
              name="investorId"
              required
              defaultValue=""
              options={[{ value: '', label: 'Select an investor…' }, ...investorOptions]}
            />
          )}
          <Input
            label="Title"
            name="title"
            defaultValue={editing?.title ?? ''}
            placeholder="Seed contribution 2026"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Committed amount (₹)"
              name="committedAmount"
              type="number"
              min="1"
              step="any"
              required
              defaultValue={editing?.committedAmount ?? ''}
              placeholder="100000"
            />
            <Input
              label="Start date"
              name="startDate"
              type="date"
              defaultValue={editing?.startDate ? editing.startDate.slice(0, 10) : ''}
              className="[color-scheme:dark]"
            />
          </div>
          {editing && (
            <Select
              label="Status"
              name="status"
              defaultValue={editing.status}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          )}
          <Textarea
            label="Notes (optional)"
            name="notes"
            defaultValue={editing?.notes ?? ''}
            placeholder="Agreed terms, payment schedule…"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? 'Save changes' : 'Create commitment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------ Detail ------------------------------ */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.investor?.name ?? 'Investor'} — ${detail.title}` : ''}
      >
        {detail && (
          <div className="space-y-5">
            {/* Totals */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Committed', value: inr.format(detail.committedAmount) },
                {
                  label: 'Received',
                  value: inr.format(detail.receivedTotal),
                  sub: `${detail.paymentCount} payments`,
                },
                {
                  label: 'Spent',
                  value: inr.format(detail.spentTotal),
                  sub: `${detail.expenseCount} expenses`,
                },
                { label: 'Balance', value: inr.format(detail.balanceAvailable) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {s.label}
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-white">{s.value}</p>
                  {s.sub && <p className="text-[10px] text-slate-500">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Funding progress */}
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-slate-400">Funding progress</span>
                <span className="tabular-nums text-slate-400">
                  {inr.format(detail.remainingToReceive)} pending
                </span>
              </div>
              <Meter value={detail.receivedTotal} max={detail.committedAmount} />
            </div>

            {/* Payments */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Installments received</h4>
                <Button size="sm" variant="secondary" onClick={() => setShowPayForm((s) => !s)}>
                  <Plus /> Add payment
                </Button>
              </div>

              {showPayForm && (
                <form
                  onSubmit={onAddPayment}
                  className="mb-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Amount (₹)" name="amount" type="number" min="1" step="any" required placeholder="15000" />
                    <Input label="Date" name="investedAt" type="date" className="[color-scheme:dark]" />
                  </div>
                  <Input label="Notes" name="notes" placeholder="First installment" />
                  <FileField
                    label="Invoice PDF (optional)"
                    name="invoice"
                    accept="application/pdf"
                    hint="PDF only — the investor can view & download it"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" type="submit" loading={busy}>
                      Save payment
                    </Button>
                  </div>
                </form>
              )}

              {detail.payments && detail.payments.length > 0 ? (
                <ul className="divide-y divide-white/5">
                  {detail.payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white tabular-nums">
                          {inr.format(p.amount)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {fmtDate(p.investedAt)}
                          {p.notes ? ` · ${p.notes}` : ''}
                        </p>
                      </div>
                      {p.invoiceUrl ? (
                        <span className="flex items-center gap-1">
                          <a
                            href={p.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="grid h-8 w-8 place-items-center rounded-lg text-brand-300 hover:bg-brand-500/10"
                            title="View invoice"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                          <a
                            href={invoiceDownloadUrl(p.invoiceUrl)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                            title="Download invoice"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide text-slate-600">no invoice</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No installments yet.</p>
              )}
            </section>

            {/* Expenses */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Money spent from this fund</h4>
                <Button size="sm" variant="secondary" onClick={() => setShowExpForm((s) => !s)}>
                  <Plus /> Add expense
                </Button>
              </div>

              {showExpForm && (
                <form
                  onSubmit={onAddExpense}
                  className="mb-3 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Amount (₹)" name="amount" type="number" min="1" step="any" required placeholder="5000" />
                    <Input label="Date" name="spentAt" type="date" className="[color-scheme:dark]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Category" name="category" placeholder="Marketing / Salaries / Tools…" />
                    <Input label="Description" name="description" placeholder="What it was spent on" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Proof (screenshot / bank receipt / invoice bill — PNG, JPG or PDF, up to 5)
                    </label>
                    <input
                      type="file"
                      name="attachments"
                      multiple
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="block w-full cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-2.5 text-xs text-slate-400 transition hover:border-brand-400/50 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-white/20"
                    />
                    <p className="text-[11px] text-slate-500">
                      The investor will see and can download these proof files.
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Available balance: <span className="text-emerald-300">{inr.format(detail.balanceAvailable)}</span>{' '}
                    — expenses can't exceed received funds.
                  </p>
                  <div className="flex justify-end">
                    <Button size="sm" type="submit" loading={busy}>
                      Save expense
                    </Button>
                  </div>
                </form>
              )}

              {detail.expenses && detail.expenses.length > 0 ? (
                <ul className="divide-y divide-white/5">
                  {detail.expenses.map((x) => (
                    <li key={x.id} className="flex items-center gap-3 py-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-slate-400 ring-1 ring-white/10">
                        <Receipt className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white tabular-nums">
                          {inr.format(x.amount)}
                          {x.category && (
                            <span className="ml-2 text-xs font-normal text-slate-400">{x.category}</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {fmtDate(x.spentAt)}
                          {x.description ? ` · ${x.description}` : ''}
                        </p>
                      </div>
                      {x.attachments.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          {x.attachments.map((a, i) => (
                            <a
                              key={i}
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              title={a.isPdf ? `${a.name} (PDF)` : `${a.name} (image)`}
                              className="grid h-7 w-7 place-items-center rounded-lg text-brand-300 hover:bg-brand-500/10"
                            >
                              {a.isPdf ? <FileText className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                            </a>
                          ))}
                        </span>
                      )}
                      <RowButton danger onClick={() => onDeleteExpense(x.id)} aria-label="Delete expense">
                        <Trash2 className="h-4 w-4" />
                      </RowButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Nothing spent from this fund yet.</p>
              )}
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
