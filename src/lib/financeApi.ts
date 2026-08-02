import api from './api';
import { downloadFromApi } from './download';
import type { ApiResponse as ApiEnvelope } from '@/types';

/**
 * ============================================================================
 *  FINANCE ADMIN API — revenue, expenses, valuation, distributions, documents
 * ============================================================================
 *
 * Write endpoints are admin-only server-side. Two of them (`/my` on
 * distributions and documents) are investor-facing and appear here too, so a
 * page needs only one import to render both the admin and the investor view.
 *
 * Anything with a file attached goes as multipart/form-data. `toFormData`
 * builds those bodies so no call site has to remember which fields are files.
 * ============================================================================
 */

/* ------------------------------ constants -------------------------------- */

export const PAYMENT_MODES = [
  'BANK_TRANSFER',
  'UPI',
  'CARD',
  'CASH',
  'CHEQUE',
  'RAZORPAY',
  'STRIPE',
  'OTHER',
] as const;

export const REVENUE_STATUSES = ['PENDING', 'RECEIVED', 'OVERDUE', 'CANCELLED'] as const;

export const EXPENSE_CATEGORIES = [
  'HOSTING',
  'MARKETING',
  'SALARY',
  'INTERNET',
  'SOFTWARE',
  'OFFICE',
  'TRAVEL',
  'PROFESSIONAL_FEES',
  'TAXES',
  'MISCELLANEOUS',
] as const;

export const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;

export const VALUATION_METHODS = [
  'NEW_INVESTMENT',
  'ACQUISITION',
  'MUTUAL_AGREEMENT',
  'INDEPENDENT_VALUATION',
] as const;

export const VALUATION_BASES = ['PRE_MONEY', 'POST_MONEY'] as const;

export const DISTRIBUTION_TYPES = [
  'PROFIT_SHARE',
  'CAPITAL_RETURN',
  'BONUS',
  'OTHER',
] as const;

