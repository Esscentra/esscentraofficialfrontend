import api from './api';
import type { ApiResponse } from '@/types';

/* ------------------------- Dashboard stats (KPIs) ------------------------- */
/**
 * Aggregated, PII-free business metrics from GET /dashboard/stats.
 * This is the only data surface exposed to read-only INVESTOR accounts,
 * and it also powers KPI tiles for staff.
 */

export interface StageBucket {
  stage: 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  count: number;
  amount: number;
}

export interface ProjectStatusBucket {
  status: 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  count: number;
}

export interface MonthBucket {
  year: number;
  month: number; // 1-12
  wonAmount: number;
  wonCount: number;
  newLeads: number;
}

export interface DashboardTotals {
  pipelineValue: number;
  pipelineCount: number;
  wonRevenue: number;
  wonCount: number;
  lostCount: number;
  /** 0..1, or null when no deal has closed yet. */
  winRate: number | null;
  activeAccounts: number;
  totalLeads: number;
  leadsThisMonth: number;
  leadsPrevMonth: number;
  activeProjects: number;
  completedProjects: number;
}

export interface DashboardStats {
  totals: DashboardTotals;
  opportunitiesByStage: StageBucket[];
  projectsByStatus: ProjectStatusBucket[];
  monthly: MonthBucket[];
}

/** GET /dashboard/stats — aggregated KPIs (any authenticated role). */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
  return data.data;
}
