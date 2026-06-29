import { useState, type FormEvent } from 'react';
import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react';
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
import type { Project, ProjectStatus } from '@/types';

const STATUSES: ProjectStatus[] = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const TONE: Record<ProjectStatus, Tone> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'sky',
  ON_HOLD: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

const money = (n?: number) =>
  n ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '—';

export default function ProjectsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  // TODO (load): GET /projects

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      name: String(f.get('name') ?? ''),
      description: String(f.get('description') ?? ''),
      status: String(f.get('status') ?? 'PLANNED') as ProjectStatus,
      startDate: String(f.get('startDate') ?? ''),
      endDate: String(f.get('endDate') ?? ''),
      budget: Number(f.get('budget') ?? 0) || undefined,
    };

    if (editing) {
      // TODO (update): PATCH /projects/:id
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      toast.success('Project updated');
    } else {
      // TODO (create): POST /projects
      setItems((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev]);
      toast.success('Project created');
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /projects/:id
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Project deleted');
  };

  const columns: Column<Project>[] = [
    { key: 'name', header: 'Name', render: (p) => <span className="font-medium text-white">{p.name}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge tone={TONE[p.status]}>{humanize(p.status)}</StatusBadge>,
    },
    { key: 'budget', header: 'Budget', render: (p) => money(p.budget) },
    {
      key: 'dates',
      header: 'Timeline',
      render: (p) =>
        p.startDate || p.endDate
          ? `${p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'} → ${
              p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'
            }`
          : '—',
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(p); setOpen(true); }} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(p.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Plan and deliver your work."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Wire up GET /projects to load them. Create one to preview the UI."
          action={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit project' : 'New project'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Name" name="name" defaultValue={editing?.name} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              name="status"
              defaultValue={editing?.status ?? 'PLANNED'}
              options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
            />
            <Input label="Budget (USD)" name="budget" type="number" min={0} defaultValue={editing?.budget} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              name="startDate"
              type="date"
              defaultValue={editing?.startDate?.slice(0, 10)}
              className="!pl-4 [color-scheme:dark]"
            />
            <Input
              label="End date"
              name="endDate"
              type="date"
              defaultValue={editing?.endDate?.slice(0, 10)}
              className="!pl-4 [color-scheme:dark]"
            />
          </div>
          <Textarea label="Description" name="description" defaultValue={editing?.description} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Create project'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
