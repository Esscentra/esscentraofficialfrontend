import api from './api';
import type { Account, ApiResponse } from '@/types';

/** Raw account as returned by Mongo (uses _id; ownerId is populated). */
interface RawAccount {
  _id?: string;
  id?: string;
  companyName: string;
  website?: string;
  industry?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logo?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  ownerId?: { firstName?: string; lastName?: string; email?: string } | string;
  createdAt?: string;
}

function mapAccount(raw: RawAccount): Account {
  const owner = typeof raw.ownerId === 'object' && raw.ownerId ? raw.ownerId : undefined;
  return {
    id: raw.id ?? raw._id ?? '',
    companyName: raw.companyName,
    website: raw.website,
    industry: raw.industry,
    phone: raw.phone,
    email: raw.email,
    address: raw.address,
    city: raw.city,
    state: raw.state,
    country: raw.country,
    logo: raw.logo,
    notes: raw.notes,
    status: raw.status,
    ownerName: owner
      ? [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email
      : undefined,
    createdAt: raw.createdAt,
  };
}

/**
 * GET /accounts  (admin) — all CRM accounts, newest first.
 *
 * Accounts are read-only from the client: they are created only by converting
 * a Lead (POST /leads/:id/convert-to-account). There is no create/update/delete.
 */
export async function listAccounts(): Promise<Account[]> {
  const { data } = await api.get<ApiResponse<RawAccount[]>>('/accounts');
  return (data.data ?? []).map(mapAccount);
}
