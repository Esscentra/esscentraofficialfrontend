import { useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquarePlus,
  Megaphone,
  Pencil,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  addTaskRemark,
  deleteTaskRemark,
  listMyTasks,
  listTaskRemarks,
  updateTaskRemark,
  type MarketerTask,
  type TaskRemark,
} from '@/lib/marketerApi';
import { useMarketerData } from './useMarketerData';
import { humanize, inr } from '@/lib/format';
import { getErrorMessage } from '@/lib/utils';

/**
 * ============================================================================
 *  MY TASKS
 * ============================================================================
 *
 * The work assigned to the contractor: what it is, who they report to, the
 * window it runs over, and the ad spend booked against it. All of that is
 * read-only — only a super admin sets it.
 *
 * Remarks are the exception, and the point of the page: the contractor's own
 * running account of progress, which they write, edit and delete themselves.
 * ============================================================================
 */

/** DD-MM-YYYY, matching the payment schedule elsewhere in the workspace. */
function ddmmyyyy(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

const STATUS_TONE: Record<string, 'gray' | 'blue' | 'green' | 'amber' | 'red'> = {
  PENDING: 'amber',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'gray',
};

const PRIORITY_TONE: Record<string, 'gray' | 'blue' | 'amber' | 'red'> = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'amber',
  URGENT: 'red',
};

function personName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const person = value as { firstName?: string; lastName?: string; email?: string };
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return name || person.email || null;
}

export default function MarketerTasks() {
  const { data, loading, error, reload } = useMarketerData<MarketerTask[]>(
    () => listMyTasks(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your engagement" title="My tasks" />
        <CardGridSkeleton count={4} />
        <TableSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your engagement" title="My tasks" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const countBy = (status: string) =>
    data.filter((task) => task.status === status).length;

  const totalSpend = data.reduce((sum, task) => sum + task.metaAdsSpend, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your engagement"
        title="My tasks"
        subtitle="The work assigned to you. Add remarks to keep the team posted on progress."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={ClipboardList}
          label="Assigned"
          value={data.length}
          hint="Tasks on your plate"
          tone="brand"
        />
        <FinanceCard
          icon={Loader2}
          label="In progress"
          value={countBy('IN_PROGRESS')}
          hint={`${countBy('PENDING')} not started`}
          tone="sky"
        />
        <FinanceCard
          icon={CheckCircle2}
          label="Completed"
          value={countBy('COMPLETED')}
          hint="Signed off"
          tone="green"
        />
        <FinanceCard
          icon={Megaphone}
          label="Meta ads spend"
          value={totalSpend}
          format={inr}
          hint="Booked across your tasks"
          tone="violet"
        />
      </div>

      <Section
        title="Assigned work"
        description="Details are set by the Esscentra team. Remarks are yours to write."
      >
        {data.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <p className="font-display text-base font-semibold text-white">
              Nothing assigned yet
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Tasks assigned to you will appear here with their dates and budget.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  One task, with its remark thread                                           */
/* -------------------------------------------------------------------------- */

function TaskCard({ task }: { task: MarketerTask }) {
  const toast = useToast();
  const { user } = useAuth();

  const [remarks, setRemarks] = useState<TaskRemark[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  useEffect(() => {
    let alive = true;

    listTaskRemarks(task.id)
      .then((rows) => {
        if (alive) setRemarks(rows);
      })
      .catch(() => {
        // A failed remark load must not blank the task itself.
        if (alive) setRemarks([]);
      })
      .finally(() => {
        if (alive) setLoadingRemarks(false);
      });

    return () => {
      alive = false;
    };
  }, [task.id]);

  const add = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const remark = await addTaskRemark(task.id, draft.trim());
      setRemarks((rows) => [remark, ...rows]);
      setDraft('');
      toast.success('Remark added', 'The team can see your update.');
    } catch (thrown) {
      toast.error('Could not save', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editDraft.trim()) return;
    try {
      const updated = await updateTaskRemark(id, editDraft.trim());
      setRemarks((rows) => rows.map((row) => (row._id === id ? updated : row)));
      setEditingId(null);
    } catch (thrown) {
      toast.error('Could not update', getErrorMessage(thrown));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteTaskRemark(id);
      setRemarks((rows) => rows.filter((row) => row._id !== id));
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  const isMine = (remark: TaskRemark) =>
    String(
      typeof remark.authorId === 'object' ? remark.authorId?._id : remark.authorId,
    ) === String((user as any)?.id ?? (user as any)?._id);

  return (
    <div className="glass-card p-5">
      {/* -------------------------------- header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold text-white">
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Pill tone={PRIORITY_TONE[task.priority] ?? 'gray'}>
            {humanize(task.priority)}
          </Pill>
          <Pill tone={STATUS_TONE[task.status] ?? 'gray'}>
            {humanize(task.status)}
          </Pill>
        </div>
      </div>

      {/* --------------------------- engagement facts -------------------------- */}
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <UserCheck className="h-3.5 w-3.5" />
            Reporting to
          </dt>
          <dd className="mt-0.5 truncate font-medium text-slate-200">
            {task.reportingToName ?? task.createdByName ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            Start date
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums text-slate-200">
            {ddmmyyyy(task.contractStartDate)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            End date
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums text-slate-200">
            {ddmmyyyy(task.contractEndDate ?? task.dueDate)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <Megaphone className="h-3.5 w-3.5" />
            Meta ads spend
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums text-violet-300">
            {inr(task.metaAdsSpend)}
          </dd>
        </div>
      </dl>

      {/* ------------------------------- remarks ------------------------------ */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Remarks — your progress notes
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void add();
              }
            }}
            placeholder="What moved on this task?"
            className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/25"
          />
          <button
            type="button"
            onClick={() => void add()}
            disabled={saving || !draft.trim()}
            className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add remark'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loadingRemarks ? (
            <p className="text-xs text-slate-500">Loading remarks…</p>
          ) : remarks.length === 0 ? (
            <p className="text-xs text-slate-500">
              No remarks yet. Your notes here are how the team follows progress
              between reports.
            </p>
          ) : (
            remarks.map((remark) => (
              <div
                key={remark._id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                {editingId === remark._id ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none focus:border-brand-400/50"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => void saveEdit(remark._id)}
                        className="h-9 rounded-lg bg-brand-500/80 px-3 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed text-slate-200">
                      {remark.body}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">
                        {personName(remark.authorId) ?? 'You'} ·{' '}
                        {ddmmyyyy(remark.createdAt)}
                      </span>
                      {isMine(remark) && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(remark._id);
                              setEditDraft(remark.body);
                            }}
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                            aria-label="Edit remark"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(remark._id)}
                            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                            aria-label="Delete remark"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
