import api from './api';
import { downloadFromApi } from './download';
import type { ApiResponse as ApiEnvelope } from '@/types';

/**
 * ============================================================================
 *  INVESTOR FINANCE API
 * ============================================================================
 *
 * Read-only endpoints powering the investor dashboard. Every one of them is
 * scoped server-side to the calling investor; the optional `investorId`
 * argument is honoured only for admins, which is why it is safe to expose
 * here.
 * ============================================================================
 */

/* ------------------------------- types ---------------------------------- */

export interface InvestorSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profileImage: string | null;
  kycStatus: string;
  investorSince: string | null;
}

export interface InvestorOverview {
  investor: InvestorSummary;

  investmentReceived: number;
  committedInvestment: number;
  remainingInvestment: number;

  /** Spent by the company out of the capital this investor has paid in. */
  capitalSpent: number;
  /** Paid in, not yet spent. */
  capitalBalance: number;
  capitalUtilisationPercent: number;

  currentOwnershipPercent: number;
  agreedOwnershipPercent: number;
  investmentProgressPercent: number;
  isFullyFunded: boolean;

  preMoneyValuation: number;
  postMoneyValuation: number;
  companyValuation: number;
  /** Pre-money + all pledged capital — the price the cap table is set at. */
  fullyFundedValuation: number;
  committedCapital: number;
  valuationMethod: string | null;
  valuationEffectiveDate: string | null;
  valuationIsDefault: boolean;

  investorShareValue: number;

  totalProfitReceived: number;
  profitAwaitingPayment: number;
  lastPaidAt: string | null;

  monthlyProfit: number;
  monthlyNetProfit: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthLabel: string;

  lifetimeRevenue: number;
  lifetimeExpenses: number;
  lifetimeNetProfit: number;

  roiPercent: number | null;
  totalReturnPercent: number | null;
  multiple: number | null;
  unrealisedGain: number;

  hasCommitment: boolean;
  currency: string;
}

export interface CommitmentPosition {
  commitmentId: string;
  title: string;
  status: string;
  currency: string;
  committedAmount: number;
  receivedTotal: number;
  remainingAmount: number;
  agreedOwnershipPercent: number;
  ownershipPercent: number;
  fundingProgressPercent: number;
  isFullyFunded: boolean;
  startDate: string;
  investmentType: string;
}

export interface TimelineEntry {
  investmentId: string;
  date: string;
  amount: number;
  currency: string;
  mode: string | null;
  transactionId: string | null;
  commitmentId: string | null;
  commitmentTitle: string | null;
  notes: string | null;
  cumulativeInvested: number;
  ownershipEarned: number;
  cumulativeOwnership: number;
  progressPercent: number;
  status: string;
  hasInvoice: boolean;
  invoiceUnavailable: boolean;
  /** Generated invoice/bill linked to this payment (downloadable). */
  invoiceDocId: string | null;
  invoiceDocNumber: string | null;
  /** Every related generated document: the invoice AND its payment bill. */
  documents?: Array<{ id: string; number: string; kind: 'INVOICE' | 'BILL' }>;
  /** The committed amount this payment vests against. */
  commitmentCommittedAmount?: number;
}

/** Capital recorded outside every live commitment — earns no ownership. */
export interface UncountedPayment {
  investmentId: string;
  date: string;
  amount: number;
  currency: string;
  notes: string | null;
  reason: 'NO_COMMITMENT' | 'COMMITMENT_CANCELLED';
}

export interface InvestmentTimeline {
  entries: TimelineEntry[];
  uncountedPayments?: UncountedPayment[];
  uncountedTotal?: number;
  summary: {
    totalInvested: number;
    committedInvestment: number;
    remainingInvestment: number;
    ownershipPercent: number;
    agreedOwnershipPercent: number;
    progressPercent: number;
    paymentCount: number;
    isFullyFunded: boolean;
    currency: string;
  };
  commitments: CommitmentPosition[];
}

export interface ValuationPoint {
  id: string;
  value: number;
  basis: string;
  method: string;
  effectiveDate: string;
  source: string | null;
  preMoneyValuation: number;
  postMoneyValuation: number;
  fullyFundedValuation?: number;
  investorShareValue: number;
}

export interface ValuationView {
  preMoneyValuation: number;
  postMoneyValuation: number;
  companyValuation: number;
  /** Pre-money + all pledged capital: the price the cap table is set at. */
  fullyFundedValuation: number;
  committedCapital: number;
  totalInvestmentReceived: number;
  method: string | null;
  basis: string;
  effectiveDate: string | null;
  isDefault: boolean;
  ownershipPercent: number;
  agreedOwnershipPercent: number;
  investorShareValue: number;
  investorInvestment: number;
  investorCommitted: number;
  history: ValuationPoint[];
  currency: string;
}

