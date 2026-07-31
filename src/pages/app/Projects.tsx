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
import { listUsers } from '@/lib/adminApi';
import { getErrorMessage, isMarketerRole, isSuperAdminRole } from '@/lib/utils';
import type { ContractStatus, PaymentStatus, Project, ProjectStatus, User } from '@/types';

const STATUSES: ProjectStatus[] = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const CONTRACT_STATUSES: ContractStatus[] = ['PENDING', 'ACTIVE', 'COMPLETED'];
const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'];

const TONE: Record<ProjectStatus, Tone> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'sky',
  ON_HOLD: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

const CONTRACT_TONE: Record<ContractStatus, Tone> = {
  PENDING: 'amber',
  ACTIVE: 'green',
  COMPLETED: 'gray',
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

export default function ProjectsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only a super admin creates or edits projects. Everyone else — including
  // the assigned contractor — gets a read-only list that opens the detail page.
  const canManage = isSuperAdminRole(user?.role);
  const isMarketer = isMarketerRole(user?.role);

  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  /** Contractor accounts, loaded lazily and only for the super admin's form. */
  const [marketers, setMarketers] = useState<User[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    listProjects()
      .then(setItems)
      .catch((e) => toast.error('Could not load projects', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(load, [load]);

  // The assignee dropdown needs the user list, which is admin-only — so fetch
  // it only when a super admin is actually going to see the form.
  useEffect(() => {
    if (!canManage) return;
    listUsers()
      .then((users) => setMarketers(users.filter((u) => isMarketerRole(u.role))))
      .catch(() => {
        /* Non-fatal: the form still works, just without the assignee picker. */
      });
  }, [canManage]);

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
      assignedMarketerId: String(f.get('assignedMarketerId') ?? ''),
      contractStatus: String(f.get('contractStatus') ?? 'PENDING') as ContractStatus,
      contractStartDate: String(f.get('contractStartDate') ?? ''),
      contractEndDate: String(f.get('contractEndDate') ?? ''),
      paymentStatus: String(f.get('paymentStatus') ?? 'PENDING') as PaymentStatus,
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
          `Its documents, deliverables and weekly reports go with it. ` +
          `This cannot be undone.`,
      )
    )
      return;

    const prev = items;
    setItems((p) => p.filter((it) => it.id !== project.id)); // optimistic
    try {
      await deleteProjectApi(project.id);
      toast.info('Project deleted', project.name);
    } catch (err) {
      setItems(prev); // rollback
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
      key: 'contract',
      header: 'Contract',
      render: (p) => (
        <StatusBadge tone={CONTRACT_TONE[p.contractStatus]}>
          {humanize(p.contractStatus)}
        </StatusBadge>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'marketer',
            header: 'Assigned to',
            render: (p: Project) => p.assignedMarketerName ?? '—',
          },
        ]
      : []),
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
              <div
                className="flex justify-end gap-1"
                // Stop the row's navigate-to-detail click.
                onClick={(e) => e.stopPropagation()}
              >
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
        subtitle={
          isMarketer
            ? 'The projects you are contracted on. Open one for its documents and deliverables.'
            : 'Plan and deliver your work.'
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

      {loading ? (
        <LoadingCard label="Loading projects…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={isMarketer ? 'No projects assigned yet' : 'No projects yet'}
          description={
            isMarketer
              ? 'Once a project is assigned to you it appears here, along with its agreement and deliverables.'
              : canManage
                ? 'Create a project to get started.'
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

            {/* ---------------------- contractor assignment --------------------- */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Contract
              </p>

              <div className="space-y-4">
                <Select
                  label="Assigned marketer"
                  name="assignedMarketerId"
                  defaultValue={editing?.assignedMarketerId ?? ''}
                  options={[
                    { value: '', label: 'Not assigned' },
                    ...marketers.map((m) => ({
                      value: m.id,
                      label: `${m.name} — ${m.email}`,
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
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
