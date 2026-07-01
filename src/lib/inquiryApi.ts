import api from './api';
import type { Account, ApiResponse, ContactInquiry, InquiryStatus, Lead } from '@/types';

/** Raw inquiry as returned by Mongo (uses _id). */
interface RawInquiry {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  status: InquiryStatus;
  isConverted: boolean;
  createdAt?: string;
}

function mapInquiry(raw: RawInquiry): ContactInquiry {
  return {
    id: raw.id ?? raw._id ?? '',
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    company: raw.company,
    message: raw.message,
    status: raw.status,
    isConverted: raw.isConverted,
    createdAt: raw.createdAt,
  };
}

/**
 * GET /contact-inquiries  (admin) — all inbound website inquiries, newest first.
 */
export async function listInquiries(): Promise<ContactInquiry[]> {
  const { data } = await api.get<ApiResponse<RawInquiry[]>>('/contact-inquiries');
  return (data.data ?? []).map(mapInquiry);
}

/**
 * PATCH /contact-inquiries/:id  (admin) — update the workflow status.
 */
export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
): Promise<ContactInquiry> {
  const { data } = await api.patch<ApiResponse<RawInquiry>>(`/contact-inquiries/${id}`, {
    status,
  });
  return mapInquiry(data.data);
}

/**
 * DELETE /contact-inquiries/:id  (admin)
 */
export async function deleteInquiry(id: string): Promise<void> {
  await api.delete(`/contact-inquiries/${id}`);
}

/** Result of converting an inquiry: the new lead + the account it was linked
 * to (account is null when the inquiry had no company name). */
export interface ConvertInquiryResult {
  lead: Lead;
  account: Account | null;
}

/**
 * POST /contact-inquiries/:id/convert-to-lead  (admin) — promote an inquiry
 * into the sales pipeline as a Lead (source: WEBSITE).
 *
 * Requires the inquiry to be in status ASSIGNED (enforced by the backend).
 * The backend also finds-or-creates a CRM Account from the company name and
 * links the new lead to it.
 */
export async function convertInquiryToLead(id: string): Promise<ConvertInquiryResult> {
  const { data } = await api.post<ApiResponse<ConvertInquiryResult>>(
    `/contact-inquiries/${id}/convert-to-lead`,
    {},
  );
  return data.data;
}

export interface CreateInquiryInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
}

/**
 * POST /contact-inquiries  (PUBLIC, no auth) — the website contact form.
 * Exposed here for completeness; the live public site (esscentra.in) calls the
 * same endpoint directly.
 */
export async function createInquiry(input: CreateInquiryInput): Promise<ContactInquiry> {
  const { data } = await api.post<ApiResponse<RawInquiry>>('/contact-inquiries', input);
  return mapInquiry(data.data);
}