export interface RevenueRow {
  id: string;
  clientName: string;
  invoiceNumber: string | null;
  description: string | null;
  amount: number;
  currency: string;
  paymentDate: string;
  receivedAt: string | null;
  status: string;
  isRecurring: boolean;
}

export interface RevenueView {
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
  byClient: Array<{ clientName: string; total: number; count: number }>;
  rows: RevenueRow[];
  currency: string;
}

export interface ExpenseRow {
  id: string;
  category: string;
  description: string;
  vendor: string | null;
  amount: number;
  currency: string;
  spentAt: string;
  status: string;
  approvedByName: string | null;
  isRecurring: boolean;
}

export interface ExpenseView {
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
  rows: ExpenseRow[];
  currency: string;
}

export interface ProfitView {
  revenue: number;
  expenses: number;
  netProfit: number;
  ownershipPercent: number;
  agreedOwnershipPercent: number;
  investorProfit: number;
  founderProfit: number;
  netMarginPercent: number | null;
  isLoss: boolean;
  investorProfitAtFullOwnership: number;
  totalProfitReceived: number;
  profitAwaitingPayment: number;
  pendingRevenue: number;
  pendingExpenses: number;
  currency: string;
}

export interface MonthlyPoint {
  key: string;
  label: string;
  year: number;
  month: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  investorProfit: number;
  founderProfit: number;
  ownershipPercent: number;
  investmentReceived: number;
  distributedProfit: number;
}

export interface MonthlySeries {
  points: MonthlyPoint[];
  totals: {
    revenue: number;
    expenses: number;
    netProfit: number;
    investorProfit: number;
    founderProfit: number;
    investmentReceived: number;
    distributedProfit: number;
    currentOwnershipPercent: number;
  };
}

export interface RoiView {
  totalInvestment: number;
  committedInvestment: number;
  currentShareValue: number;
  profitReceived: number;
  unrealisedGain: number;
  roiPercent: number | null;
  totalReturnPercent: number | null;
  multiple: number | null;
  ownershipPercent: number;
  agreedOwnershipPercent: number;
  companyValuation: number;
  fullyFundedValuation: number;
  projected: {
    investment: number;
    shareValue: number;
    roiPercent: number | null;
    totalReturnPercent: number | null;
    multiple: number | null;
  };
  currency: string;
}

export interface EquityProgressView {
  investmentProgressPercent: number;
  ownershipProgressPercent: number;
  currentOwnershipPercent: number;
  targetOwnershipPercent: number;
  investmentReceived: number;
  committedInvestment: number;
  remainingInvestment: number;
  isComplete: boolean;
  commitments: CommitmentPosition[];
  currency: string;
}

export interface ShareValueView {
  companyValuation: number;
  fullyFundedValuation: number;
  ownershipPercent: number;
  agreedOwnershipPercent: number;
  investorValue: number;
  investorValueAtFullOwnership: number;
  investmentReceived: number;
  gain: number;
  effectiveDate: string | null;
  method: string | null;
  trend: Array<{
    effectiveDate: string;
    companyValuation: number;
    investorValue: number;
    method: string;
  }>;
  currency: string;
}

export interface InvestorDirectoryEntry {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  status: string;
  kycStatus: string;
  investorSince: string | null;
  committedInvestment: number;
  investmentReceived: number;
  ownershipPercent: number;
  agreedOwnershipPercent: number;
  shareValue: number;
  totalProfitPaid: number;
  currency: string;
}

export interface CapTable {
  investors: Array<{
    investorId: string;
    name: string;
    email: string;
    committedAmount: number;
    receivedTotal: number;
    agreedOwnershipPercent: number;
    ownershipPercent: number;
  }>;
  founderOwnershipPercent: number;
  founderOwnershipPercentFullyDiluted: number;
  allocatedAgreedPercent: number;
  allocatedEarnedPercent: number;
  unallocatedPercent: number;
}

/* ------------------------------ requests -------------------------------- */

const BASE = '/investor-finance';

/**
 * Admins inspect a specific investor by passing an id; investors omit it and
 * the server resolves their own. Building the query here keeps every call
 * site identical.
 */
