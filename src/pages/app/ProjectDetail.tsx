import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  ListChecks,
  Plus,
  Receipt,
  Trash2,
  Upload,
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
  addDeliverable,
  deleteDeliverable,
  deleteProjectDocument,
  downloadProjectDocument,
  getProject,
  listWeeklyReports,
  submitWeeklyReport,
  updateDeliverable,
  uploadProjectDocument,
} from '@/lib/projectApi';
import { getErrorMessage, isMarketerRole, isSuperAdminRole } from '@/lib/utils';
import type {
  ContractStatus,
  Deliverable,
  PaymentStatus,
  Project,
  ProjectDocumentCategory,
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

const DELIVERABLE_TONE: Record<Deliverable['status'], Tone> = {
  PENDING: 'amber',
  IN_PROGRESS: 'sky',
  COMPLETED: 'green',
};

const CATEGORY_ICON: Record<ProjectDocumentCategory, typeof FileText> = {
  AGREEMENT: FileText,
  INVOICE: Receipt,
  REPORT: ListChecks,
  OTHER: FileText,
};

const CATEGORIES: ProjectDocumentCategory[] = ['AGREEMENT', 'INVOICE', 'REPORT', 'OTHER'];

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const fileSize = (bytes?: number) =>
  !bytes ? '' : bytes < 1024 * 1024
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

/** Small labelled value used across the contract summary. */
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

export default function ProjectDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { user } = useAuth();

  const canManage = isSuperAdminRole(user?.role);
  const isMarketer = isMarketerRole(user?.role);

  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deliverableOpen, setDeliverableOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getProject(id)
      .then((p) => {
        setProject(p);
        // Reports live behind their own permission check; a failure here
        // shouldn't blank the page, so it degrades to an empty list.
        return listWeeklyReports(id)
          .then(setReports)
          .catch(() => setReports([]));
      })
      .catch((e) => setError(getErrorMessage(e, 'This project could not be loaded.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const contractDaysLeft = useMemo(
    () => daysUntil(project?.contractEndDate),
    [project?.contractEndDate],
  );

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
      const updated = await uploadProjectDocument(id, {
        file,
        title: String(f.get('title') ?? '').trim() || file.name,
        category: String(f.get('category') ?? 'OTHER') as ProjectDocumentCategory,
      });
      setProject(updated);
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
      await downloadProjectDocument(id, documentId, name);
    } catch (err) {
      toast.error('Download failed', getErrorMessage(err, 'Please try again.'));
    }
  };

  const onDeleteDocument = async (documentId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteProjectDocument(id, documentId);
      setProject((p) =>
        p ? { ...p, documents: p.documents.filter((d) => d.id !== documentId) } : p,
      );
      toast.info('Document deleted', title);
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err, 'Please try again.'));
    }
  };

  /* ------------------------------ deliverables ----------------------------- */

  const onAddDeliverable = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const title = String(f.get('title') ?? '').trim();
    if (!title) return;

    setBusy(true);
    try {
      const updated = await addDeliverable(id, {
        title,
        description: String(f.get('description') ?? ''),
        dueDate: String(f.get('dueDate') ?? ''),
      });
      setProject(updated);
      setDeliverableOpen(false);
      form.reset();
      toast.success('Deliverable added');
    } catch (err) {
      toast.error('Could not add deliverable', getErrorMessage(err, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const onToggleDeliverable = async (d: Deliverable) => {
    const next = d.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const updated = await updateDeliverable(id, d.id, { status: next });
      setProject(updated);
    } catch (err) {
      toast.error('Update failed', getErrorMessage(err, 'Please try again.'));
    }
  };

  const onDeleteDeliverable = async (d: Deliverable) => {
    if (!window.confirm(`Delete "${d.title}"?`)) return;
    try {
      await deleteDeliverable(id, d.id);
      setProject((p) =>
        p ? { ...p, deliverables: p.deliverables.filter((x) => x.id !== d.id) } : p,
      );
      toast.info('Deliverable deleted', d.title);
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

  if (loading) return <LoadingCard label="Loading project…" />;

  if (error || !project) {
    return (
      <EmptyState
        icon={FileText}
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

  const pendingCount = project.deliverables.filter((d) => d.status !== 'COMPLETED').length;

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
          <div className="flex items-center gap-2">
            <StatusBadge tone={CONTRACT_TONE[project.contractStatus]}>
              {humanize(project.contractStatus)}
            </StatusBadge>
            <StatusBadge tone={PAYMENT_TONE[project.paymentStatus]}>
              {humanize(project.paymentStatus)}
            </StatusBadge>
          </div>
        }
      />

      {/* ------------------------------ contract ------------------------------ */}
      <section className="glass-card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <Fact icon={CalendarDays} label="Contract start">
          {day(project.contractStartDate)}
        </Fact>
        <Fact icon={CalendarDays} label="Contract end">
          {day(project.contractEndDate)}
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
        <Fact icon={Wallet} label="Payment">
          {humanize(project.paymentStatus)}
        </Fact>
      </section>

      {/* ------------------------------ documents ----------------------------- */}
      <Section
        title="Documents"
        hint={
          canManage
            ? 'Agreements and invoices — visible only to the assigned marketer.'
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
        {project.documents.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {canManage
              ? 'No documents attached yet.'
              : 'No documents have been shared with you yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {project.documents.map((doc) => {
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

      {/* ----------------------------- deliverables --------------------------- */}
      <Section
        title="Deliverables"
        hint={`${pendingCount} pending of ${project.deliverables.length}`}
        action={
          canManage ? (
            <Button size="sm" variant="secondary" onClick={() => setDeliverableOpen(true)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          ) : undefined
        }
      >
        {project.deliverables.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No deliverables have been set for this project.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {project.deliverables.map((d) => {
              const due = daysUntil(d.dueDate);
              const overdue = d.status !== 'COMPLETED' && due !== null && due < 0;
              return (
                <li key={d.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${
                      d.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25'
                        : 'bg-white/[0.05] text-slate-400 ring-white/10'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{d.title}</p>
                    {d.description && (
                      <p className="mt-0.5 text-xs text-slate-400">{d.description}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {d.dueDate ? `Due ${day(d.dueDate)}` : 'No due date'}
                      {overdue && <span className="text-rose-300"> · overdue</span>}
                    </p>
                  </div>
                  <StatusBadge tone={DELIVERABLE_TONE[d.status]}>
                    {humanize(d.status)}
                  </StatusBadge>
                  {canManage && (
                    <div className="flex gap-1">
                      <RowButton
                        onClick={() => onToggleDeliverable(d)}
                        aria-label="Toggle complete"
                        title={
                          d.status === 'COMPLETED' ? 'Reopen' : 'Mark complete'
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </RowButton>
                      <RowButton
                        onClick={() => onDeleteDeliverable(d)}
                        aria-label="Delete"
                        title="Delete"
                        danger
                      >
                        <Trash2 className="h-4 w-4" />
                      </RowButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* ---------------------------- weekly reports -------------------------- */}
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
              : 'No weekly reports have been filed for this project.'}
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

      {/* -------------------------------- modals ------------------------------ */}
      {canManage && (
        <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload document">
          <form onSubmit={onUpload} className="space-y-4">
            <Input
              label="Title"
              name="title"
              placeholder="Service agreement"
              hint="Shown to the assigned marketer."
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

      {canManage && (
        <Modal
          open={deliverableOpen}
          onClose={() => setDeliverableOpen(false)}
          title="Add deliverable"
        >
          <form onSubmit={onAddDeliverable} className="space-y-4">
            <Input label="Title" name="title" placeholder="Q3 campaign report" required />
            <Input label="Due date" name="dueDate" type="date" className="!pl-4" />
            <Textarea label="Description" name="description" />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeliverableOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Add deliverable'}
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
