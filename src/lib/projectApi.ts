import api from './api';
import type { ApiResponse, Project, Task } from '@/types';

/**
 * Company projects — internal work with an owner, budget and timeline.
 *
 * Contractor engagements are NOT here: contracts, agreements, invoices and
 * weekly reports live on the Task a contractor is assigned (see taskApi). A
 * task may reference a project for context, nothing more.
 *
 * Permissions (enforced server-side):
 *   GET    /projects, /projects/:id, /projects/:id/tasks → team roles
 *          (the contract marketer is refused — they get Tasks only)
 *   POST | PATCH | DELETE /projects                      → SUPER_ADMIN
 */

/* --------------------------------- mapping -------------------------------- */

interface RawNamed {
  _id?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  name?: string;
}

interface RawProject {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  status: Project['status'];
  startDate?: string;
  endDate?: string;
  budget?: number;
  createdAt?: string;
  ownerId?: RawNamed | string;
  accountId?: RawNamed | string;
  taskCount?: number;
}

function personName(ref?: RawNamed | string): string | undefined {
  if (!ref || typeof ref === 'string') return undefined;
  const name = [ref.firstName, ref.lastName].filter(Boolean).join(' ').trim();
  return name || undefined;
}

function mapProject(p: RawProject): Project {
  return {
    id: String(p._id ?? p.id ?? ''),
    name: p.name,
    description: p.description,
    status: p.status ?? 'PLANNED',
    startDate: p.startDate,
    endDate: p.endDate,
    budget: p.budget,
    createdAt: p.createdAt,
    ownerName: personName(p.ownerId),
    accountName:
      typeof p.accountId === 'object' ? p.accountId?.companyName : undefined,
    taskCount: p.taskCount,
  };
}

/* -------------------------------- projects -------------------------------- */

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get<ApiResponse<RawProject[]>>('/projects');
  return (data.data ?? []).map(mapProject);
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await api.get<ApiResponse<RawProject>>(`/projects/${id}`);
  return mapProject(data.data);
}

/**
 * The tasks filed under a project.
 *
 * Documents are stripped server-side — this is an index, not a way around the
 * per-task permission check. Open the task itself to reach its files.
 */
export async function getProjectTasks(id: string): Promise<Task[]> {
  const { data } = await api.get<ApiResponse<Array<Record<string, any>>>>(
    `/projects/${id}/tasks`,
  );

  return (data.data ?? []).map((t) => ({
    id: String(t._id ?? t.id ?? ''),
    title: t.title,
    description: t.description,
    status: t.status ?? 'PENDING',
    priority: t.priority ?? 'MEDIUM',
    dueDate: t.dueDate,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    assignedTo:
      typeof t.assignedTo === 'object' ? t.assignedTo?._id : t.assignedTo,
    assignedToName:
      typeof t.assignedTo === 'object'
        ? [t.assignedTo?.firstName, t.assignedTo?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || undefined
        : undefined,
    projectId: id,
    contractStatus: t.contractStatus ?? 'PENDING',
    contractStartDate: t.contractStartDate,
    contractEndDate: t.contractEndDate,
    paymentStatus: t.paymentStatus ?? 'PENDING',
    documents: [],
  }));
}

export interface ProjectInput {
  name: string;
  description?: string;
  status?: Project['status'];
  startDate?: string;
  endDate?: string;
  budget?: number;
}

/** Empty strings become nulls so a cleared date actually clears. */
function clean(input: Partial<ProjectInput>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === '' ? null : v]),
  );
}

/** SUPER_ADMIN only. */
export async function createProject(input: ProjectInput): Promise<Project> {
  const { data } = await api.post<ApiResponse<RawProject>>('/projects', clean(input));
  return mapProject(data.data);
}

/** SUPER_ADMIN only. */
export async function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Promise<Project> {
  const { data } = await api.patch<ApiResponse<RawProject>>(
    `/projects/${id}`,
    clean(input),
  );
  return mapProject(data.data);
}

/** SUPER_ADMIN only. Tasks under it are unlinked, not deleted. */
export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}
