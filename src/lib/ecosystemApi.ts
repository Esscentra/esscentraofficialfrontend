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
  /** Set when the platform's own API is connected for live data. */
  live?: { provider: string; lastSyncAt: string | null; needsReconnect: boolean } | null;
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
  integration?: PlatformIntegration | null;
}

/** How a platform's live data is connected. The token itself never leaves the server. */
export interface PlatformIntegration {
  provider?: string;
  baseUrl?: string;
  accountEmail?: string;
  accountName?: string | null;
  connectedAt?: string;
  lastSyncAt?: string | null;
  lastError?: string | null;
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

/* ============================================================================
 *  LIVE PLATFORM DATA — EsscentraPrep, read through the hub's server
 * ============================================================================
 * Shapes follow EsscentraPrep's GET API reference. Every field is optional
 * here on purpose: a panel whose data is missing renders empty, not broken.
 */

export interface PrepTask {
  _id: string;
  date?: string;
  week?: number;
  theme?: string;
  slot?: string;
  title?: string;
  category?: string;
  completed?: boolean;
  confidence?: number | null;
  minutesSpent?: number;
  isRevision?: boolean;
}

export interface PrepCount {
  total?: number;
  done?: number;
}

export interface PrepLiveData {
  me?: {
    user?: {
      id?: string;
      name?: string;
      email?: string;
      avatar?: string;
      plan?: string;
      trialEndsAt?: string;
      planWeeks?: number;
      startDate?: string;
      studyDays?: string[];
      referralCount?: number;
      createdAt?: string;
    };
  };
  billing?: {
    tier?: string;
    status?: string;
    active?: boolean;
    daysLeft?: number | null;
    trialEndsAt?: string | null;
    plan?: string | null;
  };
  plans?: {
    plans?: Array<{ _id: string; name?: string; weeks?: number; startDate?: string; targetDate?: string; examGroup?: string }>;
  };
  stats?: {
    today?: string;
    overall?: PrepCount;
    byCategory?: Record<string, PrepCount>;
    byWeek?: Record<string, PrepCount>;
    last14?: Array<PrepCount & { date: string }>;
    streak?: number;
    focus?: { totalMinutes?: number; last7Minutes?: number };
    weekThemes?: Array<{ week: number; theme?: string; category?: string }>;
    planStart?: string;
    planEnd?: string;
  };
  readiness?: {
    overall?: number;
    status?: string;
    categories?: Array<{
      category: string;
      score?: number;
      status?: string;
      coverage?: number;
      mastery?: number;
      quizAccuracy?: number | null;
      done?: number;
      total?: number;
      lastPractised?: string | null;
    }>;
    weakest?: unknown[];
    weakTopics?: unknown[];
    pendingRevisions?: number;
    quizzesTaken?: number;
    interviewsTaken?: number;
  };
  pace?: {
    status?: string;
    total?: number;
    done?: number;
    remaining?: number;
    pace?: number;
    projectedFinish?: string | null;
    deadline?: string | null;
    daysToDeadline?: number | null;
    studyDaysLeft?: number | null;
    neededPerDay?: number | null;
    slipDays?: number | null;
    projectedCoverage?: number | null;
  };
  weeklyReport?: {
    report?: {
      weekStart?: string;
      weekEnd?: string;
      scheduledThisWeek?: number;
      doneThisWeek?: number;
      completionPct?: number;
      focusMinutes?: number;
      flashcardsDue?: number;
      followUps?: number;
      hasActivity?: boolean;
    };
  };
  today?: { tasks?: PrepTask[] };
  overdue?: { tasks?: PrepTask[]; today?: string };
  calendar?: { month?: string; days?: Record<string, PrepCount> };
  flashcardStats?: { total?: number; due?: number; byBox?: number[] };
  quizzes?: {
    quizzes?: Array<{
      _id: string;
      category?: string;
      mode?: string;
      title?: string;
      status?: string;
      score?: number | null;
      correct?: number;
      total?: number;
      createdAt?: string;
      submittedAt?: string | null;
    }>;
  };
  interviews?: {
    interviews?: Array<{
      _id: string;
      kind?: string;
      role?: string;
      level?: string;
      status?: string;
      overallScore?: number | null;
      totalQuestions?: number;
      answered?: number;
      createdAt?: string;
    }>;
  };
  testsOverview?: {
    examGroup?: string;
    allowance?: { tier?: string; limit?: number; used?: number; remaining?: number; resetsOn?: string };
    series?: { items?: unknown[]; next?: { title?: string; date?: string } | null; deadline?: string | null };
  };
  applications?: {
    applications?: Array<{
      _id: string;
      company?: string;
      role?: string;
      stage?: string;
      location?: string;
      appliedOn?: string;
      nextStep?: string;
      followUpOn?: string;
    }>;
    counts?: Record<string, number>;
    followUpsDue?: number;
    stages?: string[];
  };
  referral?: { code?: string; link?: string; count?: number; bonusDaysEarned?: number };
  buddies?: {
    buddies?: Array<{ id: string; name?: string; avatar?: string; isYou?: boolean; streak?: number; doneThisWeek?: number }>;
  };
}

export interface PrepLiveOverview {
  data: PrepLiveData;
  /** Panels that could not be loaded, by name, with the reason. */
  errors: Partial<Record<keyof PrepLiveData, string>>;
  fetchedAt: string;
  today: string;
}

/** Live data can wait on a platform waking from sleep, so these get longer. */
const LIVE_TIMEOUT = { timeout: 90_000 };

export async function connectPlatformLive(
  id: string,
  input: { baseUrl: string; email: string; password: string },
) {
  const { data } = await api.post<ApiEnvelope<PlatformDetail>>(
    `${BASE}/platforms/${id}/live/connect`,
    input,
    LIVE_TIMEOUT,
  );
  return data.data;
}

export async function disconnectPlatformLive(id: string) {
  await api.delete(`${BASE}/platforms/${id}/live`);
}

export async function getPlatformLiveOverview(id: string, plan?: string) {
  const { data } = await api.get<ApiEnvelope<PrepLiveOverview>>(
    `${BASE}/platforms/${id}/live/overview${plan ? `?plan=${encodeURIComponent(plan)}` : ''}`,
    LIVE_TIMEOUT,
  );
  return data.data;
}

/** One documented read, e.g. tasks for a week or another month's calendar. */
export async function getPlatformLiveResource<T>(
  id: string,
  resource: string,
  query: Record<string, string | undefined> = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const qs = params.toString();
  const { data } = await api.get<ApiEnvelope<T>>(
    `${BASE}/platforms/${id}/live/${resource}${qs ? `?${qs}` : ''}`,
    LIVE_TIMEOUT,
  );
  return data.data;
}

/** Fired after a platform is added, renamed or removed, so the sidebar refreshes. */
export const ECOSYSTEM_CHANGED_EVENT = 'esscentra:ecosystem-changed';

/* ============================================================================
 *  BUSINESS SUMMARY — all of a sub-product's users and revenue, no login
 * ============================================================================ */

export interface ShareSplit {
  revenue: number;
  platformLines: Array<{ name: string; percent: number; amount: number }>;
  toEsscentra: { percent: number; amount: number };
  parentLines: Array<{ name: string; percent: number; amount: number }>;
}

export interface BusinessUser {
  id: string;
  name: string;
  email: string;
  plan: 'free_trial' | 'standard' | 'premium' | 'expired' | 'legacy' | string;
  trialEndsAt?: string | null;
  emailVerified?: boolean;
  joinedAt?: string;
  referrals?: number;
  subscription: {
    tier: string;
    status: string;
    cycle: string;
    testMode: boolean;
    renewsAt: string | null;
    amount: number;
  } | null;
}

export interface PlatformBusiness {
  generatedAt: string;
  users: {
    total: number;
    verified: number;
    byPlan: Record<string, number>;
    paying: number;
    legacy: number;
    signupsThisMonth: number;
    signupsByMonth: Array<{ month: string; count: number }>;
  };
  trials: {
    active: number;
    endingIn3Days: number;
    lapsed: number;
    conversionPercent: number | null;
  };
  subscriptions: {
    byStatus: Record<string, number>;
    active: number;
    activeTestMode: number;
    activeByTier: Record<string, number>;
    activeByCycle: Record<string, number>;
    monthlyRecurringRevenue: number;
  };
  revenue: {
    currency: string;
    total: number;
    payments: number;
    thisMonth: number;
    byMonth: Array<{ month: string; amount: number; payments: number }>;
    byPlan: Array<{ tier: string; cycle: string; amount: number; payments: number }>;
  };
  /** Individual accounts. Only returned to super admins. */
  recentUsers?: BusinessUser[];
  recentUsersLimit?: number;
  shares: { lifetime: ShareSplit; thisMonth: ShareSplit };
}

export async function getPlatformBusiness(id: string) {
  const { data } = await api.get<ApiEnvelope<PlatformBusiness>>(
    `${BASE}/platforms/${id}/business`,
    LIVE_TIMEOUT,
  );
  return data.data;
}
