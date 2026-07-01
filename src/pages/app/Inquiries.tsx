import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MessageSquare, Trash2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import {
  listInquiries,
  updateInquiryStatus,
  deleteInquiry as apiDeleteInquiry,
  convertInquiryToLead,
} from '@/lib/inquiryApi';
import type { ContactInquiry, InquiryStatus } from '@/types';

const STATUSES: InquiryStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];
const TONE: Record<InquiryStatus, Tone> = {
  NEW: 'blue',
  ASSIGNED: 'sky',
  IN_PROGRESS: 'amber',
  COMPLETED: 'green',
};

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

export default function InquiriesPage() {
  const toast = useToast();
  const [items, setItems] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ContactInquiry | null>(null);
  const [busy, setBusy] = useState(false);

  /* ------------------------------- Load data ------------------------------- */
  useEffect(() => {
    let on = true;
    setLoading(true);
    listInquiries()
      .then((data) => on && setItems(data))
      .catch(
        (e) =>
          on && toast.error('Could not load inquiries', getErrorMessage(e, 'Admin access required.')),
      )
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [toast]);

  const newCount = useMemo(() => items.filter((i) => i.status === 'NEW').length, [items]);

  /* ----------------------------- Update status ----------------------------- */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!active) return;
    const f = new FormData(e.currentTarget);
    const status = String(f.get('status') ?? 'NEW') as InquiryStatus;

    setBusy(true);
    try {
      const updated = await updateInquiryStatus(active.id, status);
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      // Keep the modal open and refresh the active row so the "Convert to lead"
      // button re-evaluates immediately (it unlocks once status is ASSIGNED).
      setActive(updated);
      toast.success('Inquiry updated');
    } catch (err) {
      toast.error('Update failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- Convert --------------------------------- */
  const convert = async (inq: ContactInquiry) => {
    // Server enforces this too; guard the UI so the action can't be triggered
    // before the inquiry has been assigned.
    if (inq.status !== 'ASSIGNED') return;
    setBusy(true);
    try {
      const { account } = await convertInquiryToLead(inq.id);
      // Conversion also completes the inquiry on the backend.
      const done = (it: ContactInquiry) => ({
        ...it,
        isConverted: true,
        status: 'COMPLETED' as InquiryStatus,
      });
      setItems((prev) => prev.map((it) => (it.id === inq.id ? done(it) : it)));
      setActive((prev) => (prev && prev.id === inq.id ? done(prev) : prev));
      toast.success(
        'Converted to lead',
        account
          ? `${inq.name} is now a lead under ${account.companyName}.`
          : `${inq.name} is now in the leads pipeline.`,
      );
      setOpen(false);
    } catch (err) {
      toast.error('Convert failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------- Delete --------------------------------- */
  const remove = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((it) => it.id !== id)); // optimistic
    try {
      await apiDeleteInquiry(id);
      toast.info('Inquiry deleted');
    } catch (err) {
      setItems(prev); // rollback
      toast.error('Delete failed', getErrorMessage(err));
    }
  };

  const columns: Column<ContactInquiry>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (i) => <span className="font-medium text-white">{i.name}</span>,
    },
    { key: 'email', header: 'Email' },
    { key: 'company', header: 'Company', render: (i) => i.company || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (i) =>
        i.isConverted ? (
          <StatusBadge tone="green">Converted</StatusBadge>
        ) : (
          <StatusBadge tone={TONE[i.status]}>{humanize(i.status)}</StatusBadge>
        ),
    },
    { key: 'createdAt', header: 'Received', render: (i) => fmtDate(i.createdAt) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (i) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setActive(i);
              setOpen(true);
            }}
          >
            View
          </Button>
          <RowButton onClick={() => remove(i.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inquiries"
        subtitle={
          newCount > 0
            ? `Inbound requests from your contact form — ${newCount} new.`
            : 'Inbound requests from your contact form.'
        }
      />

      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No inquiries yet"
          description="Submissions from the esscentra.in contact form will appear here automatically."
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Inquiry">
        {active && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
              <p className="font-semibold text-white">{active.name}</p>
              <p className="text-slate-400">{active.email}</p>
              {active.phone && <p className="text-slate-400">{active.phone}</p>}
              {active.company && <p className="text-slate-400">{active.company}</p>}
              <p className="mt-2 whitespace-pre-wrap text-slate-300">{active.message}</p>
              <p className="mt-2 text-xs text-slate-500">Received {fmtDate(active.createdAt)}</p>
            </div>

            <Select
              label="Status"
              name="status"
              defaultValue={active.status}
              disabled={active.isConverted}
              options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              {active.isConverted ? (
                <span className="text-sm text-emerald-400">Already converted to a lead.</span>
              ) : (
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || active.status !== 'ASSIGNED'}
                    onClick={() => convert(active)}
                  >
                    <UserPlus className="h-4 w-4" /> Convert to lead
                  </Button>
                  {active.status !== 'ASSIGNED' && (
                    <span className="text-xs text-slate-500">
                      Set status to “Assigned” and update first.
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || active.isConverted}>
                  Update status
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
