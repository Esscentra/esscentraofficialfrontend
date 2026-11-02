import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  Link2,
  ListChecks,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { listUsers } from '@/lib/adminApi';
import {
  deleteClientDocument,
  endProject,
  getClientDocuments,
  getClientProjects,
  linkClientUser,
  listClientAccounts,
  reopenProject,
  uploadClientDocument,
  type ClientAccountRow,
  type ClientDocumentsView,
  type ClientProject,
} from '@/lib/clientApi';
import { createProject, type ProjectInput } from '@/lib/projectApi';
import { createTask, updateTask } from '@/lib/taskApi';
import { useClientData } from '../client/useClientData';
import { humanize } from '@/lib/format';
import { getErrorMessage, isSuperAdminRole, normalizeRoleName } from '@/lib/utils';
import type { ProjectStatus, TaskPriority, TaskStatus, User } from '@/types';

const PROJECT_STATUSES: ProjectStatus[] = [
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
];
const TASK_STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const TASK_TONE: Record<TaskStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  PENDING: 'gray',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

/**
 * ============================================================================
 *  CLIENTS — super admin
 * ============================================================================
 *
 * Everything about a client in one place: who can log into their portal, what
 * work is running, the paperwork they can see, and closing a project out.
 *
 * Super admin only, as asked — who a client is and when a project ended are
 * commercial decisions, and the server enforces the same rule.
 * ============================================================================
 */

