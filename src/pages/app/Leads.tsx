import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import {
  listLeads,
  createLead,
  updateLead,
  deleteLead as apiDeleteLead,
  convertLeadToAccount,
} from '@/lib/leadApi';
import type { Lead, LeadStatus } from '@/types';

const STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
const TONE: Record<LeadStatus, Tone> = {
  NEW: 'blue',
  CONTACTED: 'sky',
  QUALIFIED: 'violet',
  CONVERTED: 'green',
  LOST: 'red',
};

export default function LeadsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);

  /* ------------------------------- Load data ------------------------------- */
  useEffect(() => {
    let on = true;
    setLoading(true);
    listLeads()
      .then((data) => on && setItems(data))
      .catch(
        (e) =>
          on && toast.error('Could not load leads', getErrorMessage(e, 'Admin access required.')),
      )
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [toast]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setOpen(true);
  };

  /* ------------------------------ Create / edit ---------------------------- */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      firstName: String(f.get('firstName') ?? ''),
      lastName: String(f.get('lastName') ?? ''),
      email: String(f.get('email') ?? ''),
      phone: String(f.get('phone') ?? ''),
      company: String(f.get('company') ?? ''),
      source: String(f.get('source') ?? ''),
      status: String(f.get('status') ?? 'NEW') as LeadStatus,
      notes: String(f.get('notes') ?? ''),
    };

    setBusy(true);
    try {
      if (editing) {
        const updated = await updateLead(editing.id, data);
        setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
        toast.success('Lead updated');
      } else {
        const created = await createLead(data);
        setItems((prev) => [created, ...prev]);
        toast.success('Lead created');
      }
      setOpen(false);
    } catch (err) {
      toast.error('Save failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------- Convert -------------------------------- */
  const convert = async (lead: Lead) => {
    if (lead.status === 'CONVERTED') return;
    setBusy(true);
    try {
      const { lead: updated, account } = await convertLeadToAccount(lead.id);
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      toast.success('Converted to account', `${account.companyName} is now a CRM account.`);
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
      await apiDeleteLead(id);
      toast.info('Lead deleted');
    } catch (err) {
      setItems(prev); // rollback
      toast.error('Delete failed', getErrorMessage(err));
    }
  };

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (l) => (
        <span className="font-medium text-white">{[l.firstName, l.lastName].filter(Boolean).join(' ')}</span>
      ),
    },
    { key: 'email', header: 'Email', render: (l) => l.email || '—' },
    { key: 'company', header: 'Company', render: (l) => l.company || '—' },
    { key: 'source', header: 'Source', render: (l) => l.source || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (l) => <StatusBadge tone={TONE[l.status]}>{humanize(l.status)}</StatusBadge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (l) => (
        <div className="flex justify-end gap-1">
          {l.status === 'CONVERTED' ? (
            <StatusBadge tone="green">Account</StatusBadge>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !l.company}
              title={l.company ? 'Convert to account' : 'Add a company first'}
              onClick={() => convert(l)}
            >
              <Building2 className="h-4 w-4" /> Convert
            </Button>
          )}
          <RowButton onClick={() => openEdit(l)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(l.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Capture and qualify your prospects, then convert them into accounts."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New lead
          </Button>
        }
      />

      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Leads promoted from inquiries appear here. Convert a qualified lead to create its account."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New lead
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit lead' : 'New lead'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" name="firstName" defaultValue={editing?.firstName} required />
            <Input label="Last name" name="lastName" defaultValue={editing?.lastName} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" name="email" type="email" defaultValue={editing?.email} />
            <Input label="Phone" name="phone" defaultValue={editing?.phone} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Company" name="company" defaultValue={editing?.company} />
            <Input label="Source" name="source" defaultValue={editing?.source} placeholder="Website, referral…" />
          </div>
          <Select
            label="Status"
            name="status"
            defaultValue={editing?.status ?? 'NEW'}
            options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          />
          <Textarea label="Notes" name="notes" defaultValue={editing?.notes} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {editing ? 'Save changes' : 'Create lead'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