export const DOCUMENT_CATEGORIES = [
  'INVESTOR_AGREEMENT',
  'SHARE_CERTIFICATE',
  'INVESTMENT_RECEIPT',
  'INVOICE',
  'GST_BILL',
  'REPORT',
  'OTHER',
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];
export type RevenueStatus = (typeof REVENUE_STATUSES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export type ValuationMethod = (typeof VALUATION_METHODS)[number];
export type ValuationBasis = (typeof VALUATION_BASES)[number];
export type DistributionType = (typeof DISTRIBUTION_TYPES)[number];
export type DistributionStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

/* -------------------------------- types ---------------------------------- */

export interface PersonRef {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface FinanceAttachment {
  url: string;
  publicId: string;
  resourceType: 'image' | 'raw';
  originalName?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface RevenueRecord {
  _id: string;
  clientName: string;
  invoiceNumber?: string;
  description?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  receivedAt?: string;
  status: RevenueStatus;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  isRecurring: boolean;
  attachments: FinanceAttachment[];
  notes?: string;
  createdBy?: PersonRef;
  createdAt: string;
}

export interface RevenueListResult {
  rows: RevenueRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  totals: {
    totalRevenue: number;
    receivedCount: number;
    pendingAmount: number;
    pendingCount: number;
    overdueAmount: number;
    overdueCount: number;
    cancelledAmount: number;
    invoiceCount: number;
    averageInvoice: number;
    currency: string;
  };
}

export interface ExpenseRecord {
  _id: string;
  category: ExpenseCategory;
  description: string;
  vendor?: string;
  amount: number;
  currency: string;
  spentAt: string;
  status: ExpenseStatus;
  approvedBy?: PersonRef;
  approvedAt?: string;
  rejectionReason?: string;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  paidAt?: string;
  isRecurring: boolean;
  attachments: FinanceAttachment[];
  notes?: string;
  createdBy?: PersonRef;
  createdAt: string;
}

export interface ExpenseListResult {
  rows: ExpenseRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  totals: {
    totalExpenses: number;
    recognisedCount: number;
    pendingAmount: number;
    pendingCount: number;
    rejectedAmount: number;
    paidAmount: number;
    unpaidApprovedAmount: number;
    currency: string;
  };
  byCategory: Array<{ category: string; label: string; total: number; count: number }>;
}

export interface ValuationRecord {
  _id: string;
  value: number;
  basis: ValuationBasis;
  method: ValuationMethod;
  currency: string;
  effectiveDate: string;
  source?: string;
  notes?: string;
  attachments: FinanceAttachment[];
  createdBy?: PersonRef;
  createdAt: string;
  /** Derived on the server and returned with history entries. */
  preMoneyValuation?: number;
  postMoneyValuation?: number;
}

export interface CurrentValuation {
  preMoneyValuation: number;
  postMoneyValuation: number;
  companyValuation: number;
  investmentReceived: number;
  method: string | null;
  basis: string;
  effectiveDate: string | null;
  currency: string;
  isDefault: boolean;
  record: ValuationRecord | null;
}

export interface DistributionRecord {
  _id: string;
  investorId: PersonRef | string;
  type: DistributionType;
  periodKey?: string;
  periodLabel?: string;
  periodStart?: string;
  periodEnd?: string;
  revenueTotal: number;
  expenseTotal: number;
  netProfit: number;
  ownershipPercent: number;
  investorProfit: number;
  founderProfit: number;
  currency: string;
  status: DistributionStatus;
  reason?: string;
  notes?: string;
  approvedBy?: PersonRef;
  approvedAt?: string;
  paidAt?: string;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  receipt?: FinanceAttachment;
  cancelledReason?: string;
  createdAt: string;
}

export interface DistributionPreview {
  investorId: string;
  investorName: string;
  period: { key: string; label: string; start: string; end: string };
  revenueTotal: number;
  expenseTotal: number;
  netProfit: number;
  ownershipPercent: number;
  investorProfit: number;
  founderProfit: number;
  isLoss: boolean;
  existingDistributionId: string | null;
  existingStatus: DistributionStatus | null;
  currency: string;
}

export interface PaymentHistory {
  rows: DistributionRecord[];
  totals: {
    totalPaid: number;
    totalApproved: number;
    paidCount: number;
    pendingCount: number;
    lastPaidAt: string | null;
    currency: string;
  };
}

export interface InvestorDocumentRecord {
  _id: string;
  investorId: PersonRef | string;
  category: DocumentCategory;
  title: string;
  description?: string;
  file: FinanceAttachment;
  issuedAt?: string;
  visibleToInvestor: boolean;
  viewedAt?: string;
  uploadedBy?: PersonRef;
  createdAt: string;
  fileUnavailable?: boolean;
}

export interface DocumentLibrary {
  documents: InvestorDocumentRecord[];
  byCategory: Array<{
    category: DocumentCategory;
    label: string;
    documents: InvestorDocumentRecord[];
  }>;
  total: number;
}

export interface AuditEntry {
  _id: string;
  entity: string;
  entityId: string;
  action: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  description: string;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
  amount?: number;
  createdAt: string;
}

export interface AuditListResult {
  entries: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/* ------------------------------- helpers --------------------------------- */

/**
 * Build a multipart body, skipping empty values.
 *
 * The skip matters: sending `invoiceNumber=""` would fail the backend's
 * "already recorded" check against other blank invoice numbers, whereas
 * omitting the field lets it stay genuinely unset.
 */
function toFormData(
  payload: object,
  files: Record<string, File | File[] | null | undefined> = {},
): FormData {
  const form = new FormData();

  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    form.append(key, value instanceof Date ? value.toISOString() : String(value));
  });

  Object.entries(files).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((file) => form.append(key, file));
    } else {
      form.append(key, value);
    }
  });

  return form;
}

/** Axios needs the boundary set by the browser, so Content-Type is unset. */
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

/* ------------------------------- revenue --------------------------------- */

export interface RevenueInput {
  clientName: string;
  invoiceNumber?: string;
  description?: string;
  amount: number | string;
  paymentDate?: string;
  receivedAt?: string;
  status?: RevenueStatus;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  isRecurring?: boolean;
  notes?: string;
}

