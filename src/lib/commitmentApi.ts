import api from './api';
import { downloadFromApi } from './download';
import type { ApiResponse } from '@/types';
import type { Investment, InvestorRef, InvoiceDocRef, RawInvoiceDocRef } from './investmentApi';
import { mapInvoiceDoc } from './investmentApi';

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
 *   GET    /commitments/my/next-due       → own next payment due date
 *   GET    /commitments/investors/:id/next-due → any investor's next due (admin)
 */

export type CommitmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface RawRef {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface RawAttachment {
  url: string;
  resourceType?: 'image' | 'raw';
  originalName?: string;
  mimeType?: string;
  /** Backend flag: the file's storage account is no longer connected. */
  unavailable?: boolean;
}

interface RawExpense {
  _id?: string;
  id?: string;
  amount: number;
  category?: string;
  description?: string;
  spentAt?: string;
  attachments?: RawAttachment[];
  invoiceId?: RawInvoiceDocRef | string;
  createdAt?: string;
}

interface RawPayment {
  _id?: string;
  id?: string;
  amount: number;
  investedAt?: string;
  notes?: string;
  invoiceUrl?: string;
  invoiceOriginalName?: string;
  invoiceUnavailable?: boolean;
  invoiceId?: RawInvoiceDocRef | string;
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
  dueDay?: number;
  nextDueDate?: string;
  dueReminderEnabled?: boolean;
  lastDueNotifiedAt?: string;
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

/** Proof file on an expense: screenshot / bank receipt / invoice bill. */
export interface ExpenseAttachment {
  url: string;
  /** True when the file is a PDF (renders/downloads differently from images). */
  isPdf: boolean;
  name: string;
  /**
   * False when the file can no longer be fetched — its storage account is not
   * connected anymore. The row still lists the attachment (the expense DID
   * have a receipt); the actions are just disabled.
   */
  available: boolean;
}

export interface CommitmentExpense {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  spentAt?: string;
  attachments: ExpenseAttachment[];
  /** Generated invoice/bill linked to this expense. */
  invoiceDoc?: InvoiceDocRef;
}

export interface CommitmentPayment {
  id: string;
  amount: number;
  investedAt?: string;
  notes?: string;
  invoiceUrl?: string;
  invoiceName?: string;
  /** False when the invoice file's storage account is no longer connected. */
  invoiceAvailable: boolean;
  /** Generated invoice/bill linked to this payment. */
  invoiceDoc?: InvoiceDocRef;
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
  dueDay?: number;
  nextDueDate?: string;
  dueReminderEnabled: boolean;
  lastDueNotifiedAt?: string;
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
    dueDay: raw.dueDay,
    nextDueDate: raw.nextDueDate,
    dueReminderEnabled: raw.dueReminderEnabled ?? true,
    lastDueNotifiedAt: raw.lastDueNotifiedAt,
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
      invoiceName: p.invoiceOriginalName,
      invoiceAvailable: !!p.invoiceUrl && !p.invoiceUnavailable,
      invoiceDoc: mapInvoiceDoc(p.invoiceId),
    })),
    expenses: raw.expenses?.map((e) => ({
      id: e.id ?? e._id ?? '',
      amount: e.amount,
      category: e.category,
      description: e.description,
      spentAt: e.spentAt,
      attachments: (e.attachments ?? []).map((a, i) => ({
        url: a.url,
        isPdf: a.resourceType === 'raw' || a.mimeType === 'application/pdf',
        name: a.originalName || `proof-${i + 1}`,
        available: !a.unavailable,
      })),
      invoiceDoc: mapInvoiceDoc(e.invoiceId),
    })),
  };
}

/* ------------------------------ Next due ------------------------------- */

interface RawNextDueEntry {
  commitmentId: string;
  title: string;
  currency: string;
  committedAmount: number;
  receivedTotal: number;
  pendingAmount: number;
  dueDay: number;
  dueReminderEnabled: boolean;
  nextDueDate: string;
  nextDueDateLabel: string;
  daysUntilDue: number;
}

interface RawNextDue {
  investorId: string;
  nextDueDate: string | null;
  nextDueDateLabel: string | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
  currency: string | null;
  pendingAmount: number;
  commitment: RawNextDueEntry | null;
  upcoming?: RawNextDueEntry[];
}

/** One ACTIVE commitment with money still outstanding, and when it's due. */
export interface NextDueEntry {
  commitmentId: string;
  title: string;
  currency: string;
  committedAmount: number;
  receivedTotal: number;
  /** Committed minus received — what this due date is actually asking for. */
  pendingAmount: number;
  /** Day of the month the installment falls on (1–31). */
  dueDay: number;
  dueReminderEnabled: boolean;
  /** ISO date at UTC midnight — format with `timeZone: 'UTC'`. */
  nextDueDate: string;
  /** Server-rendered "05 Aug 2026". */
  nextDueDateLabel: string;
  /** Whole days from today (IST) to the due date. Negative means overdue. */
  daysUntilDue: number;
}

