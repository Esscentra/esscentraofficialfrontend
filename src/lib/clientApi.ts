import api from './api';
import { downloadFromApi } from './download';
import type { ApiResponse as ApiEnvelope } from '@/types';

/**
 * ============================================================================
 *  CLIENT PORTAL API
 * ============================================================================
 *
 * What a client sees of their own engagement: the projects running for their
 * company, the paperwork behind them, and what is owed.
 *
 * Every endpoint is scoped server-side to the caller's account. The optional
 * `accountId` argument is honoured for super admins only, which is what makes
 * it safe to expose here — it powers the admin's drill-down view.
 * ============================================================================
 */

const BASE = '/client';

function scoped(accountId?: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (accountId) params.set('accountId', accountId);
  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

/* --------------------------------- types --------------------------------- */

export const PROJECT_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ClientProject {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;

  startDate: string | null;
  expectedEndDate: string | null;
  endedAt: string | null;
  endSummary: string | null;
  isEnded: boolean;
  /** Negative = delivered early, positive = delivered late. */
  deliveryVarianceDays: number | null;

  timelinePercent: number;
  elapsedDays: number | null;
  totalDays: number | null;
  daysRemaining: number | null;

  projectLead: {
    name: string;
    email: string | null;
    profileImage: string | null;
  } | null;
  /** Count only — team composition stays internal. */
  teamSize: number;

  taskTotal: number;
  taskCompleted: number;
  percent: number;
}

export interface ClientDocumentRow {
  id: string;
  /** UPLOAD = an agreement we uploaded; INVOICE = generated in Invoices. */
  source: 'UPLOAD' | 'INVOICE';
  category: string;
  title: string;
  description: string | null;
  projectName: string | null;
  reference: string | null;
  amount: number | null;
  status: string | null;
  date: string;
  originalName: string | null;
  sizeBytes: number | null;
  unavailable: boolean;
}

export interface ClientDocumentsView {
  rows: ClientDocumentRow[];
  total: number;
  byCategory: Record<string, number>;
}

export interface ClientOverview {
  company: {
    id: string;
    name: string;
    industry: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    location: string;
    logo: string | null;
  };
  viewer: { id: string };
  projects: {
    total: number;
    active: number;
    ended: number;
    onHold: number;
    onTimeDeliveryPercent: number | null;
    teamSize: number;
    upcoming: ClientProject[];
  };
  documents: {
    total: number;
    agreements: number;
    invoices: number;
    bills: number;
  };
  billing: {
    outstandingAmount: number;
    outstandingCount: number;
    settledAmount: number;
    settledCount: number;
    currency: string;
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
}

/* --------------------------------- portal -------------------------------- */

export async function getClientOverview(accountId?: string) {
  const { data } = await api.get<ApiEnvelope<ClientOverview>>(
    `${BASE}/overview${scoped(accountId)}`,
  );
  return data.data;
}

export async function getClientProjects(accountId?: string) {
  const { data } = await api.get<ApiEnvelope<ClientProject[]>>(
    `${BASE}/projects${scoped(accountId)}`,
  );
  return data.data ?? [];
}

export async function getClientDocuments(
  category?: string,
  accountId?: string,
) {
  const { data } = await api.get<ApiEnvelope<ClientDocumentsView>>(
    `${BASE}/documents${scoped(accountId, { category: category ?? '' })}`,
  );
  return data.data;
}

/** Uploaded agreements. Invoices download through the Invoices module. */
export async function downloadClientDocument(id: string, filename: string) {
  await downloadFromApi(`${BASE}/documents/${id}/download`, filename);
}

/* ------------------------------ own company ------------------------------ */

export interface ClientCompany {
  id: string;
  companyName: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logo: string | null;
  status: string;
}

export async function getClientCompany(accountId?: string) {
  const { data } = await api.get<ApiEnvelope<ClientCompany>>(
    `${BASE}/company${scoped(accountId)}`,
  );
  return data.data;
}

export interface ClientCompanyInput {
  companyName?: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  /** New logo, sent as `logo`. */
  logo?: File;
  /** Super admin only — edit another company. */
  accountId?: string;
}

/**
 * Multipart, because the logo rides along. Only the keys present are sent, so
 * saving the description cannot blank the phone number.
 */
export async function updateClientCompany(input: ClientCompanyInput) {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) form.append(key, value);
    else form.append(key, String(value));
  });

  const { data } = await api.patch<ApiEnvelope<ClientCompany>>(
    `${BASE}/company`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

/* ----------------------------- administration ---------------------------- */

export interface ClientAccountRow {
  id: string;
  name: string;
  industry: string | null;
  email: string | null;
  phone: string | null;
  location: string;
  status: string;
  logo: string | null;
  projectCount: number;
  activeProjects: number;
  endedProjects: number;
  documentCount: number;
  users: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
}

export async function listClientAccounts() {
  const { data } = await api.get<ApiEnvelope<ClientAccountRow[]>>(
    `${BASE}/admin/accounts`,
  );
  return data.data ?? [];
}

/** Point a user at a client company. Pass an empty accountId to unlink. */
export async function linkClientUser(userId: string, accountId: string) {
  const { data } = await api.post<ApiEnvelope<unknown>>(`${BASE}/admin/link`, {
    userId,
    accountId,
  });
  return data.data;
}

export async function uploadClientDocument(input: {
  accountId: string;
  projectId?: string;
  title: string;
  description?: string;
  category?: string;
  file: File;
}) {
  const form = new FormData();
  form.append('accountId', input.accountId);
  if (input.projectId) form.append('projectId', input.projectId);
  form.append('title', input.title);
  if (input.description) form.append('description', input.description);
  form.append('category', input.category ?? 'AGREEMENT');
  form.append('file', input.file);

  const { data } = await api.post<ApiEnvelope<unknown>>(
    `${BASE}/admin/documents`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function deleteClientDocument(documentId: string) {
  await api.delete(`${BASE}/admin/documents/${documentId}`);
}

/* ------------------------------ project close ---------------------------- */

export async function endProject(
  projectId: string,
  input: { endedAt?: string; endSummary?: string } = {},
) {
  const { data } = await api.patch<ApiEnvelope<unknown>>(
    `/projects/${projectId}/end`,
    input,
  );
  return data.data;
}

export async function reopenProject(projectId: string) {
  const { data } = await api.patch<ApiEnvelope<unknown>>(
    `/projects/${projectId}/reopen`,
  );
  return data.data;
}
