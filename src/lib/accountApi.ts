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

/** GET /accounts  (admin) — all CRM accounts, newest first. */
export async function listAccounts(): Promise<Account[]> {
  const { data } = await api.get<ApiResponse<RawAccount[]>>('/accounts');
  return (data.data ?? []).map(mapAccount);
}

export interface AccountInput {
  companyName: string;
  website?: string;
  industry?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

/**
 * POST /accounts  (admin) — manually create an account. Accounts are also
 * created automatically when a lead is converted (convert-to-account); update
 * and delete are not exposed.
 */
export async function createAccount(input: AccountInput): Promise<Account> {
  const { data } = await api.post<ApiResponse<RawAccount>>('/accounts', input);
  return mapAccount(data.data);
}