export async function listRevenue(
  params: {
    status?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { data } = await api.get<ApiEnvelope<RevenueListResult>>(
    `/revenue${queryString(params)}`,
  );
  return data.data;
}

export async function createRevenue(input: RevenueInput, attachments?: File[]) {
  const { data } = await api.post<ApiEnvelope<RevenueRecord>>(
    '/revenue',
    toFormData(input, { attachments }),
    MULTIPART,
  );
  return data.data;
}

export async function updateRevenue(
  id: string,
  input: Partial<RevenueInput>,
  attachments?: File[],
) {
  const { data } = await api.patch<ApiEnvelope<RevenueRecord>>(
    `/revenue/${id}`,
    toFormData(input, { attachments }),
    MULTIPART,
  );
  return data.data;
}

export async function deleteRevenue(id: string) {
  await api.delete(`/revenue/${id}`);
}

export async function exportRevenue(
  format: 'csv' | 'excel',
  range: { from?: string; to?: string } = {},
) {
  await downloadFromApi(
    `/revenue/export${queryString({ format, ...range })}`,
    `esscentra-revenue.${format === 'excel' ? 'xls' : 'csv'}`,
  );
}

/* ------------------------------- expenses -------------------------------- */

export interface ExpenseInput {
  category: ExpenseCategory;
  description: string;
  vendor?: string;
  amount: number | string;
  spentAt?: string;
  status?: ExpenseStatus;
  paymentMode?: PaymentMode;
  referenceNumber?: string;
  paidAt?: string;
  isRecurring?: boolean;
  notes?: string;
}

export async function listExpenses(
  params: {
    status?: string;
    category?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { data } = await api.get<ApiEnvelope<ExpenseListResult>>(
    `/business-expenses${queryString(params)}`,
  );
  return data.data;
}

export async function createExpense(input: ExpenseInput, attachments?: File[]) {
  const { data } = await api.post<ApiEnvelope<ExpenseRecord>>(
    '/business-expenses',
    toFormData(input, { attachments }),
    MULTIPART,
  );
  return data.data;
}

export async function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
  attachments?: File[],
) {
  const { data } = await api.patch<ApiEnvelope<ExpenseRecord>>(
    `/business-expenses/${id}`,
    toFormData(input, { attachments }),
    MULTIPART,
  );
  return data.data;
}

export async function approveExpense(id: string) {
  const { data } = await api.patch<ApiEnvelope<ExpenseRecord>>(
    `/business-expenses/${id}/approve`,
  );
  return data.data;
}

export async function rejectExpense(id: string, reason?: string) {
  const { data } = await api.patch<ApiEnvelope<ExpenseRecord>>(
    `/business-expenses/${id}/reject`,
    { reason },
  );
  return data.data;
}

export async function deleteExpense(id: string) {
  await api.delete(`/business-expenses/${id}`);
}

export async function exportExpenses(
  format: 'csv' | 'excel',
  range: { from?: string; to?: string } = {},
) {
  await downloadFromApi(
    `/business-expenses/export${queryString({ format, ...range })}`,
    `esscentra-expenses.${format === 'excel' ? 'xls' : 'csv'}`,
  );
}

/* ------------------------------- valuation ------------------------------- */

export interface ValuationInput {
  value: number | string;
  basis?: ValuationBasis;
  method: ValuationMethod;
  effectiveDate?: string;
  source?: string;
  notes?: string;
}

export async function getCurrentValuation() {
  const { data } = await api.get<ApiEnvelope<CurrentValuation>>('/valuations/current');
  return data.data;
}

export async function getValuationHistory() {
  const { data } = await api.get<ApiEnvelope<ValuationRecord[]>>('/valuations/history');
  return data.data ?? [];
}

export async function createValuation(input: ValuationInput, attachments?: File[]) {
  const { data } = await api.post<ApiEnvelope<ValuationRecord>>(
    '/valuations',
    toFormData(input, { attachments }),
    MULTIPART,
  );
  return data.data;
}

export async function updateValuation(id: string, input: Partial<ValuationInput>) {
  const { data } = await api.patch<ApiEnvelope<ValuationRecord>>(
    `/valuations/${id}`,
    toFormData(input),
    MULTIPART,
  );
  return data.data;
}

export async function deleteValuation(id: string) {
  await api.delete(`/valuations/${id}`);
}

/* --------------------------- profit distribution -------------------------- */

export async function previewDistribution(investorId: string, periodKey: string) {
  const { data } = await api.post<ApiEnvelope<DistributionPreview>>(
    '/profit-distributions/preview',
    { investorId, periodKey },
  );
  return data.data;
}

export async function createDistribution(input: {
  investorId: string;
  type?: DistributionType;
  periodKey?: string;
  amount?: number;
  reason?: string;
  notes?: string;
}) {
  const { data } = await api.post<ApiEnvelope<DistributionRecord>>(
    '/profit-distributions',
    input,
  );
  return data.data;
}

export async function listDistributions(
  params: {
    investorId?: string;
    status?: string;
    type?: string;
    periodKey?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { data } = await api.get<
    ApiEnvelope<{
      rows: DistributionRecord[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }>
  >(`/profit-distributions${queryString(params)}`);
  return data.data;
}

/** The investor's own payment history (admins may pass an investorId). */
export async function getMyPaymentHistory(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<PaymentHistory>>(
    `/profit-distributions/my${queryString({ investorId })}`,
  );
  return data.data;
}

export async function approveDistribution(id: string) {
  const { data } = await api.patch<ApiEnvelope<DistributionRecord>>(
    `/profit-distributions/${id}/approve`,
  );
  return data.data;
}

export async function payDistribution(
  id: string,
  input: {
    referenceNumber: string;
    paidAt?: string;
    paymentMode?: PaymentMode;
    notes?: string;
  },
  receipt?: File | null,
) {
  const { data } = await api.patch<ApiEnvelope<DistributionRecord>>(
    `/profit-distributions/${id}/pay`,
    toFormData(input, { receipt }),
    MULTIPART,
  );
  return data.data;
}

export async function cancelDistribution(id: string, reason?: string) {
  const { data } = await api.patch<ApiEnvelope<DistributionRecord>>(
    `/profit-distributions/${id}/cancel`,
    { reason },
  );
  return data.data;
}

export async function deleteDistribution(id: string) {
  await api.delete(`/profit-distributions/${id}`);
}

export async function downloadDistributionReceipt(id: string, filename: string) {
  await downloadFromApi(`/profit-distributions/${id}/receipt`, filename);
}

/* ------------------------------- documents -------------------------------- */

export async function getMyDocuments(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<DocumentLibrary>>(
    `/investor-documents/my${queryString({ investorId })}`,
  );
  return data.data;
}

export async function listDocuments(
  params: { investorId?: string; category?: string } = {},
) {
  const { data } = await api.get<ApiEnvelope<InvestorDocumentRecord[]>>(
    `/investor-documents${queryString(params)}`,
  );
  return data.data ?? [];
}

export async function uploadDocument(
  input: {
    investorId: string;
    category: DocumentCategory;
    title: string;
    description?: string;
    issuedAt?: string;
    visibleToInvestor?: boolean;
  },
  file: File,
) {
  const { data } = await api.post<ApiEnvelope<InvestorDocumentRecord>>(
    '/investor-documents',
    toFormData(input, { file }),
    MULTIPART,
  );
  return data.data;
}

export async function deleteDocument(id: string) {
  await api.delete(`/investor-documents/${id}`);
}

export async function downloadDocument(id: string, filename: string) {
  await downloadFromApi(`/investor-documents/${id}/download`, filename);
}

/* ------------------------------- audit log -------------------------------- */

export async function listAuditLog(
  params: {
    entity?: string;
    entityId?: string;
    action?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { data } = await api.get<ApiEnvelope<AuditListResult>>(
    `/audit-logs${queryString(params)}`,
  );
  return data.data;
}
