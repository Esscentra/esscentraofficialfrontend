import api from './api';
import { downloadFromApi } from './download';
import type {
  ApiResponse,
  Deliverable,
  MarketerOverview,
  Project,
  ProjectDocumentCategory,
  WeeklyReport,
} from '@/types';

/**
 * Projects — wired to the live Esscentra backend.
 *
 * Permission summary (enforced server-side, mirrored in the UI):
 *   GET    /projects                      → any project-enabled role;
 *                                           a contractor sees only their own
 *   GET    /projects/:id                  → same, plus an assignment check
 *   POST   /projects                      → SUPER_ADMIN only
 *   PATCH  /projects/:id                  → SUPER_ADMIN only
 *   DELETE /projects/:id                  → SUPER_ADMIN only
 *   POST   /projects/:id/documents        → SUPER_ADMIN only (multipart)
 *   GET    .../documents/:docId/download  → admin or the assigned contractor
 *   POST   /projects/:id/reports          → the assigned contractor
 */

/* --------------------------------- mapping -------------------------------- */

interface RawNamed {
  _id?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
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
  assignedMarketerId?: RawNamed | string;
  contractStatus?: Project['contractStatus'];
  contractStartDate?: string;
  contractEndDate?: string;
  paymentStatus?: Project['paymentStatus'];
  documents?: Array<Record<string, unknown>>;
  deliverables?: Array<Record<string, unknown>>;
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
    category: (d.category ?? 'OTHER') as ProjectDocumentCategory,
    originalName: d.originalName,
    sizeBytes: d.sizeBytes,
    uploadedAt: d.uploadedAt,
    unavailable: !!d.unavailable,
  };
}

function mapDeliverable(d: Record<string, any>): Deliverable {
  return {
    id: String(d._id ?? d.id ?? ''),
    title: String(d.title ?? ''),
    description: d.description,
    dueDate: d.dueDate,
    status: (d.status ?? 'PENDING') as Deliverable['status'],
    completedAt: d.completedAt,
  };
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
    assignedMarketerId: refId(p.assignedMarketerId),
    assignedMarketerName: personName(p.assignedMarketerId),
    contractStatus: p.contractStatus ?? 'PENDING',
    contractStartDate: p.contractStartDate,
    contractEndDate: p.contractEndDate,
    paymentStatus: p.paymentStatus ?? 'PENDING',
    documents: (p.documents ?? []).map(mapDocument),
    deliverables: (p.deliverables ?? []).map(mapDeliverable),
  };
}

function mapReport(r: Record<string, any>): WeeklyReport {
  return {
    id: String(r._id ?? r.id ?? ''),
    projectId: String(r.projectId ?? ''),
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    summary: r.summary ?? '',
    achievements: r.achievements,
    blockers: r.blockers,
    submittedAt: r.submittedAt,
    marketerName: personName(r.marketerId),
  };
}

/* --------------------------------- projects ------------------------------- */

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get<ApiResponse<RawProject[]>>('/projects');
  return (data.data ?? []).map(mapProject);
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await api.get<ApiResponse<RawProject>>(`/projects/${id}`);
  return mapProject(data.data);
}

export interface ProjectInput {
  name: string;
  description?: string;
  status?: Project['status'];
  startDate?: string;
  endDate?: string;
  budget?: number;
  assignedMarketerId?: string;
  contractStatus?: Project['contractStatus'];
  contractStartDate?: string;
  contractEndDate?: string;
  paymentStatus?: Project['paymentStatus'];
}

/**
 * Turn empty form fields into explicit nulls.
 *
 * Dropping them instead would make clearing a field impossible: picking
 * "Not assigned" would send nothing, and the backend would keep the previous
 * marketer. Null is a real value Mongo unsets on, and "" would fail to cast
 * to a Date or ObjectId.
 */
function clean(input: ProjectInput): Record<string, unknown> {
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
export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const { data } = await api.patch<ApiResponse<RawProject>>(
    `/projects/${id}`,
    clean(input),
  );
  return mapProject(data.data);
}

/** SUPER_ADMIN only. */
export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

/* -------------------------------- documents ------------------------------- */

/** SUPER_ADMIN only. Sends the PDF as multipart field `document`. */
export async function uploadProjectDocument(
  projectId: string,
  input: { file: File; title: string; category: ProjectDocumentCategory },
): Promise<Project> {
  const form = new FormData();
  form.append('document', input.file);
  form.append('title', input.title);
  form.append('category', input.category);

  const { data } = await api.post<ApiResponse<RawProject>>(
    `/projects/${projectId}/documents`,
    form,
    // Let the browser set the multipart boundary.
    { headers: { 'Content-Type': undefined } as never },
  );
  return mapProject(data.data);
}

/** SUPER_ADMIN only. */
export async function deleteProjectDocument(
  projectId: string,
  documentId: string,
): Promise<void> {
  await api.delete(`/projects/${projectId}/documents/${documentId}`);
}

/**
 * Download a document through the API so the request carries the session and
 * the server re-checks that this caller may read it.
 */
export async function downloadProjectDocument(
  projectId: string,
  documentId: string,
  fallbackName = 'document.pdf',
): Promise<void> {
  await downloadFromApi(
    `/projects/${projectId}/documents/${documentId}/download`,
    fallbackName,
  );
}

/* ------------------------------ deliverables ------------------------------ */

export interface DeliverableInput {
  title: string;
  description?: string;
  dueDate?: string;
  status?: Deliverable['status'];
}

/** SUPER_ADMIN only. Returns the updated project. */
export async function addDeliverable(
  projectId: string,
  input: DeliverableInput,
): Promise<Project> {
  const { data } = await api.post<ApiResponse<RawProject>>(
    `/projects/${projectId}/deliverables`,
    Object.fromEntries(Object.entries(input).filter(([, v]) => v !== '')),
  );
  return mapProject(data.data);
}

/** SUPER_ADMIN only. */
export async function updateDeliverable(
  projectId: string,
  deliverableId: string,
  input: Partial<DeliverableInput>,
): Promise<Project> {
  const { data } = await api.patch<ApiResponse<RawProject>>(
    `/projects/${projectId}/deliverables/${deliverableId}`,
    input,
  );
  return mapProject(data.data);
}

/** SUPER_ADMIN only. */
export async function deleteDeliverable(
  projectId: string,
  deliverableId: string,
): Promise<void> {
  await api.delete(`/projects/${projectId}/deliverables/${deliverableId}`);
}

/* ----------------------------- weekly reports ----------------------------- */

export async function listWeeklyReports(projectId: string): Promise<WeeklyReport[]> {
  const { data } = await api.get<ApiResponse<Array<Record<string, any>>>>(
    `/projects/${projectId}/reports`,
  );
  return (data.data ?? []).map(mapReport);
}

export interface WeeklyReportInput {
  weekStart?: string;
  summary: string;
  achievements?: string;
  blockers?: string;
}

/** The assigned contractor files their own report. */
export async function submitWeeklyReport(
  projectId: string,
  input: WeeklyReportInput,
): Promise<WeeklyReport> {
  const { data } = await api.post<ApiResponse<Record<string, any>>>(
    `/projects/${projectId}/reports`,
    input,
  );
  return mapReport(data.data);
}

/* ----------------------------- marketer overview -------------------------- */

/** Always scoped to the signed-in account. */
export async function getMarketerOverview(): Promise<MarketerOverview> {
  const { data } = await api.get<ApiResponse<MarketerOverview>>('/dashboard/marketer');
  return data.data;
}
