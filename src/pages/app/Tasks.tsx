import { useState, type FormEvent } from 'react';
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
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
import type { Task, TaskPriority, TaskStatus } from '@/types';

const STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_TONE: Record<TaskStatus, Tone> = {
  PENDING: 'gray',
  IN_PROGRESS: 'sky',
  COMPLETED: 'green',
  CANCELLED: 'red',
};
const PRIORITY_TONE: Record<TaskPriority, Tone> = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'amber',
  URGENT: 'red',
};

export default function TasksPage() {
  const toast = useToast();
  const [items, setItems] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // TODO (load): GET /tasks

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      title: String(f.get('title') ?? ''),
      description: String(f.get('description') ?? ''),
      status: String(f.get('status') ?? 'PENDING') as TaskStatus,
      priority: String(f.get('priority') ?? 'MEDIUM') as TaskPriority,
      dueDate: String(f.get('dueDate') ?? ''),
    };

    if (editing) {
      // TODO (update): PATCH /tasks/:id  (mark done via PATCH /tasks/:id/complete)
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      toast.success('Task updated');
    } else {
      // TODO (create): POST /tasks
      setItems((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev]);
      toast.success('Task created');
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /tasks/:id
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Task deleted');
  };

  const columns: Column<Task>[] = [
    { key: 'title', header: 'Title', render: (t) => <span className="font-medium text-white">{t.title}</span> },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => <StatusBadge tone={PRIORITY_TONE[t.priority]}>{humanize(t.priority)}</StatusBadge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge tone={STATUS_TONE[t.status]}>{humanize(t.status)}</StatusBadge>,
    },
    {
      key: 'dueDate',
      header: 'Due',
      render: (t) => (t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (t) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(t); setOpen(true); }} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(t.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Your to-dos and assignments."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Wire up GET /tasks to load them. Create one to preview the UI."
          action={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New task
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit task' : 'New task'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Title" name="title" defaultValue={editing?.title} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Priority"
              name="priority"
              defaultValue={editing?.priority ?? 'MEDIUM'}
              options={PRIORITIES.map((p) => ({ value: p, label: humanize(p) }))}
            />
            <Select
              label="Status"
              name="status"
              defaultValue={editing?.status ?? 'PENDING'}
              options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
            />
          </div>
          <Input
            label="Due date"
            name="dueDate"
            type="date"
            defaultValue={editing?.dueDate?.slice(0, 10)}
            className="!pl-4 [color-scheme:dark]"
          />
          <Textarea label="Description" name="description" defaultValue={editing?.description} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Create task'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
