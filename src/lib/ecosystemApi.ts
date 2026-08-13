import api from './api';
import type { ApiResponse as ApiEnvelope } from '@/types';

/**
 * ============================================================================
 *  ECOSYSTEM API — child platforms under the Esscentra umbrella
 * ============================================================================
 *
 * The money model is a two-tier waterfall (mirrors the backend exactly):
 *
 *   Tier 1: each platform's own share lines (founder bonuses) are paid first
 *           from that platform's revenue; the remainder flows to the parent.
 *   Tier 2: parent pool = Esscentra's own client revenue + all remainders,
 *           split by the parent agreement (10/50/40 by default). Investor
 *           capital is raised, not earned, so it never enters the pool.
 *
 * Reads: super admin + investor (read-only). Writes: super admin only —
 * enforced server-side; the UI merely hides the buttons.
 * ============================================================================
 */

const BASE = '/ecosystem';

export const PLATFORM_STATUSES = ['ACTIVE', 'BETA', 'PAUSED', 'SUNSET'] as const;
export type PlatformStatus = (typeof PLATFORM_STATUSES)[number];

export interface ShareLine {
  name: string;
  userId?: string | null;
  percent: number;
  notes?: string | null;
}

export interface ShareLineAmount extends ShareLine {
  amount: number;
}

export interface EcosystemPlatformRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  website: string | null;
  status: PlatformStatus;
  launchedAt: string | null;
  userCount: number;
  revenueTotal: number;
  thisMonth: number;
  /** Tier-1 totals. founderPercent + parentPercent === 100. */
  founderPercent: number;
  parentPercent: number;
  /** What this platform sends up to Esscentra. */
  parentAmount: number;
  shareLines: ShareLineAmount[];
}

export interface EcosystemOverview {
  platforms: EcosystemPlatformRow[];
  totals: {
    platformCount: number;
    activePlatforms: number;
    totalUsers: number;
    /** Client payments + child platform revenue. Excludes investor capital. */
    ecosystemGross: number;
    /** Revenue the parent earned on its own books — clients only. */
    parentDirectRevenue: number;
    /** Revenue-dashboard receipts + paid client invoices (deduplicated). */
    clientPayments: number;
    /**
     * Capital raised from investors. Reported for context only — it is NOT
     * revenue and is excluded from `ecosystemGross`, `parentDirectRevenue`
     * and the distributable `parentPool`.
     */
    investorCapital: number;
    childGross: number;
    childToParent: number;
    founderRetained: number;
    parentPool: number;
  };
  parentShares: ShareLine[];
  parentDistribution: Array<{
    name: string;
    userId?: string | null;
    percent: number;
    amount: number;
  }>;
}

/* -------------------------------- earnings -------------------------------- */

export interface EarningLine {
  name: string;
  percent: number;
  amount: number;
}

export interface PlatformEarning {
  platformId: string;
  name: string;
  status: PlatformStatus;
  revenueTotal: number;
  lines: EarningLine[];
  total: number;
}

export interface InvestorPoolEarning {
  /** The whole investors pool for this period. */
  poolAmount: number;
  poolPercent: number;
  /** This investor's earned ownership, and the cap table total it sits in. */
  ownershipPercent: number;
  totalAgreedPercent: number;
  /** ownership ÷ total agreed, as a percentage of the pool. */
  entitlementRatio: number;
  amount: number;
}

/** One person's cut of the two-tier waterfall. Own statement only. */
export interface MyEarnings {
  userId: string;
  parent: {
    pool: number;
    directLines: EarningLine[];
    directTotal: number;
    investorPool: InvestorPoolEarning | null;
    total: number;
  };
  platforms: PlatformEarning[];
  platformTotal: number;
  totalEarned: number;
  /** Cash already distributed against this entitlement. Investors only. */
  distributions: {
    totalPaid: number;
    totalApproved: number;
    paidCount: number;
    pendingCount: number;
    lastPaidAt: string | null;
  } | null;
  currency: string;
}

export interface PlatformRevenueEntry {
  _id: string;
  period: string;
  amount: number;
  source?: string | null;
  description?: string | null;
  recordedBy?: { firstName?: string; lastName?: string } | string | null;
  createdAt?: string;
}

export interface PlatformDetail {
  _id: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  website?: string | null;
  status: PlatformStatus;
  launchedAt?: string | null;
  userCount: number;
  shares: ShareLine[];
  notes?: string | null;
  revenueTotal: number;
  thisMonth: number;
  monthly: Array<{ period: string; amount: number }>;
  breakdown: {
    lines: ShareLineAmount[];
    founderPercent: number;
    parentPercent: number;
    parentAmount: number;
  };
  entries: PlatformRevenueEntry[];
}

export interface PlatformInput {
  name?: string;
  description?: string;
  category?: string;
  website?: string;
  status?: PlatformStatus;
  launchedAt?: string | null;
  userCount?: number;
  shares?: ShareLine[];
  notes?: string;
}

export interface RevenueInput {
  period?: string;
  amount?: number;
  source?: string;
  description?: string;
}

/* --------------------------------- reads --------------------------------- */

export async function getEcosystemOverview() {
  const { data } = await api.get<ApiEnvelope<EcosystemOverview>>(
    `${BASE}/overview`,
  );
  return data.data;
}

/**
 * The signed-in person's own earnings. There is deliberately no "by id"
 * variant — the server reads the id from the session, so one founder's
 * statement can never be fetched by another.
 */
export async function getMyEarnings() {
  const { data } = await api.get<ApiEnvelope<MyEarnings>>(`${BASE}/earnings/me`);
  return data.data;
}

export async function getEcosystemPlatform(id: string) {
  const { data } = await api.get<ApiEnvelope<PlatformDetail>>(
    `${BASE}/platforms/${id}`,
  );
  return data.data;
}

/* ---------------------------- writes (super admin) ------------------------ */

export async function createPlatform(input: PlatformInput) {
  const { data } = await api.post<ApiEnvelope<PlatformDetail>>(
    `${BASE}/platforms`,
    input,
  );
  return data.data;
}

export async function updatePlatform(id: string, input: PlatformInput) {
  const { data } = await api.patch<ApiEnvelope<PlatformDetail>>(
    `${BASE}/platforms/${id}`,
    input,
  );
  return data.data;
}

/** Deletes the platform AND its revenue ledger. */
export async function deletePlatform(id: string) {
  await api.delete(`${BASE}/platforms/${id}`);
}

export async function addPlatformRevenue(platformId: string, input: RevenueInput) {
  const { data } = await api.post<ApiEnvelope<PlatformRevenueEntry>>(
    `${BASE}/platforms/${platformId}/revenue`,
    input,
  );
  return data.data;
}

export async function updatePlatformRevenue(entryId: string, input: RevenueInput) {
  const { data } = await api.patch<ApiEnvelope<PlatformRevenueEntry>>(
    `${BASE}/revenue/${entryId}`,
    input,
  );
  return data.data;
}

export async function deletePlatformRevenue(entryId: string) {
  await api.delete(`${BASE}/revenue/${entryId}`);
}

/** Tier-2: the parent split. Must total exactly 100%. */
export async function updateParentShares(parentShares: ShareLine[]) {
  const { data } = await api.patch<ApiEnvelope<unknown>>(`${BASE}/settings`, {
    parentShares,
  });
  return data.data;
}
