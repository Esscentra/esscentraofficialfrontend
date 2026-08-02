import api from './api';
import { downloadFromApi } from './download';
import type { ApiResponse as ApiEnvelope } from '@/types';
import type { FinanceAttachment, PaymentMode, PersonRef } from './financeApi';

/**
 * ============================================================================
 *  INVOICES & PAYMENT BILLS API
 * ============================================================================
 *
 * INVOICE — raised before money is collected (blue documents).
 * BILL    — the receipt after money has moved (green documents).
 *
 * Generation, editing and deletion are super-admin only server-side; parties
 * with accounts read their own documents through `/my` and the owner-checked
 * PDF route.
 * ============================================================================
 */

export const INVOICE_KINDS = ['INVOICE', 'BILL'] as const;
export const INVOICE_STATUSES = ['ISSUED', 'PAID', 'CANCELLED'] as const;
/**
 * Party types are DYNAMIC — any role name from the roles collection is valid,
 * plus these external kinds. This list is only the offline fallback the
 * editor offers when the roles collection cannot be read.
 */
export const INVOICE_PARTY_TYPES = [
  'INVESTOR',
  'CLIENT',
  'FREELANCER',
  'VENDOR',
  'OTHER',
] as const;

export type InvoiceKind = (typeof INVOICE_KINDS)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type InvoicePartyType = string;

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceRecord {
  _id: string;
  kind: InvoiceKind;
  number: string;
  status: InvoiceStatus;
  partyType: InvoicePartyType;
  partyId?: PersonRef | string | null;
  partyName: string;
  partyEmail?: string;
  partyPhone?: string;
  partyAddress?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  issueDate: string;
  dueDate?: string;
  paidAt?: string;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  sourceInvoiceId?: string;
  commitmentId?: string;
  investmentId?: string;
  expenseId?: string;
  pdf?: FinanceAttachment;
  createdBy?: PersonRef;
  createdAt: string;
}

export interface InvoiceListResult {
  rows: InvoiceRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  summary: {
    outstandingAmount: number;
    outstandingCount: number;
    collectedAmount: number;
    collectedCount: number;
    billAmount: number;
    billCount: number;
    currency: string;
  };
}

export interface InvoiceLineItemInput {
  description: string;
  quantity?: number | string;
  unitPrice: number | string;
}

export interface InvoiceInput {
  kind?: InvoiceKind;
  partyType: InvoicePartyType;
  partyId?: string;
  partyName: string;
  partyEmail?: string;
  partyPhone?: string;
  partyAddress?: string;
  lineItems: InvoiceLineItemInput[];
  discount?: number | string;
  issueDate?: string;
  dueDate?: string;
  paidAt?: string;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  commitmentId?: string;
  investmentId?: string;
  expenseId?: string;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Strip empty-string optionals so the backend sees genuinely-unset fields. */
function clean<T extends object>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  ) as T;
}

export async function listInvoices(
  params: {
    kind?: string;
    status?: string;
    partyType?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { data } = await api.get<ApiEnvelope<InvoiceListResult>>(
    `/invoices${queryString(params)}`,
  );
  return data.data;
}

/**
 * The number the next document of this kind will receive (admin). Pass the
 * draft's issue date so the YYMM in the number follows that date.
 */
export async function getNextInvoiceNumber(
  kind: InvoiceKind,
  date?: string,
): Promise<string> {
  const { data } = await api.get<ApiEnvelope<{ kind: string; number: string }>>(
    `/invoices/next-number${queryString({ kind, date })}`,
  );
  return data.data?.number ?? '';
}

export async function getMyInvoices() {
  const { data } = await api.get<ApiEnvelope<InvoiceRecord[]>>('/invoices/my');
  return data.data ?? [];
}

export async function createInvoice(input: InvoiceInput) {
  const { data } = await api.post<ApiEnvelope<InvoiceRecord>>('/invoices', {
    ...clean(input),
    lineItems: input.lineItems,
  });
  return data.data;
}

export async function updateInvoice(id: string, input: Partial<InvoiceInput>) {
  const { data } = await api.patch<ApiEnvelope<InvoiceRecord>>(`/invoices/${id}`, {
    ...clean(input),
    ...(input.lineItems ? { lineItems: input.lineItems } : {}),
  });
  return data.data;
}

export async function markInvoicePaid(
  id: string,
  input: {
    paidAt?: string;
    paymentMode?: PaymentMode;
    referenceNumber?: string;
    generateBill?: boolean;
  } = {},
) {
  const { data } = await api.patch<
    ApiEnvelope<{ invoice: InvoiceRecord; bill: InvoiceRecord | null }>
  >(`/invoices/${id}/mark-paid`, clean(input));
  return data.data;
}

export async function deleteInvoice(id: string) {
  await api.delete(`/invoices/${id}`);
}

export async function downloadInvoicePdf(id: string, filename: string) {
  await downloadFromApi(`/invoices/${id}/pdf`, filename);
}

/** Open the PDF in a new browser tab for viewing (auth-checked, blob-backed). */
export async function viewInvoicePdf(id: string): Promise<void> {
  const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data as Blob], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  // Revoke once the tab has had ample time to load the document.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