/**
 * The investor's next payment: the soonest due date across their ACTIVE
 * commitments that still have a balance. `commitment` is null (and
 * `nextDueDate` null) when nothing is outstanding — that is a normal 200,
 * not an error.
 */
export interface NextDue {
  investorId: string;
  nextDueDate: string | null;
  nextDueDateLabel: string | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
  currency: string | null;
  pendingAmount: number;
  commitment: NextDueEntry | null;
  /** Every pending commitment, earliest due first (includes `commitment`). */
  upcoming: NextDueEntry[];
}

function mapNextDue(raw: RawNextDue): NextDue {
  return {
    investorId: raw.investorId,
    nextDueDate: raw.nextDueDate ?? null,
    nextDueDateLabel: raw.nextDueDateLabel ?? null,
    daysUntilDue: raw.daysUntilDue ?? null,
    isOverdue: raw.isOverdue ?? false,
    currency: raw.currency ?? null,
    pendingAmount: raw.pendingAmount ?? 0,
    commitment: raw.commitment ?? null,
    upcoming: raw.upcoming ?? [],
  };
}

/** GET /commitments/my/next-due — the logged-in investor's next payment. */
export async function getMyNextDue(): Promise<NextDue> {
  const { data } = await api.get<ApiResponse<RawNextDue>>('/commitments/my/next-due');
  return mapNextDue(data.data);
}

/** GET /commitments/investors/:investorId/next-due  (admin) */
export async function getInvestorNextDue(investorId: string): Promise<NextDue> {
  const { data } = await api.get<ApiResponse<RawNextDue>>(
    `/commitments/investors/${investorId}/next-due`,
  );
  return mapNextDue(data.data);
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
  dueDay?: number | null;
  dueReminderEnabled?: boolean;
}

export interface DueRunResult {
  checked: number;
  notified: number;
  skipped: number;
  /** Reminder emails the provider accepted. */
  emailsSent: number;
  /** Reminder emails that failed or were deliberately skipped. */
  emailsFailed: number;
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

export async function runDueReminders(): Promise<DueRunResult> {
  const { data } = await api.post<ApiResponse<DueRunResult>>('/commitments/due/run');
  return (
    data.data ?? { checked: 0, notified: 0, skipped: 0, emailsSent: 0, emailsFailed: 0 }
  );
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
  /** Proof files: screenshots, bank receipts, invoice bills (PNG/JPG/PDF, max 5). */
  attachments?: File[];
  /** Generated invoice/bill to link. */
  invoiceId?: string;
}

/**
 * POST /commitments/:id/expenses  (admin, multipart) — record money spent
 * from the fund, with optional proof files the investor can view/download.
 */
export async function addExpense(commitmentId: string, input: ExpenseInput): Promise<void> {
  const form = new FormData();
  form.append('amount', String(input.amount));
  if (input.category) form.append('category', input.category);
  if (input.description) form.append('description', input.description);
  if (input.spentAt) form.append('spentAt', input.spentAt);
  if (input.invoiceId) form.append('invoiceId', input.invoiceId);
  for (const f of input.attachments ?? []) form.append('attachments', f);

  await api.post(`/commitments/${commitmentId}/expenses`, form, {
    headers: { 'Content-Type': undefined } as never,
  });
}

/**
 * Download an expense proof file (screenshot / receipt / bill) with its
 * original filename. Streams through the backend so the saved name is correct.
 */
export async function downloadExpenseAttachment(
  expenseId: string,
  index: number,
  filename = 'proof',
): Promise<void> {
  await downloadFromApi(
    `/commitments/expenses/${expenseId}/attachments/${index}`,
    filename,
  );
}

/** Download an installment invoice with its original filename. */
export async function downloadCommitmentInvoice(
  paymentId: string,
  filename = 'invoice.pdf',
): Promise<void> {
  await downloadFromApi(`/investments/${paymentId}/invoice`, filename);
}

/** DELETE /commitments/expenses/:expenseId  (admin) */
export async function deleteExpense(expenseId: string): Promise<void> {
  await api.delete(`/commitments/expenses/${expenseId}`);
}

/**
 * PATCH /commitments/expenses/:expenseId/invoice  (admin) — attach, change or
 * remove (null) the generated invoice linked to an expense.
 */
export async function linkExpenseInvoice(
  expenseId: string,
  invoiceId: string | null,
): Promise<void> {
  await api.patch(`/commitments/expenses/${expenseId}/invoice`, { invoiceId });
}

/** Re-export for convenience where both ledgers are shown together. */
export type { Investment };