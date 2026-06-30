import { useEffect, useState, type FormEvent } from 'react';
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
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { createRole, deleteRole, listRoles, updateRole } from '@/lib/adminApi';
import { getErrorMessage } from '@/lib/utils';
import type { Role } from '@/types';

export default function RolesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  /* -------------------------------- Load roles ------------------------------- */
  useEffect(() => {
    let active = true;
    setLoading(true);
    listRoles()
      .then((roles) => {
        if (active) setItems(roles);
      })
      .catch((e) => {
        if (active) toast.error('Could not load roles', getErrorMessage(e, 'Admin access is required.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  /* ------------------------------ Create / update ---------------------------- */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: String(f.get('name') ?? '').trim(),
      description: String(f.get('description') ?? ''),
    };
    if (!input.name) return;

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateRole(editing.id, input);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? updated : it)));
        toast.success('Role updated');
      } else {
        const created = await createRole(input);
        setItems((prev) => [created, ...prev]);
        toast.success('Role created');
      }
      setOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(editing ? 'Update failed' : 'Create failed', getErrorMessage(e, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------- Delete --------------------------------- */
  const remove = async (role: Role) => {
    const prev = items;
    setItems((p) => p.filter((it) => it.id !== role.id)); // optimistic
    try {
      await deleteRole(role.id);
      toast.info('Role deleted', role.name);
    } catch (e) {
      setItems(prev); // rollback on failure
      toast.error('Delete failed', getErrorMessage(e, 'Please try again.'));
    }
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
          <RowButton onClick={() => { setEditing(r); setOpen(true); }} aria-label="Edit" title="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(r)} aria-label="Delete" title="Delete" danger>
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

      {loading ? (
        <LoadingCard label="Loading roles…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldHalf}
          title="No roles yet"
          description="Create a role to get started. Roles control what each user can access."
          action={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New role
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Edit role' : 'New role'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            defaultValue={editing?.name}
            placeholder="MANAGER"
            hint="Stored in uppercase."
            required
          />
          <Textarea
            label="Description"
            name="description"
            defaultValue={editing?.description}
            placeholder="What can this role do?"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setOpen(false); setEditing(null); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
