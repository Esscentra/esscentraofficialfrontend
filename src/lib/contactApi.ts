import api from './api';
import type { ApiResponse, Contact } from '@/types';

/**
 * CRM contacts — people at your accounts.
 *
 * Endpoints (admin/staff session):
 *   GET    /contacts       → all contacts
 *   GET    /contacts/:id   → one contact
 *   POST   /contacts       → create (body needs accountId)
 *   PATCH  /contacts/:id   → update
 *   DELETE /contacts/:id   → delete
 */

type RawAccountRef = { _id?: string; id?: string; companyName?: string };

interface RawContact {
  _id?: string;
  id?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  // designation may arrive under a few names depending on the backend
  designation?: string;
  jobTitle?: string;
  position?: string;
  title?: string;
  notes?: string;
  accountId?: string | RawAccountRef;
  account?: RawAccountRef;
  createdAt?: string;
}

function mapContact(raw: RawContact): Contact {
  const acc =
    typeof raw.accountId === 'object' && raw.accountId
      ? raw.accountId
      : raw.account && typeof raw.account === 'object'
        ? raw.account
        : undefined;
  return {
    id: raw.id ?? raw._id ?? '',
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    phone: raw.phone,
    designation: raw.designation ?? raw.jobTitle ?? raw.position ?? raw.title,
    notes: raw.notes,
    accountId:
      typeof raw.accountId === 'string'
        ? raw.accountId
        : (acc?.id ?? acc?._id ?? undefined),
    accountName: acc?.companyName,
    createdAt: raw.createdAt,
  };
}

/** Unwrap whether the API returns an array or a wrapped object. */
function extractList(data: unknown): RawContact[] {
  if (Array.isArray(data)) return data as RawContact[];
  const obj = data as { contacts?: RawContact[]; items?: RawContact[] } | null;
  return obj?.contacts ?? obj?.items ?? [];
}

export interface ContactInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  designation?: string;
  notes?: string;
  accountId?: string;
}

/** GET /contacts — all contacts, newest first. */
export async function listContacts(): Promise<Contact[]> {
  const { data } = await api.get<ApiResponse<RawContact[]>>('/contacts');
  return extractList(data.data).map(mapContact);
}

/** POST /contacts — body includes accountId. */
export async function createContact(input: ContactInput): Promise<Contact> {
  const { data } = await api.post<ApiResponse<RawContact>>('/contacts', input);
  return mapContact(data.data);
}

/** PATCH /contacts/:id */
export async function updateContact(id: string, input: Partial<ContactInput>): Promise<Contact> {
  const { data } = await api.patch<ApiResponse<RawContact>>(`/contacts/${id}`, input);
  return mapContact(data.data);
}

/** DELETE /contacts/:id */
export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
}
