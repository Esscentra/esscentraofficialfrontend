import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarClock, Coins, Lock, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import { Pill, Section, SelectControl } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { listUsers } from '@/lib/adminApi';
import {
  createMarketerPayment,
  deleteMarketerPayment,
  listMarketerPayments,
  updateMarketerPayment,
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  type MarketerPayment,
  type MarketerPaymentStatus,
  type MarketerPaymentsView,
} from '@/lib/marketerApi';
import { useMarketerData } from '../marketer/useMarketerData';
import { humanize, inr } from '@/lib/format';
import { getErrorMessage, isSuperAdminRole, normalizeRoleName } from '@/lib/utils';
import type { User } from '@/types';

/**
 * ============================================================================
 *  CONTRACTOR PAYMENTS — admin
 * ============================================================================
 *
 * The company's statement of what it owes contract staff, and the only place
 * it is written. Reads are open to admins; every write is super admin only —
 * enforced server-side, mirrored here by hiding the controls.
 * ============================================================================
 */

const STATUS_TONE: Record<string, 'green' | 'amber' | 'blue'> = {
  RECEIVED: 'green',
  LOCKED: 'amber',
  UPCOMING: 'blue',
};

function ddmmyyyy(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

function personName(ref: unknown): string {
  if (!ref || typeof ref !== 'object') return '—';
  const person = ref as { firstName?: string; lastName?: string; email?: string };
  return (
    [person.firstName, person.lastName].filter(Boolean).join(' ') ||
    person.email ||
    '—'
  );
}

export default function MarketerPaymentsAdmin() {
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin = isSuperAdminRole(user?.role);

  const [marketerId, setMarketerId] = useState('');
  const [status, setStatus] = useState('');
  const [people, setPeople] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MarketerPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [formStatus, setFormStatus] = useState<MarketerPaymentStatus>('UPCOMING');

  const { data, loading, error, reload } = useMarketerData<MarketerPaymentsView>(
    () => listMarketerPayments({ marketerId, status }),
    [marketerId, status],
  );

  useEffect(() => {
    listUsers()
      .then(setPeople)
      .catch(() => {
        // The picker degrades to empty rather than breaking the page.
      });
  }, []);

  /** Only contract staff can be paid through this ledger. */
  const marketers = useMemo(
    () =>
      people.filter(
        (person) =>
          normalizeRoleName(person.role) === 'FREELANCE_PERFORMANCE_MARKETER',
      ),
    [people],
  );

  const openCreate = () => {
    setEditing(null);
    setFormStatus('UPCOMING');
    setOpen(true);
  };

  const openEdit = (row: MarketerPayment) => {
    setEditing(row);
    setFormStatus(row.status);
    setOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const input = {
      marketerId: String(form.get('marketerId') ?? ''),
      title: String(form.get('title') ?? '').trim(),
      description: String(form.get('description') ?? ''),
      amount: String(form.get('amount') ?? ''),
      status: String(form.get('status') ?? 'UPCOMING') as MarketerPaymentStatus,
      dueDate: String(form.get('dueDate') ?? ''),
      releaseDate: String(form.get('releaseDate') ?? ''),
      lockReason: String(form.get('lockReason') ?? ''),
      receivedAt: String(form.get('receivedAt') ?? ''),
      paymentMode: String(form.get('paymentMode') ?? '') as never,
      referenceNumber: String(form.get('referenceNumber') ?? ''),
    };

    if (!input.marketerId || !input.title || !input.amount) {
      toast.error('Missing details', 'Freelancer, title and amount are required.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateMarketerPayment(editing._id, input);
        toast.success('Payment updated', `${input.title} has been saved.`);
      } else {
        await createMarketerPayment(input);
        toast.success('Payment recorded', `${input.title} has been added.`);
      }
      setOpen(false);
      reload();
    } catch (thrown) {
      toast.error('Could not save', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: MarketerPayment) => {
    try {
      await deleteMarketerPayment(row._id);
      toast.success('Deleted', `${row.title} has been removed.`);
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Contractor payments"
        subtitle="What each freelancer has been paid, what is held, and what is scheduled. Only a super admin can change it."
        action={
          isSuperAdmin ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Record payment
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3">
        <SelectControl
          label="Freelancer"
          value={marketerId}
          onChange={setMarketerId}
          options={[
            { value: '', label: 'All freelancers' },
            ...marketers.map((person) => ({
              value: person.id,
              label: person.name,
            })),
          ]}
        />
        <SelectControl
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All statuses' },
            ...PAYMENT_STATUSES.map((value) => ({
              value,
              label: humanize(value),
            })),
          ]}
        />
      </div>

      {loading ? (
        <>
          <CardGridSkeleton count={4} />
          <TableSkeleton />
        </>
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              icon={Wallet}
              label="Paid out"
              value={data.summary.received.amount}
              format={inr}
              hint={`${data.summary.received.count} settled`}
              tone="green"
            />
            <FinanceCard
              icon={Lock}
              label="Held"
              value={data.summary.locked.amount}
              format={inr}
              hint={`${data.summary.locked.count} retained`}
              tone="amber"
            />
            <FinanceCard
              icon={CalendarClock}
              label="Scheduled"
              value={data.summary.upcoming.amount}
              format={inr}
              hint={
                data.summary.nextPaymentDate
                  ? `next on ${ddmmyyyy(data.summary.nextPaymentDate)}`
                  : 'nothing scheduled'
              }
              tone="sky"
            />
            <FinanceCard
              icon={Coins}
              label="Total committed"
              value={data.summary.totalEngagement}
              format={inr}
              hint="Across the filtered view"
              tone="brand"
            />
          </div>

          {!isSuperAdmin && (
            <InfoNote tone="info">
              You can review this ledger, but only a super admin can record or
              change a payment.
            </InfoNote>
          )}

          <Section
            title="Payment ledger"
            description="Every line recorded against contract staff."
          >
            <FinanceTable<MarketerPayment>
              rows={data.rows}
              rowKey={(row) => row._id}
              emptyTitle="No payments recorded"
              emptyMessage="Record the first payment with the button above."
              maxHeight={620}
              columns={[
                {
                  key: 'marketer',
                  header: 'Freelancer',
                  render: (row) => (
                    <span className="font-medium text-slate-100">
                      {personName(row.marketerId)}
                    </span>
                  ),
                },
                {
                  key: 'title',
                  header: 'Payment',
                  render: (row) => (
                    <div className="min-w-0">
                      <p className="truncate text-slate-200">{row.title}</p>
                      {row.status === 'LOCKED' && row.lockReason && (
                        <p className="truncate text-xs text-amber-300/80">
                          {row.lockReason}
                        </p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'date',
                  header: 'Date',
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="whitespace-nowrap text-slate-300">
                      {row.status === 'RECEIVED'
                        ? ddmmyyyy(row.receivedAt)
                        : row.status === 'LOCKED'
                          ? ddmmyyyy(row.releaseDate)
                          : ddmmyyyy(row.dueDate)}
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
                  key: 'status',
                  header: 'Status',
                  align: 'center',
                  render: (row) => (
                    <Pill tone={STATUS_TONE[row.status] ?? 'gray'}>
                      {humanize(row.status)}
                    </Pill>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'center',
                  render: (row) =>
                    isSuperAdmin ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    ),
                },
              ]}
              footer={
                <>
                  <TotalCell numeric={false}>Total</TotalCell>
                  <TotalCell numeric={false}>
                    <span className="text-slate-400">
                      {data.rows.length} record{data.rows.length === 1 ? '' : 's'}
                    </span>
                  </TotalCell>
                  <TotalCell numeric={false} hideOnMobile>
                    <span />
                  </TotalCell>
                  <TotalCell>
                    {inr(data.rows.reduce((sum, row) => sum + row.amount, 0))}
                  </TotalCell>
                  <TotalCell numeric={false}>
                    <span />
                  </TotalCell>
                  <TotalCell numeric={false}>
                    <span />
                  </TotalCell>
                </>
              }
            />
          </Section>
        </>
      )}

      {/* -------------------------------- editor ------------------------------- */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.title}` : 'Record a payment'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Select
            label="Freelancer"
            name="marketerId"
            defaultValue={
              editing
                ? String(
                    typeof editing.marketerId === 'object'
                      ? editing.marketerId?._id
                      : editing.marketerId,
                  )
                : ''
            }
            options={[
              { value: '', label: 'Select a freelancer' },
              ...marketers.map((person) => ({
                value: person.id,
                label: person.name,
              })),
            ]}
          />

          <Input label="Title" name="title" defaultValue={editing?.title} required />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Amount (INR)"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={editing?.amount}
              className="!pl-4"
              required
            />
            <Select
              label="Status"
              name="status"
              value={formStatus}
              onChange={(event) =>
                setFormStatus(event.target.value as MarketerPaymentStatus)
              }
              options={PAYMENT_STATUSES.map((value) => ({
                value,
                label: humanize(value),
              }))}
            />
          </div>

          {/* The status decides which dates are meaningful, so only those show. */}
          {formStatus === 'UPCOMING' && (
            <Input
              label="Due date"
              name="dueDate"
              type="date"
              defaultValue={editing?.dueDate?.slice(0, 10)}
              className="!pl-4"
            />
          )}

          {formStatus === 'LOCKED' && (
            <div className="space-y-4">
              <Input
                label="Release date"
                name="releaseDate"
                type="date"
                defaultValue={editing?.releaseDate?.slice(0, 10)}
                className="!pl-4"
              />
              <Input
                label="Why is it held?"
                name="lockReason"
                defaultValue={editing?.lockReason}
                placeholder="Released on campaign completion"
              />
            </div>
          )}

          {formStatus === 'RECEIVED' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Received on"
                name="receivedAt"
                type="date"
                defaultValue={editing?.receivedAt?.slice(0, 10)}
                className="!pl-4"
              />
              <Select
                label="Payment mode"
                name="paymentMode"
                defaultValue={editing?.paymentMode ?? 'BANK_TRANSFER'}
                options={PAYMENT_MODES.map((value) => ({
                  value,
                  label: humanize(value),
                }))}
              />
            </div>
          )}

          <Input
            label="Reference number"
            name="referenceNumber"
            defaultValue={editing?.referenceNumber}
            placeholder="UTR / transaction id"
          />

          <Textarea
            label="Description"
            name="description"
            rows={3}
            defaultValue={editing?.description}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Record payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
