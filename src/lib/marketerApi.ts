import api from './api';
import type { ApiResponse as ApiEnvelope } from '@/types';

/**
 * ============================================================================
 *  FREELANCE PERFORMANCE MARKETER API
 * ============================================================================
 *
 * The contractor's own workspace: their engagement overview, the agreements
 * attached to their tasks, their payment statement, and support tickets.
 *
 * Every endpoint is scoped server-side to the calling user. The optional
 * `marketerId` argument is honoured for admins only, which is why it is safe
 * to expose here.
 * ============================================================================
 */

const BASE = '/marketer';

function scoped(marketerId?: string): string {
  return marketerId ? `?marketerId=${encodeURIComponent(marketerId)}` : '';
}

/* --------------------------------- types --------------------------------- */

export const PAYMENT_STATUSES = ['UPCOMING', 'LOCKED', 'RECEIVED'] as const;
export type MarketerPaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_MODES = [
  'BANK_TRANSFER',
  'UPI',
  'CASH',
  'CHEQUE',
  'OTHER',
] as const;
export type MarketerPaymentMode = (typeof PAYMENT_MODES)[number];

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORIES = [
  'PAYMENT',
  'TASK',
  'ACCESS',
  'DOCUMENT',
  'TECHNICAL',
  'OTHER',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface PersonRef {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
}

export interface MoneyBucket {
  amount: number;
  count: number;
}

export interface MarketerOverview {
  marketer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    profileImage: string | null;
    joinedAt: string | null;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    activeContracts: number;
    metaAdsSpend: number;
    upcoming: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate: string | null;
    }>;
  };
  payments: {
    received: MoneyBucket;
    locked: MoneyBucket;
    upcoming: MoneyBucket;
    totalEngagement: number;
    nextPaymentDate: string | null;
    currency: string;
  };
  documents: { total: number; agreements: number };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  remarksWritten: number;
  currency: string;
}

export interface MarketerDocument {
  id: string;
  taskId: string;
  taskTitle: string;
  title: string;
  category: 'AGREEMENT' | 'INVOICE' | 'REPORT' | 'OTHER';
  originalName: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  /** True when the file's storage account is no longer reachable. */
  unavailable: boolean;
}

export interface MarketerDocumentsView {
  rows: MarketerDocument[];
  total: number;
  byCategory: Record<string, number>;
}

export interface MarketerPayment {
  _id: string;
  marketerId: PersonRef | string;
  taskId?: { _id: string; title: string; status: string } | string | null;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  status: MarketerPaymentStatus;
  dueDate?: string;
  releaseDate?: string;
  lockReason?: string;
  receivedAt?: string;
  paymentMode?: MarketerPaymentMode;
  referenceNumber?: string;
  createdBy?: PersonRef;
  createdAt: string;
}

export interface MarketerPaymentsView {
  rows: MarketerPayment[];
  summary: {
    received: MoneyBucket;
    locked: MoneyBucket;
    upcoming: MoneyBucket;
    totalEngagement: number;
    nextPaymentDate: string | null;
    currency: string;
  };
}

export interface TicketReply {
  _id?: string;
  authorId: PersonRef | string;
  body: string;
  fromStaff: boolean;
  createdAt?: string;
}

export interface TicketAttachment {
  _id?: string;
  url: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  unavailable?: boolean;
}

export interface Ticket {
  _id: string;
  reference: string;
  raisedBy: PersonRef | string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  taskId?: { _id: string; title: string } | string | null;
  attachments: TicketAttachment[];
  replies: TicketReply[];
  assignedTo?: PersonRef | string;
  resolvedAt?: string;
  closedAt?: string;
  lastActivityAt: string;
  createdAt: string;
}

export interface TicketsView {
  rows: Ticket[];
  summary: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
}

export interface TaskRemark {
  _id: string;
  taskId: string;
  authorId: PersonRef | string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- tasks --------------------------------- */

/**
 * The contractor's view of an assigned task.
 *
 * Read straight off `/tasks` rather than through `taskApi`'s mapper, because
 * the fields that matter here — who they report to, the contract window, the
 * ad budget — are contractor-specific and would otherwise have to be threaded
 * through a shared shape used by the admin task board too.
 */
export interface MarketerTask {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  contractStatus?: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  contractStartDate?: string;
  contractEndDate?: string;
  paymentStatus?: string;
  metaAdsSpend: number;
  reportingToName?: string;
  createdByName?: string;
  documentCount: number;
}

function personName(ref: any): string | undefined {
  if (!ref || typeof ref !== 'object') return undefined;
  const name = [ref.firstName, ref.lastName].filter(Boolean).join(' ').trim();
  return name || ref.email || undefined;
}

export async function listMyTasks(): Promise<MarketerTask[]> {
  const { data } = await api.get<ApiEnvelope<{ tasks: any[] }>>(
    '/tasks?limit=100',
  );

  return (data.data?.tasks ?? []).map((task) => ({
    id: String(task._id ?? task.id ?? ''),
    title: task.title,
    description: task.description,
    status: task.status ?? 'PENDING',
    priority: task.priority ?? 'MEDIUM',
    dueDate: task.dueDate,
    contractStatus: task.contractStatus,
    contractStartDate: task.contractStartDate,
    contractEndDate: task.contractEndDate,
    paymentStatus: task.paymentStatus,
    metaAdsSpend: Number(task.metaAdsSpend) || 0,
    reportingToName: personName(task.reportingTo),
    createdByName: personName(task.createdBy),
    documentCount: (task.documents ?? []).length,
  }));
}

/* ------------------------------- overview -------------------------------- */

export async function getMarketerOverview(marketerId?: string) {
  const { data } = await api.get<ApiEnvelope<MarketerOverview>>(
    `${BASE}/overview${scoped(marketerId)}`,
  );
  return data.data;
}

export async function getMarketerDocuments(
  category?: string,
  marketerId?: string,
) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (marketerId) params.set('marketerId', marketerId);
  const query = params.toString();

