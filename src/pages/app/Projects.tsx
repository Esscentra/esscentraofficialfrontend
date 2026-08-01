import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  createProject,
  deleteProject as deleteProjectApi,
  listProjects,
  updateProject,
  type ProjectInput,
} from '@/lib/projectApi';
import { getErrorMessage, isSuperAdminRole } from '@/lib/utils';
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
  n
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');

/**
 * Company projects — internal work.
 *
 * Contractor engagements are NOT here: contracts, agreements and weekly
 * reports live on the tasks a contractor is assigned. This page is simply the
 * company's project list, with the tasks filed under each one.
 */
export default function ProjectsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canManage = isSuperAdminRole(user?.role);

  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listProjects()
      .then(setItems)
      .catch((e) => toast.error('Could not load projects', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(load, [load]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input: ProjectInput = {
      name: String(f.get('name') ?? '').trim(),
      description: String(f.get('description') ?? ''),
      status: String(f.get('status') ?? 'PLANNED') as ProjectStatus,
      startDate: String(f.get('startDate') ?? ''),
      endDate: String(f.get('endDate') ?? ''),
      budget: Number(f.get('budget') ?? 0) || undefined,
    };
    if (!input.name) return;

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateProject(editing.id, input);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? updated : it)));
        toast.success('Project updated');
      } else {
        const created = await createProject(input);
        setItems((prev) => [created, ...prev]);
        toast.success('Project created');
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

  const remove = async (project: Project) => {
    if (
      !window.confirm(
        `Delete "${project.name}"?\n\n` +
          `Tasks filed under it are kept — they're just unlinked from the project.`,
      )
    )
      return;

    const prev = items;
    setItems((p) => p.filter((it) => it.id !== project.id)); // optimistic
    try {
      await deleteProjectApi(project.id);
      toast.info('Project deleted', project.name);
    } catch (err) {
      setItems(prev);
      toast.error('Delete failed', getErrorMessage(err, 'Please try again.'));
    }
  };

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (p) => (
        <div className="min-w-0">
          <span className="font-medium text-white">{p.name}</span>
          {p.accountName && <p className="text-xs text-slate-500">{p.accountName}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge tone={TONE[p.status]}>{humanize(p.status)}</StatusBadge>,
    },
    {
      key: 'tasks',
      header: 'Tasks',
      render: (p) => (
        <span className="tabular-nums text-slate-300">{p.taskCount ?? 0}</span>
      ),
    },
    { key: 'budget', header: 'Budget', render: (p) => money(p.budget) },
    {
      key: 'dates',
      header: 'Timeline',
      render: (p) =>
        p.startDate || p.endDate ? `${day(p.startDate)} → ${day(p.endDate)}` : '—',
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (p: Project) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <RowButton
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                  aria-label="Edit"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </RowButton>
                <RowButton onClick={() => remove(p)} aria-label="Delete" title="Delete" danger>
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
        title="Projects"
        subtitle="Company projects. Open one to see the tasks filed under it."
        action={
          canManage ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New project
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingCard label="Loading projects…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            canManage
              ? 'Create a company project, then file tasks under it.'
              : 'Projects are created by a super admin.'
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
                <Plus className="h-4 w-4" /> New project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          onRowClick={(p) => navigate(`/app/projects/${p.id}`)}
        />
      )}

      {/* Create / edit — super admin only; never rendered for anyone else. */}
      {canManage && (
        <Modal
          open={open}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          title={editing ? 'Edit project' : 'New project'}
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Name" name="name" defaultValue={editing?.name} required />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Status"
                name="status"
                defaultValue={editing?.status ?? 'PLANNED'}
                options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
              />
              <Input
                label="Budget (INR)"
                name="budget"
                type="number"
                min={0}
                defaultValue={editing?.budget}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start date"
                name="startDate"
                type="date"
                defaultValue={editing?.startDate?.slice(0, 10)}
                className="!pl-4"
              />
              <Input
                label="End date"
                name="endDate"
                type="date"
                defaultValue={editing?.endDate?.slice(0, 10)}
                className="!pl-4"
              />
            </div>

            <Textarea
              label="Description"
              name="description"
              defaultValue={editing?.description}
            />

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
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
