import api from './api';
import type { ApiResponse } from '@/types';
import type { Investment, InvestorRef } from './investmentApi';

/* ------------------------------ Commitments ------------------------------ */
/**
 * Commitment = the investor's pledge ("I will invest ₹1,00,000"), paid over
 * time in installments (Investment records with commitmentId) and spent via
 * Expense records. The backend computes all running totals.
 *
 * Endpoints:
 *   GET    /commitments/my                → own commitments + payments + expenses
 *   GET    /commitments                   → all, with totals            (admin)
 *   GET    /commitments/:id               → one, with full detail       (admin)
 *   POST   /commitments                   → create                      (admin)
 *   PATCH  /commitments/:id               → update                      (admin)
 *   DELETE /commitments/:id               → delete (only when empty)    (admin)
 *   POST   /commitments/:id/expenses      → record spend                (admin)
 *   DELETE /commitments/expenses/:expId   → remove spend                (admin)
 */

export type CommitmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface RawRef {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface RawExpense {
  _id?: string;
  id?: string;
  amount: number;
  category?: string;
  description?: string;
  spentAt?: string;
  createdAt?: string;
}

interface RawPayment {
  _id?: string;
  id?: string;
  amount: number;
  investedAt?: string;
  notes?: string;
  invoiceUrl?: string;
}

interface RawCommitment {
  _id?: string;
  id?: string;
  investorId?: RawRef | string;
  title?: string;
  committedAmount: number;
  currency?: string;
  startDate?: string;
  notes?: string;
  status?: CommitmentStatus;
  createdAt?: string;
  // computed by the backend
  receivedTotal?: number;
  paymentCount?: number;
  spentTotal?: number;
  expenseCount?: number;
  remainingToReceive?: number;
  balanceAvailable?: number;
  payments?: RawPayment[];
  expenses?: RawExpense[];
}

export interface CommitmentExpense {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  spentAt?: string;
}

export interface CommitmentPayment {
  id: string;
  amount: number;
  investedAt?: string;
  notes?: string;
  invoiceUrl?: string;
}

export interface Commitment {
  id: string;
  investor?: InvestorRef;
  title: string;
  committedAmount: number;
  currency: string;
  startDate?: string;
  notes?: string;
  status: CommitmentStatus;
  receivedTotal: number;
  paymentCount: number;
  spentTotal: number;
  expenseCount: number;
  remainingToReceive: number;
  balanceAvailable: number;
  payments?: CommitmentPayment[];
  expenses?: CommitmentExpense[];
}

function refName(ref?: RawRef): string {
  return [ref?.firstName, ref?.lastName].filter(Boolean).join(' ').trim() || ref?.email || '';
}

function mapCommitment(raw: RawCommitment): Commitment {
  const investorRef = typeof raw.investorId === 'object' ? raw.investorId : undefined;
  return {
    id: raw.id ?? raw._id ?? '',
    investor: investorRef
      ? {
          id: investorRef.id ?? investorRef._id ?? '',
          name: refName(investorRef),
          email: investorRef.email ?? '',
        }
      : undefined,
    title: raw.title ?? 'Investment commitment',
    committedAmount: raw.committedAmount,
    currency: raw.currency ?? 'INR',
    startDate: raw.startDate,
    notes: raw.notes,
    status: raw.status ?? 'ACTIVE',
    receivedTotal: raw.receivedTotal ?? 0,
    paymentCount: raw.paymentCount ?? 0,
    spentTotal: raw.spentTotal ?? 0,
    expenseCount: raw.expenseCount ?? 0,
    remainingToReceive: raw.remainingToReceive ?? Math.max(0, raw.committedAmount - (raw.receivedTotal ?? 0)),
    balanceAvailable: raw.balanceAvailable ?? (raw.receivedTotal ?? 0) - (raw.spentTotal ?? 0),
    payments: raw.payments?.map((p) => ({
      id: p.id ?? p._id ?? '',
      amount: p.amount,
      investedAt: p.investedAt,
      notes: p.notes,
      invoiceUrl: p.invoiceUrl,
    })),
    expenses: raw.expenses?.map((e) => ({
      id: e.id ?? e._id ?? '',
      amount: e.amount,
      category: e.category,
      description: e.description,
      spentAt: e.spentAt,
    })),
  };
}

/** GET /commitments  (admin) — all commitments with running totals. */
export async function listCommitments(): Promise<Commitment[]> {
  const { data } = await api.get<ApiResponse<RawCommitment[]>>('/commitments');
  return (data.data ?? []).map(mapCommitment);
}

/** GET /commitments/:id  (admin) — one commitment with payments + expenses. */
export async function getCommitment(id: string): Promise<Commitment> {
  const { data } = await api.get<ApiResponse<RawCommitment>>(`/commitments/${id}`);
  return mapCommitment(data.data);
}

/** GET /commitments/my — the investor's own commitments, fully detailed. */
export async function listMyCommitments(): Promise<Commitment[]> {
  const { data } = await api.get<ApiResponse<RawCommitment[]>>('/commitments/my');
  return (data.data ?? []).map(mapCommitment);
}

export interface CommitmentInput {
  investorId: string;
  title?: string;
  committedAmount: number;
  startDate?: string;
  notes?: string;
  status?: CommitmentStatus;
}

/** POST /commitments  (admin) */
export async function createCommitment(input: CommitmentInput): Promise<Commitment> {
  const { data } = await api.post<ApiResponse<RawCommitment>>('/commitments', input);
  return mapCommitment(data.data);
}

/** PATCH /commitments/:id  (admin) */
export async function updateCommitment(
  id: string,
  input: Partial<CommitmentInput>,
): Promise<Commitment> {
  const { data } = await api.patch<ApiResponse<RawCommitment>>(`/commitments/${id}`, input);
  return mapCommitment(data.data);
}

/** DELETE /commitments/:id  (admin) — only allowed when it has no payments/expenses. */
export async function deleteCommitment(id: string): Promise<void> {
  await api.delete(`/commitments/${id}`);
}

export interface ExpenseInput {
  amount: number;
  category?: string;
  description?: string;
  spentAt?: string;
}

/** POST /commitments/:id/expenses  (admin) — record money spent from the fund. */
export async function addExpense(commitmentId: string, input: ExpenseInput): Promise<void> {
  await api.post(`/commitments/${commitmentId}/expenses`, input);
}

/** DELETE /commitments/expenses/:expenseId  (admin) */
export async function deleteExpense(expenseId: string): Promise<void> {
  await api.delete(`/commitments/expenses/${expenseId}`);
}

/** Re-export for convenience where both ledgers are shown together. */
export type { Investment };