  const { data } = await api.get<ApiEnvelope<MarketerDocumentsView>>(
    `${BASE}/documents${query ? `?${query}` : ''}`,
  );
  return data.data;
}

/* ------------------------------- payments -------------------------------- */

export async function listMarketerPayments(
  params: { marketerId?: string; status?: string } = {},
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, String(value));
  });
  const query = search.toString();

  const { data } = await api.get<ApiEnvelope<MarketerPaymentsView>>(
    `/marketer-payments${query ? `?${query}` : ''}`,
  );
  return data.data;
}

export interface MarketerPaymentInput {
  marketerId: string;
  taskId?: string;
  title: string;
  description?: string;
  amount: number | string;
  currency?: string;
  status?: MarketerPaymentStatus;
  dueDate?: string;
  releaseDate?: string;
  lockReason?: string;
  receivedAt?: string;
  paymentMode?: MarketerPaymentMode;
  referenceNumber?: string;
}

/** Drop empty optionals so the backend sees genuinely-unset fields. */
function clean<T extends object>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  ) as T;
}

export async function createMarketerPayment(input: MarketerPaymentInput) {
  const { data } = await api.post<ApiEnvelope<MarketerPayment>>(
    '/marketer-payments',
    clean(input),
  );
  return data.data;
}

export async function updateMarketerPayment(
  id: string,
  input: Partial<MarketerPaymentInput>,
) {
  const { data } = await api.patch<ApiEnvelope<MarketerPayment>>(
    `/marketer-payments/${id}`,
    clean(input),
  );
  return data.data;
}

export async function deleteMarketerPayment(id: string) {
  await api.delete(`/marketer-payments/${id}`);
}

/* -------------------------------- tickets -------------------------------- */

export async function listTickets(
  params: { status?: string; category?: string; search?: string } = {},
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, String(value));
  });
  const query = search.toString();

  const { data } = await api.get<ApiEnvelope<TicketsView>>(
    `/tickets${query ? `?${query}` : ''}`,
  );
  return data.data;
}

export async function getTicket(id: string) {
  const { data } = await api.get<ApiEnvelope<Ticket>>(`/tickets/${id}`);
  return data.data;
}

export interface TicketInput {
  subject: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  taskId?: string;
}

/** Multipart: the optional evidence files ride along as "attachments". */
export async function createTicket(input: TicketInput, files: File[] = []) {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value) form.append(key, String(value));
  });
  files.forEach((file) => form.append('attachments', file));

  const { data } = await api.post<ApiEnvelope<Ticket>>('/tickets', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function updateTicket(
  id: string,
  input: Partial<TicketInput> & { status?: TicketStatus; assignedTo?: string },
) {
  const { data } = await api.patch<ApiEnvelope<Ticket>>(
    `/tickets/${id}`,
    clean(input),
  );
  return data.data;
}

export async function deleteTicket(id: string) {
  await api.delete(`/tickets/${id}`);
}

export async function replyToTicket(id: string, body: string) {
  const { data } = await api.post<ApiEnvelope<Ticket>>(`/tickets/${id}/replies`, {
    body,
  });
  return data.data;
}

/* -------------------------------- remarks -------------------------------- */

export async function listTaskRemarks(taskId: string) {
  const { data } = await api.get<ApiEnvelope<TaskRemark[]>>(
    `/tasks/${taskId}/remarks`,
  );
  return data.data ?? [];
}

export async function addTaskRemark(taskId: string, body: string) {
  const { data } = await api.post<ApiEnvelope<TaskRemark>>(
    `/tasks/${taskId}/remarks`,
    { body },
  );
  return data.data;
}

export async function updateTaskRemark(remarkId: string, body: string) {
  const { data } = await api.patch<ApiEnvelope<TaskRemark>>(
    `/tasks/remarks/${remarkId}`,
    { body },
  );
  return data.data;
}

export async function deleteTaskRemark(remarkId: string) {
  await api.delete(`/tasks/remarks/${remarkId}`);
}
