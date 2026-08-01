import api from './api';
import { downloadFromApi } from './download';
import type {
  ApiResponse,
  MarketerOverview,
  Task,
  TaskDocumentCategory,
  WeeklyReport,
} from '@/types';

/**
 * Tasks — wired to the live Esscentra backend.
 *
 * A task is where a contractor engagement lives: the contract dates, payment
 * status, agreements and weekly reports all hang off it. Company projects are
 * separate and internal (see projectApi).
 *
 * Permissions (enforced server-side, mirrored in the UI):
 *   GET    /tasks                         → any task-enabled role;
 *                                           a contractor sees only their own
 *   GET    /tasks/:id                     → same, plus an assignment check
 *   POST | PATCH | DELETE /tasks          → ADMIN / SUPER_ADMIN
 *   POST   /tasks/:id/documents           → ADMIN / SUPER_ADMIN (multipart)
 *   GET    .../documents/:docId/download  → admin or the assignee
 *   POST   /tasks/:id/reports             → the assignee
 */

/* --------------------------------- mapping -------------------------------- */

interface RawNamed {
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface RawTask {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  status: Task['status'];
  priority: Task['priority'];
  dueDate?: string;
  completedAt?: string;
  createdAt?: string;
  assignedTo?: RawNamed | string;
  createdBy?: RawNamed | string;
  projectId?: RawNamed | string;
  contractStatus?: Task['contractStatus'];
  contractStartDate?: string;
  contractEndDate?: string;
  paymentStatus?: Task['paymentStatus'];
  documents?: Array<Record<string, any>>;
}

/** "firstName lastName" from a populated ref, or undefined when it's just an id. */
function personName(ref?: RawNamed | string): string | undefined {
  if (!ref || typeof ref === 'string') return undefined;
  const name = [ref.firstName, ref.lastName].filter(Boolean).join(' ').trim();
  return name || undefined;
}

function refId(ref?: RawNamed | string): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'string' ? ref : ref._id;
}

function mapDocument(d: Record<string, any>) {
  return {
    id: String(d._id ?? d.id ?? ''),
    title: String(d.title ?? 'Document'),
    category: (d.category ?? 'OTHER') as TaskDocumentCategory,
    originalName: d.originalName,
    sizeBytes: d.sizeBytes,
    uploadedAt: d.uploadedAt,
    unavailable: !!d.unavailable,
  };
}

function mapTask(t: RawTask): Task {
  return {
    id: String(t._id ?? t.id ?? ''),
    title: t.title,
    description: t.description,
    status: t.status ?? 'PENDING',
    priority: t.priority ?? 'MEDIUM',
    dueDate: t.dueDate,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    assignedTo: refId(t.assignedTo),
    assignedToName: personName(t.assignedTo),
    createdByName: personName(t.createdBy),
    projectId: refId(t.projectId),
    projectName:
      typeof t.projectId === 'object' ? t.projectId?.name : undefined,
    contractStatus: t.contractStatus ?? 'PENDING',
    contractStartDate: t.contractStartDate,
    contractEndDate: t.contractEndDate,
    paymentStatus: t.paymentStatus ?? 'PENDING',
    documents: (t.documents ?? []).map(mapDocument),
  };
}

function mapReport(r: Record<string, any>): WeeklyReport {
  return {
    id: String(r._id ?? r.id ?? ''),
    taskId: String(r.taskId ?? ''),
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    summary: r.summary ?? '',
    achievements: r.achievements,
    blockers: r.blockers,
    submittedAt: r.submittedAt,
    marketerName: personName(r.marketerId),
  };
}

/* ---------------------------------- tasks --------------------------------- */

export interface TaskListQuery {
  status?: Task['status'] | '';
  priority?: Task['priority'] | '';
  assignedTo?: string;
  projectId?: string;
  contractStatus?: Task['contractStatus'] | '';
  search?: string;
  page?: number;
  limit?: number;
}

export interface TaskPage {
  tasks: Task[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Drop empty filters so they don't reach the API as `?status=`. */
function params(query: TaskListQuery): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  );
}

