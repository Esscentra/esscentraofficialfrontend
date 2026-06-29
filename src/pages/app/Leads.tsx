import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { useToast } from '@/components/ui/Toast';
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  // TODO (load): GET /leads
  //   useEffect(() => { api.get('/leads').then((r) => setItems(r.data.data)); }, []);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setOpen(true);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
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

    if (editing) {
      // TODO (update): PATCH /leads/:id → await api.patch(`/leads/${editing.id}`, data)
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      toast.success('Lead updated');
    } else {
      // TODO (create): POST /leads → const { data: res } = await api.post('/leads', data)
      setItems((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev]);
      toast.success('Lead created');
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /leads/:id → await api.delete(`/leads/${id}`)
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Lead deleted');
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
        subtitle="Capture and qualify your prospects."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New lead
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Once you wire up GET /leads, your leads will appear here. For now, create one to preview the UI."
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
            <Button type="submit">{editing ? 'Save changes' : 'Create lead'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
