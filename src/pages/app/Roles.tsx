import { useState, type FormEvent } from 'react';
import { Pencil, Plus, ShieldHalf, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { useToast } from '@/components/ui/Toast';
import type { Role } from '@/types';

// Sample data so the table is populated in the UI.
// TODO: remove this once GET /roles is wired — start from [] instead.
const SAMPLE_ROLES: Role[] = [
  { id: '1', name: 'SUPER_ADMIN', description: 'Full access to every part of the platform.' },
  { id: '2', name: 'ADMIN', description: 'Manages users, roles and most settings.' },
  { id: '3', name: 'MANAGER', description: 'Oversees leads, projects and team tasks.' },
  { id: '4', name: 'ACCOUNTANT', description: 'Handles invoices, billing and finance.' },
  { id: '5', name: 'USER', description: 'Standard member access.' },
  { id: '6', name: 'CLIENT', description: 'External client with limited, scoped access.' },
];

export default function RolesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Role[]>(SAMPLE_ROLES);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  // TODO (load): GET /roles  (admin only)
  //   useEffect(() => { api.get('/roles').then((r) => setItems(r.data.data)); }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      // backend stores role names uppercase
      name: String(f.get('name') ?? '').trim().toUpperCase(),
      description: String(f.get('description') ?? ''),
    };

    if (editing) {
      // TODO (update): PUT /roles/:id → await api.put(`/roles/${editing.id}`, data)
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      toast.success('Role updated');
    } else {
      // TODO (create): POST /roles → const { data: res } = await api.post('/roles', data)
      setItems((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev]);
      toast.success('Role created');
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /roles/:id → await api.delete(`/roles/${id}`)
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Role deleted');
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (r) => <StatusBadge tone="blue">{r.name}</StatusBadge>,
    },
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(r); setOpen(true); }} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(r.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Define the access roles for your team."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldHalf}
          title="No roles yet"
          description="Wire up GET /roles to load them (admin only). Create one to preview the UI."
          action={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New role
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit role' : 'New role'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            defaultValue={editing?.name}
            placeholder="MANAGER"
            required
          />
          <Textarea
            label="Description"
            name="description"
            defaultValue={editing?.description}
            placeholder="What can this role do?"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Create role'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
