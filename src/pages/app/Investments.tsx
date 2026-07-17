import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Download, FileText, IndianRupee, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { FileField } from '@/components/ui/FileField';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import { listUsers } from '@/lib/adminApi';
import {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment as apiDeleteInvestment,
  invoiceDownloadUrl,
  type Investment,
} from '@/lib/investmentApi';
import type { User } from '@/types';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function InvestmentsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Investment[]>([]);
  const [investors, setInvestors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [busy, setBusy] = useState(false);

  /* ------------------------------- Load data ------------------------------- */
  useEffect(() => {
    let on = true;
    setLoading(true);
    Promise.all([listInvestments(), listUsers()])
      .then(([inv, users]) => {
        if (!on) return;
        setItems(inv);
        // The picker leads with INVESTOR accounts; other roles are still
        // selectable below in case a record predates the role change.
        setInvestors(users);
      })
      .catch(
        (e) =>
          on &&
          toast.error('Could not load investments', getErrorMessage(e, 'Admin access required.')),
      )
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [toast]);

  const investorOptions = useMemo(() => {
    const investorsFirst = [...investors].sort((a, b) => {
      const ai = a.role === 'INVESTOR' ? 0 : 1;
      const bi = b.role === 'INVESTOR' ? 0 : 1;
      return ai - bi || a.name.localeCompare(b.name);
    });
    return investorsFirst.map((u) => ({
      value: u.id,
      label: `${u.name} (${u.email})${u.role === 'INVESTOR' ? '' : ` — ${u.role}`}`,
    }));
  }, [investors]);

  const totalRecorded = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (inv: Investment) => {
    setEditing(inv);
    setOpen(true);
  };

  /* ------------------------------ Create / edit ---------------------------- */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const invoice = f.get('invoice');
    const input = {
      investorId: String(f.get('investorId') ?? ''),
      amount: Number(f.get('amount') ?? 0),
      investedAt: String(f.get('investedAt') ?? ''),
      notes: String(f.get('notes') ?? ''),
      invoice: invoice instanceof File && invoice.size > 0 ? invoice : undefined,
    };

    setBusy(true);
    try {
      if (editing) {
        const updated = await updateInvestment(editing.id, input);
        setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
        toast.success('Investment updated');
      } else {
        const created = await createInvestment(input);
        setItems((prev) => [created, ...prev]);
        toast.success('Investment recorded', 'The investor can now see it on their dashboard.');
      }
      setOpen(false);
    } catch (err) {
      toast.error('Could not save', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (inv: Investment) => {
    if (!window.confirm(`Delete this ${inr.format(inv.amount)} investment record?`)) return;
    try {
      await apiDeleteInvestment(inv.id);
      setItems((prev) => prev.filter((i) => i.id !== inv.id));
      toast.info('Investment deleted');
    } catch (err) {
      toast.error('Could not delete', getErrorMessage(err));
    }
  };

  /* --------------------------------- Table --------------------------------- */
  const columns: Column<Investment>[] = [
    {
      key: 'investor',
      header: 'Investor',
      render: (i) => (
        <div>
          <p className="font-medium text-white">{i.investor?.name || '—'}</p>
          <p className="text-xs text-slate-500">{i.investor?.email}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (i) => <span className="font-semibold tabular-nums">{inr.format(i.amount)}</span>,
    },
    { key: 'investedAt', header: 'Date', render: (i) => fmtDate(i.investedAt) },
    {
      key: 'invoice',
      header: 'Invoice',
      render: (i) =>
        i.invoiceUrl ? (
          <span className="inline-flex items-center gap-1">
            <a
              href={i.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/10"
              title="View invoice PDF"
            >
              <FileText className="h-3.5 w-3.5" /> View
            </a>
            <a
              href={invoiceDownloadUrl(i.invoiceUrl)}
              onClick={(e) => e.stopPropagation()}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Download invoice PDF"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </span>
        ) : (
          <StatusBadge tone="amber">no pdf</StatusBadge>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (i) => (
        <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
          <RowButton onClick={() => openEdit(i)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton danger onClick={() => onDelete(i)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Investments"
        subtitle={`Record investor contributions and attach the invoice PDF. Total recorded: ${inr.format(totalRecorded)}.`}
        action={
          <Button onClick={openCreate}>
            <Plus /> Record investment
          </Button>
        }
      />

      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No investments recorded"
          description="Record an investor's contribution and upload its invoice — they'll see it on their dashboard instantly."
          action={
            <Button onClick={openCreate}>
              <Plus /> Record investment
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} onRowClick={openEdit} />
      )}

      {/* ------------------------------ Modal form ----------------------------- */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit investment' : 'Record investment'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Select
            label="Investor"
            name="investorId"
            required
            defaultValue={editing?.investor?.id ?? ''}
            options={[{ value: '', label: 'Select an investor…' }, ...investorOptions]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (₹)"
              name="amount"
              type="number"
              min="1"
              step="any"
              required
              defaultValue={editing?.amount ?? ''}
              placeholder="500000"
            />
            <Input
              label="Date"
              name="investedAt"
              type="date"
              defaultValue={editing?.investedAt ? editing.investedAt.slice(0, 10) : ''}
              className="[color-scheme:dark]"
            />
          </div>
          <Textarea
            label="Notes (optional)"
            name="notes"
            defaultValue={editing?.notes ?? ''}
            placeholder="Round, terms, reference number…"
          />
          <FileField
            label={editing?.invoiceUrl ? 'Replace invoice PDF (optional)' : 'Invoice PDF (optional)'}
            name="invoice"
            accept="application/pdf"
            hint="PDF only — stored on Cloudinary, visible to this investor"
          />
          {editing?.invoiceUrl && (
            <p className="text-xs text-slate-500">
              Current invoice:{' '}
              <a
                href={editing.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-300 hover:underline"
              >
                view PDF
              </a>{' '}
              — uploading a new file replaces it.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? 'Save changes' : 'Record investment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
