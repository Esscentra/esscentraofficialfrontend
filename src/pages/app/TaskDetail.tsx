import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Download,
  FileText,
  FolderKanban,
  ListChecks,
  MessageSquare,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Upload,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
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
  deleteTaskDocument,
  downloadTaskDocument,
  getTask,
  listWeeklyReports,
  submitWeeklyReport,
  uploadTaskDocument,
} from '@/lib/taskApi';
import {
  addTaskRemark,
  deleteTaskRemark,
  listTaskRemarks,
  updateTaskRemark,
  type TaskRemark,
} from '@/lib/marketerApi';
import { getErrorMessage, isAdminRole, isMarketerRole } from '@/lib/utils';
import type {
  ContractStatus,
  PaymentStatus,
  Task,
  TaskDocumentCategory,
  TaskPriority,
  TaskStatus,
  WeeklyReport,
} from '@/types';

const CONTRACT_TONE: Record<ContractStatus, Tone> = {
  PENDING: 'amber',
  ACTIVE: 'green',
  COMPLETED: 'gray',
};
const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  PENDING: 'amber',
  PARTIAL: 'sky',
  PAID: 'green',
  OVERDUE: 'red',
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

const CATEGORY_ICON: Record<TaskDocumentCategory, typeof FileText> = {
  AGREEMENT: FileText,
  INVOICE: Receipt,
  REPORT: ListChecks,
  OTHER: FileText,
};