function scoped(investorId?: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  if (investorId) params.set('investorId', investorId);

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getInvestorOverview(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<InvestorOverview>>(
    `${BASE}/overview${scoped(investorId)}`,
  );
  return data.data;
}

export async function getInvestmentTimeline(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<InvestmentTimeline>>(
    `${BASE}/timeline${scoped(investorId)}`,
  );
  return data.data;
}

export async function getValuationView(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<ValuationView>>(
    `${BASE}/valuation${scoped(investorId)}`,
  );
  return data.data;
}

export async function getRevenueView(range: { from?: string; to?: string } = {}) {
  const { data } = await api.get<ApiEnvelope<RevenueView>>(
    `${BASE}/revenue${scoped(undefined, cleanRange(range))}`,
  );
  return data.data;
}

export async function getExpenseView(range: { from?: string; to?: string } = {}) {
  const { data } = await api.get<ApiEnvelope<ExpenseView>>(
    `${BASE}/expenses${scoped(undefined, cleanRange(range))}`,
  );
  return data.data;
}

export async function getProfitView(
  range: { from?: string; to?: string } = {},
  investorId?: string,
) {
  const { data } = await api.get<ApiEnvelope<ProfitView>>(
    `${BASE}/profit${scoped(investorId, cleanRange(range))}`,
  );
  return data.data;
}

export async function getMonthlySeries(months = 12, investorId?: string) {
  const { data } = await api.get<ApiEnvelope<MonthlySeries>>(
    `${BASE}/monthly${scoped(investorId, { months: String(months) })}`,
  );
  return data.data;
}

export async function getRoiView(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<RoiView>>(
    `${BASE}/roi${scoped(investorId)}`,
  );
  return data.data;
}

export async function getEquityProgress(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<EquityProgressView>>(
    `${BASE}/equity-progress${scoped(investorId)}`,
  );
  return data.data;
}

export async function getShareValue(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<ShareValueView>>(
    `${BASE}/share-value${scoped(investorId)}`,
  );
  return data.data;
}

/* ----------------------------- fund usage ------------------------------- */

export interface FundUsageAttachment {
  url: string;
  originalName: string | null;
  mimeType: string | null;
  resourceType: 'image' | 'raw';
  /** False-y URL still listed, actions disabled: the file store is gone. */
  unavailable: boolean;
}

export interface FundUsageExpense {
  id: string;
  commitmentId: string;
  commitmentTitle: string | null;
  date: string;
  category: string;
  description: string;
  amount: number;
  attachments: FundUsageAttachment[];
  invoiceDoc: {
    id: string;
    number: string;
    kind: 'INVOICE' | 'BILL';
    status: string;
  } | null;
}

export interface FundUsageCommitment {
  commitmentId: string;
  title: string;
  status: string;
  startDate: string;
  committedAmount: number;
  receivedTotal: number;
  remainingToReceive: number;
  spentTotal: number;
  balanceAvailable: number;
  expenseCount: number;
  utilisationPercent: number;
  currency: string;
}

export interface FundUsageView {
  summary: {
    committed: number;
    received: number;
    remaining: number;
    spent: number;
    balance: number;
    utilisationPercent: number;
    expenseCount: number;
    currency: string;
  };
  commitments: FundUsageCommitment[];
  byCategory: Array<{
    category: string;
    total: number;
    count: number;
    sharePercent: number;
  }>;
  expenses: FundUsageExpense[];
}

export async function getFundUsage(investorId?: string) {
  const { data } = await api.get<ApiEnvelope<FundUsageView>>(
    `${BASE}/fund-usage${scoped(investorId)}`,
  );
  return data.data;
}

export async function listInvestors() {
  const { data } = await api.get<ApiEnvelope<InvestorDirectoryEntry[]>>(
    `${BASE}/investors`,
  );
  return data.data ?? [];
}

export async function getCapTable() {
  const { data } = await api.get<ApiEnvelope<CapTable>>(`${BASE}/cap-table`);
  return data.data;
}

/** Download the monthly report as CSV or Excel. */
export async function downloadMonthlyReport(
  format: 'csv' | 'excel',
  months = 12,
  investorId?: string,
) {
  const query = scoped(investorId, { format, months: String(months) });

  await downloadFromApi(
    `${BASE}/reports/monthly${query}`,
    `esscentra-investor-monthly-report.${format === 'excel' ? 'xls' : 'csv'}`,
  );
}

/** Drop empty range bounds so the query string stays clean. */
function cleanRange(range: { from?: string; to?: string }): Record<string, string> {
  const params: Record<string, string> = {};
  if (range.from) params.from = range.from;
  if (range.to) params.to = range.to;
  return params;
}
