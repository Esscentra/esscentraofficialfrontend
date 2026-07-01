import api from './api';
import type { Account, ApiResponse, Lead, LeadStatus } from '@/types';

/** Raw lead as returned by Mongo (uses _id). */
interface RawLead {
  _id?: string;
  id?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status: LeadStatus;
  accountId?: string;
  notes?: string;
  createdAt?: string;
}

function mapLead(raw: RawLead): Lead {
  return {
    id: raw.id ?? raw._id ?? '',
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    phone: raw.phone,
    company: raw.company,
    source: raw.source,
    status: raw.status,
    accountId: raw.accountId,
    notes: raw.notes,
    createdAt: raw.createdAt,
  };
}

export interface LeadInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: LeadStatus;
  notes?: string;
}

/** GET /leads  (admin) — all leads, newest first. */
export async function listLeads(): Promise<Lead[]> {
  const { data } = await api.get<ApiResponse<RawLead[]>>('/leads');
  return (data.data ?? []).map(mapLead);
}

/** POST /leads  (admin) */
export async function createLead(input: LeadInput): Promise<Lead> {
  const { data } = await api.post<ApiResponse<RawLead>>('/leads', input);
  return mapLead(data.data);
}

/** PATCH /leads/:id  (admin) */
export async function updateLead(id: string, input: Partial<LeadInput>): Promise<Lead> {
  const { data } = await api.patch<ApiResponse<RawLead>>(`/leads/${id}`, input);
  return mapLead(data.data);
}

/** DELETE /leads/:id  (admin) */
export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/leads/${id}`);
}

/** Result of converting a lead: the updated lead + the account it was linked to. */
export interface ConvertLeadResult {
  lead: Lead;
  account: Account;
}

/**
 * POST /leads/:id/convert-to-account  (admin) — turn a qualified lead into a
 * CRM Account. The backend finds-or-creates the Account from the lead's company
 * name, links the lead to it, and sets the lead status to CONVERTED.
 * Requires the lead to have a company name.
 */
export async function convertLeadToAccount(id: string): Promise<ConvertLeadResult> {
  const { data } = await api.post<ApiResponse<{ lead: RawLead; account: Account }>>(
    `/leads/${id}/convert-to-account`,
    {},
  );
  return { lead: mapLead(data.data.lead), account: data.data.account };
}