const CATEGORIES: TaskDocumentCategory[] = ['AGREEMENT', 'INVOICE', 'REPORT', 'OTHER'];

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const fileSize = (bytes?: number) =>
  !bytes
    ? ''
    : bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Whole days from today until `iso`, or null when there's no date. */
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(iso);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

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

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function TaskDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { user } = useAuth();

  const canManage = isAdminRole(user?.role);
  const isMarketer = isMarketerRole(user?.role);

  const [task, setTask] = useState<Task | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [remarks, setRemarks] = useState<TaskRemark[]>([]);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [editingRemark, setEditingRemark] = useState<string | null>(null);
  const [editRemarkDraft, setEditRemarkDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getTask(id)
      .then((t) => {
        setTask(t);
        // Reports sit behind their own permission check; a failure here
        // shouldn't blank the page, so it degrades to an empty list.
        // Reports and remarks each sit behind their own permission check;
        // a failure in either degrades to an empty list rather than blanking
        // the page.
        return Promise.all([
          listWeeklyReports(id).then(setReports).catch(() => setReports([])),
          listTaskRemarks(id).then(setRemarks).catch(() => setRemarks([])),
        ]);
      })
      .catch((e) => setError(getErrorMessage(e, 'This task could not be loaded.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const contractDaysLeft = useMemo(
    () => daysUntil(task?.contractEndDate),
    [task?.contractEndDate],
  );
  const dueIn = useMemo(() => daysUntil(task?.dueDate), [task?.dueDate]);

  /* -------------------------------- remarks -------------------------------- */
  /*
   * The contractor's running account of progress. Admins read it here — it is
   * the answer to "what has actually happened on this engagement?" between
   * formal weekly reports. Editing stays with whoever wrote the words.
   */

  const addRemark = async () => {
    if (!remarkDraft.trim()) return;
    try {
      const remark = await addTaskRemark(id, remarkDraft.trim());
      setRemarks((rows) => [remark, ...rows]);
      setRemarkDraft('');
    } catch (e) {
      toast.error('Could not save', getErrorMessage(e));
    }
  };

  const saveRemark = async (remarkId: string) => {
    if (!editRemarkDraft.trim()) return;
    try {
      const updated = await updateTaskRemark(remarkId, editRemarkDraft.trim());
      setRemarks((rows) => rows.map((r) => (r._id === remarkId ? updated : r)));
      setEditingRemark(null);
    } catch (e) {
      toast.error('Could not update', getErrorMessage(e));
    }
  };

  const removeRemark = async (remarkId: string) => {
    try {
      await deleteTaskRemark(remarkId);
      setRemarks((rows) => rows.filter((r) => r._id !== remarkId));
    } catch (e) {
      toast.error('Could not delete', getErrorMessage(e));
    }
  };

  /* ------------------------------- documents ------------------------------- */

  const onUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get('document');
    if (!(file instanceof File) || !file.size) {
      toast.error('Choose a PDF', 'Pick the file you want to attach.');
      return;
    }

    setBusy(true);
    try {
      const updated = await uploadTaskDocument(id, {
        file,
        title: String(f.get('title') ?? '').trim() || file.name,
        category: String(f.get('category') ?? 'OTHER') as TaskDocumentCategory,
      });
      setTask(updated);
      setUploadOpen(false);
      form.reset();
      toast.success('Document uploaded');
    } catch (err) {
      toast.error('Upload failed', getErrorMessage(err, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async (documentId: string, name: string) => {
    try {
      await downloadTaskDocument(id, documentId, name);
    } catch (err) {
      toast.error('Download failed', getErrorMessage(err, 'Please try again.'));
    }
  };

  const onDeleteDocument = async (documentId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteTaskDocument(id, documentId);
      setTask((t) =>
        t ? { ...t, documents: t.documents.filter((d) => d.id !== documentId) } : t,
      );
      toast.info('Document deleted', title);
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err, 'Please try again.'));
    }
  };

  /* ----------------------------- weekly reports ---------------------------- */

  const onSubmitReport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const summary = String(f.get('summary') ?? '').trim();
    if (!summary) return;

    setBusy(true);
    try {
      const report = await submitWeeklyReport(id, {
        weekStart: String(f.get('weekStart') ?? '') || undefined,
        summary,
        achievements: String(f.get('achievements') ?? ''),
        blockers: String(f.get('blockers') ?? ''),
      });
      setReports((prev) => [report, ...prev]);
      setReportOpen(false);
      form.reset();
      toast.success('Weekly report submitted');
    } catch (err) {
      toast.error('Could not submit', getErrorMessage(err, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  /* --------------------------------- render -------------------------------- */

  if (loading) return <LoadingCard label="Loading task…" />;

  if (error || !task) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Task unavailable"
        description={error ?? 'This task could not be found.'}
        action={
          <Link to="/app/tasks">
            <Button size="sm" variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back to tasks
            </Button>
          </Link>
        }
      />
    );
  }

  /** Contract details only make sense once someone has filled them in. */
  const hasContract =
    task.contractStatus !== 'PENDING' ||
    !!task.contractStartDate ||
    !!task.contractEndDate;

  return (
    <div className="space-y-5">
      <Link
        to="/app/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Tasks
      </Link>

      <PageHeader
        eyebrow={task.projectName ?? undefined}
        title={task.title}
        subtitle={task.description || undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={PRIORITY_TONE[task.priority]}>
              {humanize(task.priority)}
            </StatusBadge>
            <StatusBadge tone={STATUS_TONE[task.status]}>
              {humanize(task.status)}
            </StatusBadge>
          </div>
        }
      />

      {/* -------------------------------- facts -------------------------------- */}
      <section className="glass-card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <Fact icon={CalendarClock} label="Due">
          {task.dueDate ? (
            <>
              {day(task.dueDate)}
              {dueIn !== null && task.status !== 'COMPLETED' && (
                <span className={dueIn < 0 ? 'text-rose-300' : 'text-slate-500'}>
                  {dueIn < 0 ? ` · ${Math.abs(dueIn)}d overdue` : ` · in ${dueIn}d`}
                </span>
              )}
            </>
          ) : (
            'No due date'
          )}
        </Fact>
        <Fact icon={UserIcon} label="Assigned to">
          {isMarketer ? 'You' : (task.assignedToName ?? 'Unassigned')}
        </Fact>
        <Fact icon={FolderKanban} label="Company project">
          {task.projectName ?? '—'}
        </Fact>
        <Fact icon={Wallet} label="Payment">
          <StatusBadge tone={PAYMENT_TONE[task.paymentStatus]}>
            {humanize(task.paymentStatus)}
          </StatusBadge>
        </Fact>
      </section>

      {/* ------------------------------ contract ------------------------------- */}
      {hasContract && (
        <section className="glass-card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          <Fact icon={FileText} label="Contract status">
            <StatusBadge tone={CONTRACT_TONE[task.contractStatus]}>
              {humanize(task.contractStatus)}
            </StatusBadge>
          </Fact>
          <Fact icon={CalendarDays} label="Contract start">
            {day(task.contractStartDate)}
          </Fact>
          <Fact icon={CalendarDays} label="Contract end">
            {day(task.contractEndDate)}
          </Fact>
          <Fact icon={CalendarClock} label="Days remaining">
            {contractDaysLeft === null ? (
              '—'
            ) : contractDaysLeft < 0 ? (
              <span className="text-rose-300">Ended {Math.abs(contractDaysLeft)}d ago</span>
            ) : (
              <span className="tabular-nums">{contractDaysLeft} days</span>
            )}
          </Fact>
        </section>
      )}

      {/* ------------------------------ documents ------------------------------ */}
      <Section
        title="Documents"
        hint={
          canManage
            ? 'Agreements and invoices — visible only to the assignee.'
            : 'Agreements, invoices and other files shared with you.'
        }
        action={
          canManage ? (
            <Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" /> Upload PDF
            </Button>
          ) : undefined
        }
      >
        {task.documents.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {canManage
              ? 'No documents attached yet.'
              : 'No documents have been shared with you yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {task.documents.map((doc) => {
              const Icon = CATEGORY_ICON[doc.category] ?? FileText;
              return (
                <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{doc.title}</p>
                    <p className="text-xs text-slate-500">
                      {humanize(doc.category)}
                      {doc.uploadedAt && ` · ${day(doc.uploadedAt)}`}
                      {fileSize(doc.sizeBytes) && ` · ${fileSize(doc.sizeBytes)}`}
                    </p>
                  </div>
                  <RowButton
                    onClick={() => onDownload(doc.id, doc.originalName || `${doc.title}.pdf`)}
                    aria-label="Download"
                    title={
                      doc.unavailable
                        ? 'The file is no longer available in storage'
                        : 'Download'
                    }
                    disabled={doc.unavailable}
                  >
                    <Download className="h-4 w-4" />
                  </RowButton>
                  {canManage && (
                    <RowButton
                      onClick={() => onDeleteDocument(doc.id, doc.title)}
                      aria-label="Delete"
                      title="Delete"
                      danger
                    >
                      <Trash2 className="h-4 w-4" />
                    </RowButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* ------------------------------- remarks ------------------------------- */}
      <Section
        title="Progress remarks"
        hint={
          canManage
            ? `${remarks.length} written by the assignee`
            : 'Your running notes on this task'
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={remarkDraft}
            onChange={(e) => setRemarkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void addRemark();
              }
            }}
            placeholder={canManage ? 'Add a note to the trail…' : 'What moved on this task?'}
            className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/25"
          />
          <Button size="sm" onClick={() => void addRemark()} disabled={!remarkDraft.trim()}>
            <MessageSquare className="h-4 w-4" /> Add remark
          </Button>
        </div>

        {remarks.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {canManage
              ? 'The assignee has not written any progress notes yet.'
              : 'No remarks yet — your notes here are how the team follows progress.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {remarks.map((r) => {
              const author =
                typeof r.authorId === 'object'
                  ? [r.authorId?.firstName, r.authorId?.lastName]
                      .filter(Boolean)
                      .join(' ') || r.authorId?.email
                  : undefined;
              const mine =
                String(typeof r.authorId === 'object' ? r.authorId?._id : r.authorId) ===
                String((user as any)?.id ?? (user as any)?._id);

              return (
                <li
                  key={r._id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  {editingRemark === r._id ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={editRemarkDraft}
                        onChange={(e) => setEditRemarkDraft(e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none focus:border-brand-400/50"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void saveRemark(r._id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingRemark(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed text-slate-200">{r.body}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500">
                          {author ?? 'Unknown'} · {day(r.createdAt)}
                        </p>
                        <div className="flex gap-1">
                          {mine && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRemark(r._id);
                                setEditRemarkDraft(r.body);
                              }}
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                              aria-label="Edit remark"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {(mine || canManage) && (
                            <button
                              type="button"
                              onClick={() => void removeRemark(r._id)}
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                              aria-label="Delete remark"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* ---------------------------- weekly reports --------------------------- */}
      <Section
        title="Weekly reports"
        hint={`${reports.length} submitted`}
        action={
          isMarketer ? (
            <Button size="sm" variant="secondary" onClick={() => setReportOpen(true)}>
              <Plus className="h-4 w-4" /> Submit report
            </Button>
          ) : undefined
        }
      >
        {reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {isMarketer
              ? 'No reports yet — submit your first weekly update.'
              : 'No weekly reports have been filed for this task.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    Week of {day(r.weekStart)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.marketerName ? `${r.marketerName} · ` : ''}
                    {day(r.submittedAt)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{r.summary}</p>
                {r.achievements && (
                  <p className="mt-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Achievements: </span>
                    {r.achievements}
                  </p>
                )}
                {r.blockers && (
                  <p className="mt-1 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Blockers: </span>
                    {r.blockers}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* -------------------------------- modals ------------------------------- */}
      {canManage && (
        <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload document">
          <form onSubmit={onUpload} className="space-y-4">
            <Input
              label="Title"
              name="title"
              placeholder="Service agreement"
              hint="Shown to the assignee."
            />
            <Select
              label="Category"
              name="category"
              defaultValue="AGREEMENT"
              options={CATEGORIES.map((c) => ({ value: c, label: humanize(c) }))}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                PDF file
              </label>
              <input
                type="file"
                name="document"
                accept="application/pdf"
                required
                className="w-full cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200 hover:border-brand-400/50"
              />
              <p className="text-xs text-slate-500">PDF only.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {isMarketer && (
        <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Weekly report">
          <form onSubmit={onSubmitReport} className="space-y-4">
            <Input
              label="Week starting"
              name="weekStart"
              type="date"
              className="!pl-4"
              hint="Leave blank for the current week."
            />
            <Textarea
              label="Summary"
              name="summary"
              rows={4}
              placeholder="What you worked on this week."
              required
            />
            <Textarea label="Achievements" name="achievements" />
            <Textarea label="Blockers" name="blockers" />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit report'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