function ddmmyyyy(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

export default function ClientsAdmin() {
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin = isSuperAdminRole(user?.role);

  const [selected, setSelected] = useState<string>('');
  const [people, setPeople] = useState<User[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [endTarget, setEndTarget] = useState<ClientProject | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskTarget, setTaskTarget] = useState<ClientProject | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const accounts = useClientData<ClientAccountRow[]>(() => listClientAccounts(), []);

  // Everything below hangs off the selected company, so both refetch with it.
  const projects = useClientData<ClientProject[]>(
    () => (selected ? getClientProjects(selected) : Promise.resolve([])),
    [selected],
  );
  const documents = useClientData<ClientDocumentsView>(
    () =>
      selected
        ? getClientDocuments(undefined, selected)
        : Promise.resolve({ rows: [], total: 0, byCategory: {} }),
    [selected],
  );

  useEffect(() => {
    listUsers()
      .then(setPeople)
      .catch(() => {
        // The picker degrades to empty rather than breaking the page.
      });
  }, []);

  useEffect(() => {
    if (!selected && accounts.data?.length) {
      setSelected(accounts.data[0]!.id);
    }
  }, [accounts.data, selected]);

  const account = useMemo(
    () => accounts.data?.find((row) => row.id === selected) ?? null,
    [accounts.data, selected],
  );

  /** Users who could be given portal access — clients, or not yet linked. */
  const linkable = useMemo(
    () =>
      people.filter((person) => {
        const role = normalizeRoleName(person.role);
        return role === 'CLIENT' || role === 'USER';
      }),
    [people],
  );

  /** Who a task can be assigned to — our people, never clients or investors. */
  const staff = useMemo(
    () =>
      people.filter((person) => {
        const role = normalizeRoleName(person.role);
        return role !== 'CLIENT' && role !== 'INVESTOR';
      }),
    [people],
  );

  const toggleExpanded = (projectId: string) =>
    setExpanded((prev) => ({ ...prev, [projectId]: !prev[projectId] }));

  const reloadAll = () => {
    accounts.reload();
    projects.reload();
    documents.reload();
  };

  const onLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = String(form.get('userId') ?? '');
    if (!userId) return;

    setBusy(true);
    try {
      await linkClientUser(userId, selected);
      toast.success('Client linked', 'They can now open the client portal.');
      setLinkOpen(false);
      reloadAll();
    } catch (thrown) {
      toast.error('Could not link', getErrorMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');

    if (!(file instanceof File) || !file.size) {
      toast.error('Choose a file', 'Pick the document you want to share.');
      return;
    }

    setBusy(true);
    try {
      await uploadClientDocument({
        accountId: selected,
        projectId: String(form.get('projectId') ?? '') || undefined,
        title: String(form.get('title') ?? '').trim() || file.name,
        description: String(form.get('description') ?? ''),
        category: String(form.get('category') ?? 'AGREEMENT'),
        file,
      });
      toast.success('Document shared', 'The client can see it now.');
      setUploadOpen(false);
      reloadAll();
    } catch (thrown) {
      toast.error('Upload failed', getErrorMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  const onEnd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!endTarget) return;

    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await endProject(endTarget.id, {
        endedAt: String(form.get('endedAt') ?? ''),
        endSummary: String(form.get('endSummary') ?? ''),
      });
      toast.success('Project ended', `${endTarget.name} is now closed out.`);
      setEndTarget(null);
      reloadAll();
    } catch (thrown) {
      toast.error('Could not end the project', getErrorMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  const onCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: ProjectInput = {
      name: String(form.get('name') ?? '').trim(),
      description: String(form.get('description') ?? ''),
      status: String(form.get('status') ?? 'PLANNED') as ProjectStatus,
      startDate: String(form.get('startDate') ?? ''),
      endDate: String(form.get('endDate') ?? ''),
      budget: Number(form.get('budget') ?? 0) || undefined,
      // Always the company selected on this page — that is the whole point of
      // creating it from here rather than from Projects.
      accountId: selected,
      projectLeadId: String(form.get('projectLeadId') ?? ''),
      teamMemberIds: form.getAll('teamMemberIds').map(String),
    };
    if (!input.name) return;

    setBusy(true);
    try {
      const created = await createProject(input);
      toast.success('Project created', `${created.name} is now visible in ${account?.name}'s portal.`);
      setProjectOpen(false);
      setExpanded((prev) => ({ ...prev, [created.id]: true }));
      reloadAll();
    } catch (thrown) {
      toast.error('Could not create the project', getErrorMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  const onCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskTarget) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;

    setBusy(true);
    try {
      await createTask({
        title,
        description: String(form.get('description') ?? ''),
        status: String(form.get('status') ?? 'PENDING') as TaskStatus,
        priority: String(form.get('priority') ?? 'MEDIUM') as TaskPriority,
        dueDate: String(form.get('dueDate') ?? ''),
        assignedTo: String(form.get('assignedTo') ?? ''),
        projectId: taskTarget.id,
      });
      toast.success('Task added', `The client can see it under ${taskTarget.name}.`);
      setExpanded((prev) => ({ ...prev, [taskTarget.id]: true }));
      setTaskTarget(null);
      projects.reload();
      accounts.reload();
    } catch (thrown) {
      toast.error('Could not add the task', getErrorMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  const onTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask(taskId, { status });
      projects.reload();
    } catch (thrown) {
      toast.error('Could not update the task', getErrorMessage(thrown));
    }
  };

  const onReopen = async (project: ClientProject) => {
    try {
      await reopenProject(project.id);
      toast.success('Reopened', `${project.name} is active again.`);
      reloadAll();
    } catch (thrown) {
      toast.error('Could not reopen', getErrorMessage(thrown));
    }
  };

  const onDeleteDocument = async (id: string, title: string) => {
    try {
      await deleteClientDocument(id);
      toast.success('Removed', `${title} is no longer shared.`);
      reloadAll();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  if (accounts.loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Clients" title="Client portal" />
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  if (accounts.error || !accounts.data) {
    return (
      <div>
        <PageHeader eyebrow="Clients" title="Client portal" />
        <ErrorState
          message={accounts.error ?? 'No data was returned.'}
          onRetry={accounts.reload}
        />
      </div>
    );
  }

  const uploaded = (documents.data?.rows ?? []).filter(
    (row) => row.source === 'UPLOAD',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Client portal"
        subtitle="Who can see what, what is running, and closing work out. Super admin only."
      />

      {!isSuperAdmin && (
        <InfoNote tone="warning">
          This area is restricted to super admins. The server enforces it too —
          any change you attempt here will be refused.
        </InfoNote>
      )}

      {/* ------------------------------ companies ------------------------------ */}
      {accounts.data.length === 0 ? (
        /*
         * A client company IS an Account record — the portal scopes everything
         * by it. With none on file there is nothing to configure, so say what
         * to do rather than rendering an empty strip and leaving the page
         * looking broken.
         */
        <div className="glass-card p-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
            <Building2 className="h-7 w-7" />
          </span>
          <p className="mt-5 font-display text-lg font-bold text-white">
            No client companies yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            The client portal is scoped by company, so a company record has to
            exist before anyone can be given access to it.
          </p>

          <ol className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm text-slate-300">
            <Step n={1}>
              Create the company under{' '}
              <Link to="/app/accounts" className="font-semibold text-brand-300 hover:underline">
                Accounts
              </Link>
              .
            </Step>
            <Step n={2}>
              Give their user the <strong>CLIENT</strong> role under{' '}
              <Link to="/app/users" className="font-semibold text-brand-300 hover:underline">
                Users
              </Link>
              , then link them to the company here.
            </Step>
            <Step n={3}>
              Set that company on their projects under{' '}
              <Link to="/app/projects" className="font-semibold text-brand-300 hover:underline">
                Projects
              </Link>
              , and they will see them the moment they sign in.
            </Step>
          </ol>
        </div>
      ) : (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {accounts.data.map((row) => {
          const active = row.id === selected;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelected(row.id)}
              className={`glass-card min-w-[15rem] shrink-0 p-4 text-left transition ${
                active ? 'ring-2 ring-brand-400/50' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
                  {row.logo ? (
                    <img src={row.logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{row.name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {row.activeProjects} active · {row.users.length} portal user
                    {row.users.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}

      {account && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              icon={FolderKanban}
              label="Projects"
              value={account.projectCount}
              hint={`${account.activeProjects} active`}
              tone="brand"
            />
            <FinanceCard
              icon={CheckCircle2}
              label="Delivered"
              value={account.endedProjects}
              hint="Closed out"
              tone="green"
            />
            <FinanceCard
              icon={Upload}
              label="Shared documents"
              value={account.documentCount}
              hint="Agreements and reports"
              tone="teal"
            />
            <FinanceCard
              icon={Users}
              label="Portal users"
              value={account.users.length}
              hint="Can sign in"
              tone="violet"
            />
          </div>

          {/* ------------------------------ access ------------------------------ */}
          <Section
            title="Portal access"
            description="Who from this company can sign in and see their projects."
          >
            <div className="glass-card p-5">
              {account.users.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nobody from {account.name} can open the portal yet. Link a user
                  account to give them access.
                </p>
              ) : (
                <ul className="space-y-2">
                  {account.users.map((person) => (
                    <li
                      key={person.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {person.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{person.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill tone={person.status === 'ACTIVE' ? 'green' : 'gray'}>
                          {humanize(person.status)}
                        </Pill>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await linkClientUser(person.id, '');
                                toast.success('Unlinked', 'Portal access removed.');
                                reloadAll();
                              } catch (thrown) {
                                toast.error('Could not unlink', getErrorMessage(thrown));
                              }
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15"
                          >
                            Remove access
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setLinkOpen(true)}
                >
                  <Link2 className="h-4 w-4" /> Link a user
                </Button>
              )}
            </div>
          </Section>

          {/* ----------------------------- projects ----------------------------- */}
          <Section
            title="Projects"
            description="What the client sees. Create the work here, break it into tasks, and close it out when delivered."
          >
            {isSuperAdmin && (
              <div className="mb-3 flex justify-end">
                <Button size="sm" onClick={() => setProjectOpen(true)}>
                  <Plus className="h-4 w-4" /> New project
                </Button>
              </div>
            )}

            {projects.loading ? (
              <CardGridSkeleton count={2} />
            ) : (projects.data ?? []).length === 0 ? (
              <div className="glass-card p-8 text-center text-sm text-slate-400">
                No projects for this company yet.
                {isSuperAdmin
                  ? ' Create one above and it appears in their portal straight away.'
                  : ' A super admin can create one here.'}
              </div>
            ) : (
              <div className="space-y-3">
                {(projects.data ?? []).map((project) => {
                  const isOpen = Boolean(expanded[project.id]);
                  return (
                    <div key={project.id} className="glass-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{project.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {ddmmyyyy(project.startDate)} →{' '}
                            {ddmmyyyy(project.expectedEndDate)}
                            {project.isEnded && ` · delivered ${ddmmyyyy(project.endedAt)}`}
                            {' · '}
                            {project.teamSize} on the team
                            {project.projectLead && ` · led by ${project.projectLead.name}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Pill tone={project.isEnded ? 'green' : 'blue'}>
                            {humanize(project.status)}
                          </Pill>
                          {isSuperAdmin &&
                            (project.isEnded ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void onReopen(project)}
                              >
                                Reopen
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEndTarget(project)}
                              >
                                <CheckCircle2 className="h-4 w-4" /> Mark ended
                              </Button>
                            ))}
                        </div>
                      </div>

                      {/* ------------------------------ tasks ------------------------------ */}
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(project.id)}
                            className="flex items-center gap-2 text-xs font-semibold text-slate-300 transition hover:text-white"
                            aria-expanded={isOpen}
                          >
                            <ListChecks className="h-4 w-4 text-brand-300" />
                            {project.taskCompleted} of {project.taskTotal} task
                            {project.taskTotal === 1 ? '' : 's'} done · {project.percent}%
                            <ChevronDown
                              className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setTaskTarget(project)}
                            >
                              <Plus className="h-4 w-4" /> Add task
                            </Button>
                          )}
                        </div>

                        {isOpen && (
                          <ul className="mt-3 space-y-2">
                            {project.tasks.length === 0 ? (
                              <li className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                                No tasks yet. Add the first one and the client will see
                                it under this project.
                              </li>
                            ) : (
                              project.tasks.map((task) => (
                                <li
                                  key={task.id}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-100">
                                      {task.title}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                      {task.assignee ?? 'Unassigned'}
                                      {' · '}
                                      {humanize(task.priority)} priority
                                      {task.dueDate && ` · due ${ddmmyyyy(task.dueDate)}`}
                                      {task.completedAt &&
                                        ` · done ${ddmmyyyy(task.completedAt)}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isSuperAdmin ? (
                                      <select
                                        value={task.status}
                                        onChange={(event) =>
                                          void onTaskStatus(
                                            task.id,
                                            event.target.value as TaskStatus,
                                          )
                                        }
                                        aria-label={`Status of ${task.title}`}
                                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-200 outline-none focus:border-brand-400/50"
                                      >
                                        {TASK_STATUSES.map((status) => (
                                          <option key={status} value={status}>
                                            {humanize(status)}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <Pill tone={TASK_TONE[task.status]}>
                                        {humanize(task.status)}
                                      </Pill>
                                    )}
                                  </div>
                                </li>
                              ))
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ----------------------------- documents ---------------------------- */}
          <Section
            title="Shared documents"
            description="Agreements and reports you have uploaded. Invoices come through automatically from Invoices & Bills."
          >
            <div className="glass-card p-5">
              {uploaded.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nothing uploaded yet. Invoices raised to this company already
                  appear in their portal.
                </p>
              ) : (
                <ul className="space-y-2">
                  {uploaded.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {doc.title}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {humanize(doc.category)}
                          {doc.projectName && ` · ${doc.projectName}`} ·{' '}
                          {ddmmyyyy(doc.date)}
                        </p>
                      </div>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => void onDeleteDocument(doc.id, doc.title)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setUploadOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Share a document
                </Button>
              )}
            </div>
          </Section>
        </>
      )}

      {/* -------------------------------- modals ------------------------------- */}
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Link a portal user">
        <form onSubmit={onLink} className="space-y-4">
          <p className="text-sm text-slate-400">
            The user will see {account?.name}'s projects, documents and invoices
            the next time they sign in.
          </p>
          <Select
            label="User account"
            name="userId"
            options={[
              { value: '', label: 'Select a user' },
              ...linkable.map((person) => ({
                value: person.id,
                label: `${person.name} — ${person.email}`,
              })),
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Linking…' : 'Link user'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Share a document"
      >
        <form onSubmit={onUpload} className="space-y-4">
          <Input label="Title" name="title" placeholder="Master services agreement" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              name="category"
              defaultValue="AGREEMENT"
              options={[
                { value: 'AGREEMENT', label: 'Agreement' },
                { value: 'REPORT', label: 'Report' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <Select
              label="Project (optional)"
              name="projectId"
              options={[
                { value: '', label: 'Not project-specific' },
                ...(projects.data ?? []).map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              ]}
            />
          </div>
          <Textarea label="Description" name="description" rows={3} />
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              File
            </span>
            <input
              type="file"
              name="file"
              className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Uploading…' : 'Share document'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={projectOpen}
        onClose={() => setProjectOpen(false)}
        title={account ? `New project for ${account.name}` : 'New project'}
      >
        <form onSubmit={onCreateProject} className="space-y-4">
          <Input label="Name" name="name" required placeholder="Website redesign" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Project lead"
              name="projectLeadId"
              options={[
                { value: '', label: 'Not assigned' },
                ...staff.map((person) => ({ value: person.id, label: person.name })),
              ]}
            />
            <Select
              label="Status"
              name="status"
              defaultValue="PLANNED"
              options={PROJECT_STATUSES.map((status) => ({
                value: status,
                label: humanize(status),
              }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Start date" name="startDate" type="date" className="!pl-4" />
            <Input label="Expected end" name="endDate" type="date" className="!pl-4" />
            <Input label="Budget (INR)" name="budget" type="number" min={0} />
          </div>

          <Textarea
            label="Description (shown to the client)"
            name="description"
            rows={3}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Team members</p>
            {staff.length === 0 ? (
              <p className="text-xs text-slate-500">No staff to pick from yet.</p>
            ) : (
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-2">
                {staff.map((person) => (
                  <label
                    key={person.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/[0.06]"
                  >
                    <input
                      type="checkbox"
                      name="teamMemberIds"
                      value={person.id}
                      className="h-4 w-4 accent-brand-500"
                    />
                    <span className="min-w-0 truncate">{person.name}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-slate-500">
                      {humanize(person.role ?? '')}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">
              The portal shows the head-count only; names appear on tasks they are assigned.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setProjectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(taskTarget)}
        onClose={() => setTaskTarget(null)}
        title={taskTarget ? `Add a task to ${taskTarget.name}` : 'Add a task'}
      >
        <form key={taskTarget?.id ?? 'task'} onSubmit={onCreateTask} className="space-y-4">
          <Input label="Title" name="title" required placeholder="Homepage wireframes" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Assign to"
              name="assignedTo"
              options={[
                { value: '', label: 'Unassigned' },
                ...staff.map((person) => ({ value: person.id, label: person.name })),
              ]}
            />
            <Input label="Due date" name="dueDate" type="date" className="!pl-4" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Priority"
              name="priority"
              defaultValue="MEDIUM"
              options={TASK_PRIORITIES.map((priority) => ({
                value: priority,
                label: humanize(priority),
              }))}
            />
            <Select
              label="Status"
              name="status"
              defaultValue="PENDING"
              options={TASK_STATUSES.map((status) => ({
                value: status,
                label: humanize(status),
              }))}
            />
          </div>

          <Textarea
            label="Description (shown to the client)"
            name="description"
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setTaskTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Adding…' : 'Add task'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(endTarget)}
        onClose={() => setEndTarget(null)}
        title={endTarget ? `End ${endTarget.name}` : 'End project'}
      >
        <form onSubmit={onEnd} className="space-y-4">
          <p className="text-sm text-slate-400">
            This records when the work actually finished. The promised date
            stays as it is, so the client sees both — and whether you delivered
            early or late.
          </p>
          <Input
            label="Actual end date"
            name="endedAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="!pl-4"
          />
          <Textarea
            label="Closing note (shown to the client)"
            name="endSummary"
            rows={3}
            placeholder="What was delivered, and anything they should know."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEndTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Mark ended'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** One numbered step in the empty state. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-200 ring-1 ring-brand-400/30">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