interface RawTaskPage {
  tasks?: RawTask[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export async function listTasks(query: TaskListQuery = {}): Promise<TaskPage> {
  const { data } = await api.get<ApiResponse<RawTaskPage>>('/tasks', {
    params: params(query),
  });
  const payload = data.data ?? {};
  const tasks = (payload.tasks ?? []).map(mapTask);

  return {
    tasks,
    page: payload.pagination?.page ?? 1,
    limit: payload.pagination?.limit ?? tasks.length,
    total: payload.pagination?.total ?? tasks.length,
    totalPages: payload.pagination?.totalPages ?? 1,
  };
}

export async function getTask(id: string): Promise<Task> {
  const { data } = await api.get<ApiResponse<RawTask>>(`/tasks/${id}`);
  return mapTask(data.data);
}

export interface TaskInput {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  dueDate?: string;
  assignedTo?: string;
  projectId?: string;
  contractStatus?: Task['contractStatus'];
  contractStartDate?: string;
  contractEndDate?: string;
  paymentStatus?: Task['paymentStatus'];
}

/**
 * Turn empty form fields into explicit nulls.
 *
 * Dropping them instead would make clearing a field impossible: picking
 * "Unassigned" would send nothing and the backend would keep the previous
 * assignee. Null is a real value Mongo unsets on, and "" would fail to cast
 * to a Date or ObjectId.
 */
function clean(input: Partial<TaskInput>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === '' ? null : v]),
  );
}

/** ADMIN / SUPER_ADMIN only. */
export async function createTask(input: TaskInput): Promise<Task> {
  const { data } = await api.post<ApiResponse<RawTask>>('/tasks', clean(input));
  return mapTask(data.data);
}

/** ADMIN / SUPER_ADMIN only. */
export async function updateTask(
  id: string,
  input: Partial<TaskInput>,
): Promise<Task> {
  const { data } = await api.patch<ApiResponse<RawTask>>(`/tasks/${id}`, clean(input));
  return mapTask(data.data);
}

/** ADMIN / SUPER_ADMIN only. */
export async function completeTask(id: string): Promise<Task> {
  const { data } = await api.patch<ApiResponse<RawTask>>(`/tasks/${id}/complete`);
  return mapTask(data.data);
}

/** ADMIN / SUPER_ADMIN only. */
export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}

/* -------------------------------- documents ------------------------------- */

/** ADMIN / SUPER_ADMIN only. Sends the PDF as multipart field `document`. */
export async function uploadTaskDocument(
  taskId: string,
  input: { file: File; title: string; category: TaskDocumentCategory },
): Promise<Task> {
  const form = new FormData();
  form.append('document', input.file);
  form.append('title', input.title);
  form.append('category', input.category);

  const { data } = await api.post<ApiResponse<RawTask>>(
    `/tasks/${taskId}/documents`,
    form,
    // Let the browser set the multipart boundary.
    { headers: { 'Content-Type': undefined } as never },
  );
  return mapTask(data.data);
}

/** ADMIN / SUPER_ADMIN only. */
export async function deleteTaskDocument(
  taskId: string,
  documentId: string,
): Promise<void> {
  await api.delete(`/tasks/${taskId}/documents/${documentId}`);
}

/**
 * Download a document through the API so the request carries the session and
 * the server re-checks that this caller may read it.
 */
export async function downloadTaskDocument(
  taskId: string,
  documentId: string,
  fallbackName = 'document.pdf',
): Promise<void> {
  await downloadFromApi(
    `/tasks/${taskId}/documents/${documentId}/download`,
    fallbackName,
  );
}

/* ----------------------------- weekly reports ----------------------------- */

export async function listWeeklyReports(taskId: string): Promise<WeeklyReport[]> {
  const { data } = await api.get<ApiResponse<Array<Record<string, any>>>>(
    `/tasks/${taskId}/reports`,
  );
  return (data.data ?? []).map(mapReport);
}

export interface WeeklyReportInput {
  weekStart?: string;
  summary: string;
  achievements?: string;
  blockers?: string;
}

/** The assignee files their own report. */
export async function submitWeeklyReport(
  taskId: string,
  input: WeeklyReportInput,
): Promise<WeeklyReport> {
  const { data } = await api.post<ApiResponse<Record<string, any>>>(
    `/tasks/${taskId}/reports`,
    input,
  );
  return mapReport(data.data);
}

/* ----------------------------- marketer overview -------------------------- */

/**
 * The contract marketer's Overview, always scoped to the signed-in account.
 *
 * Lives here rather than in projectApi because everything it reports on — the
 * contract, the deadlines, the reports — now hangs off tasks.
 */
export async function getMarketerOverview(): Promise<MarketerOverview> {
  const { data } = await api.get<ApiResponse<MarketerOverview>>('/dashboard/marketer');
  return data.data;
}
