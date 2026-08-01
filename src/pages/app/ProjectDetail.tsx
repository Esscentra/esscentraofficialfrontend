import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  FolderKanban,
  ListChecks,
  UserCircle,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { getProject, getProjectTasks } from '@/lib/projectApi';
import { getErrorMessage } from '@/lib/utils';
import type { Project, ProjectStatus, Task, TaskPriority, TaskStatus } from '@/types';

const PROJECT_TONE: Record<ProjectStatus, Tone> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'sky',
  ON_HOLD: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
};
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

const money = (n?: number) =>
  n
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-slate-400 ring-1 ring-white/10">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-slate-200">{children}</div>
      </div>
    </div>
  );
}

/**
 * A company project and the tasks filed under it.
 *
 * Contracts, agreements and weekly reports are not shown here — they belong to
 * individual tasks, where the per-assignee permission check lives. Open a task
 * to reach them.
 */
export default function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getProject(id)
      .then((p) => {
        setProject(p);
        return getProjectTasks(id)
          .then(setTasks)
          .catch(() => setTasks([]));
      })
      .catch((e) => setError(getErrorMessage(e, 'This project could not be loaded.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  if (loading) return <LoadingCard label="Loading project…" />;

  if (error || !project) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Project unavailable"
        description={error ?? 'This project could not be found.'}
        action={
          <Link to="/app/projects">
            <Button size="sm" variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back to projects
            </Button>
          </Link>
        }
      />
    );
  }

  const open = tasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS',
  ).length;

  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Task',
      render: (t) => (
        <div className="min-w-0">
          <span className="font-medium text-white">{t.title}</span>
          {t.assignedToName && (
            <p className="truncate text-xs text-slate-500">{t.assignedToName}</p>
          )}
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
    { key: 'dueDate', header: 'Due', render: (t) => day(t.dueDate) },
  ];

  return (
    <div className="space-y-5">
      <Link
        to="/app/projects"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      <PageHeader
        eyebrow={project.accountName}
        title={project.name}
        subtitle={project.description || undefined}
        action={
          <StatusBadge tone={PROJECT_TONE[project.status]}>
            {humanize(project.status)}
          </StatusBadge>
        }
      />

      <section className="glass-card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <Fact icon={CalendarDays} label="Start">
          {day(project.startDate)}
        </Fact>
        <Fact icon={CalendarDays} label="End">
          {day(project.endDate)}
        </Fact>
        <Fact icon={Wallet} label="Budget">
          {money(project.budget)}
        </Fact>
        <Fact icon={UserCircle} label="Owner">
          {project.ownerName ?? '—'}
        </Fact>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-white">Tasks</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {tasks.length === 0
                ? 'Nothing filed under this project yet'
                : `${open} open of ${tasks.length}`}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate('/app/tasks')}>
            <ListChecks className="h-4 w-4" /> All tasks
          </Button>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description="Create a task from the Tasks page and file it under this project."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={tasks}
            onRowClick={(t) => navigate(`/app/tasks/${t.id}`)}
          />
        )}
      </section>
    </div>
  );
}
