import { useState, type FormEvent } from 'react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { RowButton } from '@/components/ui/RowButton';
import { useToast } from '@/components/ui/Toast';
import type { Contact } from '@/types';

export default function ContactsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  // TODO (load): GET /contacts

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      firstName: String(f.get('firstName') ?? ''),
      lastName: String(f.get('lastName') ?? ''),
      email: String(f.get('email') ?? ''),
      phone: String(f.get('phone') ?? ''),
      designation: String(f.get('designation') ?? ''),
      notes: String(f.get('notes') ?? ''),
    };

    if (editing) {
      // TODO (update): PATCH /contacts/:id
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      toast.success('Contact updated');
    } else {
      // TODO (create): POST /contacts — body also needs accountId
      setItems((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev]);
      toast.success('Contact created');
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /contacts/:id
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Contact deleted');
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (c) => (
        <span className="font-medium text-white">{[c.firstName, c.lastName].filter(Boolean).join(' ')}</span>
      ),
    },
    { key: 'designation', header: 'Designation', render: (c) => c.designation || '—' },
    { key: 'email', header: 'Email', render: (c) => c.email || '—' },
    { key: 'phone', header: 'Phone', render: (c) => c.phone || '—' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(c); setOpen(true); }} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(c.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="People at your accounts."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New contact
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No contacts yet"
          description="Wire up GET /contacts to load them. Create one to preview the UI."
          action={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New contact
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit contact' : 'New contact'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" name="firstName" defaultValue={editing?.firstName} required />
            <Input label="Last name" name="lastName" defaultValue={editing?.lastName} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" name="email" type="email" defaultValue={editing?.email} />
            <Input label="Phone" name="phone" defaultValue={editing?.phone} />
          </div>
          <Input label="Designation" name="designation" defaultValue={editing?.designation} placeholder="CTO, Buyer…" />
          <Textarea label="Notes" name="notes" defaultValue={editing?.notes} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Create contact'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
