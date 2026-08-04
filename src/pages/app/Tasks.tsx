import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { useAuth } from '@/context/AuthContext';
import {
  createTask,
  deleteTask as deleteTaskApi,
  listTasks,
  updateTask,
  type TaskInput,
} from '@/lib/taskApi';
import { listProjects } from '@/lib/projectApi';
import { listUsers } from '@/lib/adminApi';
import { cn, getErrorMessage, isAdminRole, isMarketerRole } from '@/lib/utils';
import type {
  ContractStatus,
  PaymentStatus,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  User,
} from '@/types';

const STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CONTRACT_STATUSES: ContractStatus[] = ['PENDING', 'ACTIVE', 'COMPLETED'];
const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'];

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
const CONTRACT_TONE: Record<ContractStatus, Tone> = {
  PENDING: 'amber',
  ACTIVE: 'green',
  COMPLETED: 'gray',
};

/** Status tabs. '' is "all". */
const TABS: Array<{ key: TaskStatus | ''; label: string }> = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 20;

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');

export default function TasksPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only admins create or edit tasks. Everyone else — including the assigned
  // contractor — gets a read-only list that opens the detail page.
  const canManage = isAdminRole(user?.role);
  const isMarketer = isMarketerRole(user?.role);

  const [items, setItems] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

  /** Assignable accounts and company projects — only needed for the admin form. */
  const [people, setPeople] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    listTasks({ status, search: query, page, limit: PAGE_SIZE })
      .then((res) => {
        setItems(res.tasks);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((e) => toast.error('Could not load tasks', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [status, query, page, toast]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!canManage) return;
    // Both lists are gated; failing quietly leaves the form usable without
    // the pickers rather than blocking task creation entirely.
    listUsers().then(setPeople).catch(() => {});
    listProjects().then(setProjects).catch(() => {});
  }, [canManage]);

  // Debounce the search box so each keystroke isn't a request.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input: TaskInput = {
      title: String(f.get('title') ?? '').trim(),
      description: String(f.get('description') ?? ''),
      status: String(f.get('status') ?? 'PENDING') as TaskStatus,
      priority: String(f.get('priority') ?? 'MEDIUM') as TaskPriority,
      dueDate: String(f.get('dueDate') ?? ''),
      assignedTo: String(f.get('assignedTo') ?? ''),
      projectId: String(f.get('projectId') ?? ''),
      contractStatus: String(f.get('contractStatus') ?? 'PENDING') as ContractStatus,
      contractStartDate: String(f.get('contractStartDate') ?? ''),
      contractEndDate: String(f.get('contractEndDate') ?? ''),
      reportingTo: String(f.get('reportingTo') ?? ''),
      metaAdsSpend: String(f.get('metaAdsSpend') ?? ''),
      paymentStatus: String(f.get('paymentStatus') ?? 'PENDING') as PaymentStatus,
    };
    if (!input.title) return;

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateTask(editing.id, input);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? updated : it)));
        toast.success('Task updated');
      } else {
        await createTask(input);
        toast.success('Task created');
        load();
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(
        editing ? 'Update failed' : 'Create failed',
        getErrorMessage(err, 'Please try again.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (task: Task) => {
    if (
      !window.confirm(
        `Delete "${task.title}"?\n\n` +
          `Its documents and weekly reports go with it. This cannot be undone.`,
      )
    )
      return;

    const prev = items;
    setItems((p) => p.filter((it) => it.id !== task.id)); // optimistic
    try {
      await deleteTaskApi(task.id);
      toast.info('Task deleted', task.title);
    } catch (err) {
      setItems(prev);
      toast.error('Delete failed', getErrorMessage(err, 'Please try again.'));
    }
  };

  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (t) => (
        <div className="min-w-0">
          <span className="font-medium text-white">{t.title}</span>
          <p className="truncate text-xs text-slate-500">
            {t.projectName ?? 'No project'}
            {!isMarketer && t.assignedToName && ` · ${t.assignedToName}`}
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => (
        <StatusBadge tone={PRIORITY_TONE[t.priority]}>{humanize(t.priority)}</StatusBadge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <StatusBadge tone={STATUS_TONE[t.status]}>{humanize(t.status)}</StatusBadge>
      ),
    },
    {
      key: 'contract',
      header: 'Contract',
      render: (t) => (
        <StatusBadge tone={CONTRACT_TONE[t.contractStatus]}>
          {humanize(t.contractStatus)}
        </StatusBadge>
      ),
    },
    { key: 'dueDate', header: 'Due', render: (t) => day(t.dueDate) },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (t: Task) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <RowButton
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                  aria-label="Edit"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </RowButton>
                <RowButton onClick={() => remove(t)} aria-label="Delete" title="Delete" danger>
                  <Trash2 className="h-4 w-4" />
                </RowButton>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={
          isMarketer
            ? 'The work you are contracted on. Open one for its agreement, deadline and weekly reports.'
            : 'Assign work, attach agreements and track delivery.'
        }
        action={
          canManage ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New task
            </Button>
          ) : undefined
        }
      />

      {/* ------------------------------- filters ------------------------------- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key || 'all'}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                status === tab.key
                  ? 'bg-white/[0.1] text-white'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            label=""
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description"
            icon={<Search />}
          />
        </div>
      </div>

      {loading ? (
        <LoadingCard label="Loading tasks…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={
            query || status
              ? 'Nothing matches'
              : isMarketer
                ? 'No tasks assigned yet'
                : 'No tasks yet'
          }
          description={
            query || status
              ? 'Try a different search or status filter.'
              : isMarketer
                ? 'Once work is assigned to you it appears here, with its agreement and deadline.'
                : canManage
                  ? 'Create a task and assign it to someone.'
                  : 'Tasks are created by an admin.'
          }
          action={
            canManage && !query && !status ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> New task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            onRowClick={(t) => navigate(`/app/tasks/${t.id}`)}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages} · {total.toLocaleString()} tasks
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / edit — admin only; never rendered for anyone else. */}
      {canManage && (
        <Modal
          open={open}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          title={editing ? 'Edit task' : 'New task'}
        >
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Due date"
                name="dueDate"
                type="date"
                defaultValue={editing?.dueDate?.slice(0, 10)}
                className="!pl-4"
              />
              <Select
                label="Company project"
                name="projectId"
                defaultValue={editing?.projectId ?? ''}
                options={[
                  { value: '', label: 'Not part of a project' },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>

            <Textarea label="Description" name="description" defaultValue={editing?.description} />

            {/* ---------------------- contractor engagement --------------------- */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Assignment &amp; contract
              </p>
              <p className="mb-3 text-[11px] text-slate-500">
                Leave the contract fields alone for ordinary internal to-dos.
              </p>

              <div className="space-y-4">
                <Select
                  label="Assigned to"
                  name="assignedTo"
                  defaultValue={editing?.assignedTo ?? ''}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...people.map((p) => ({
                      value: p.id,
                      label: `${p.name} — ${p.role.replace(/_/g, ' ').toLowerCase()}`,
                    })),
                  ]}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Contract status"
                    name="contractStatus"
                    defaultValue={editing?.contractStatus ?? 'PENDING'}
                    options={CONTRACT_STATUSES.map((s) => ({
                      value: s,
                      label: humanize(s),
                    }))}
                  />
                  <Select
                    label="Payment status"
                    name="paymentStatus"
                    defaultValue={editing?.paymentStatus ?? 'PENDING'}
                    options={PAYMENT_STATUSES.map((s) => ({
                      value: s,
                      label: humanize(s),
                    }))}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Reporting to"
                    name="reportingTo"
                    defaultValue={editing?.reportingTo ?? ''}
                    options={[
                      { value: '', label: 'Not set' },
                      ...people.map((p) => ({
                        value: p.id,
                        label: `${p.name} — ${p.role.replace(/_/g, ' ').toLowerCase()}`,
                      })),
                    ]}
                  />
                  <Input
                    label="Meta ads spend (INR)"
                    name="metaAdsSpend"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editing?.metaAdsSpend ?? 0}
                    className="!pl-4"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Contract start"
                    name="contractStartDate"
                    type="date"
                    defaultValue={editing?.contractStartDate?.slice(0, 10)}
                    className="!pl-4"
                  />
                  <Input
                    label="Contract end"
                    name="contractEndDate"
                    type="date"
                    defaultValue={editing?.contractEndDate?.slice(0, 10)}
                    className="!pl-4"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create task'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
