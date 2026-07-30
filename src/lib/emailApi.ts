import api from './api';
import type { ApiResponse } from '@/types';

/**
 * Transactional email delivery log (admin only).
 *
 * Every send attempt is recorded — including the ones the server chose NOT to
 * make — so "was the mail sent?" always has an answer, and a negative answer
 * always carries a reason.
 *
 * Endpoints:
 *   GET /emails/logs?userId=&relatedId=&template=&status=&limit=
 *   GET /emails/logs/:id   → same record plus the HTML snapshot for preview
 */

export type EmailTemplate =
  | 'WELCOME'
  | 'RESET_PASSWORD'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'INVESTMENT_DUE'
  | 'OTHER';

/** SENT = provider accepted · FAILED = tried and rejected · SKIPPED = never attempted. */
export type EmailStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export type EmailRelatedType = 'COMMITMENT' | 'KYC' | 'USER';

interface RawEmailLog {
  _id?: string;
  id?: string;
  userId?: string;
  to: string;
  subject: string;
  html?: string;
  template?: EmailTemplate;
  status: EmailStatus;
  reason?: string;
  providerId?: string;
  relatedType?: EmailRelatedType;
  relatedId?: string;
  sentAt?: string;
  createdAt?: string;
}

export interface EmailLog {
  id: string;
  userId?: string;
  to: string;
  subject: string;
  /** Only populated by `getEmailLog` — the list endpoint omits it. */
  html?: string;
  template: EmailTemplate;
  status: EmailStatus;
  /** Why it failed or was skipped. Undefined when it was sent. */
  reason?: string;
  providerId?: string;
  relatedType?: EmailRelatedType;
  relatedId?: string;
  sentAt?: string;
  createdAt?: string;
}

/** Human labels for the template codes. */
export const EMAIL_TEMPLATE_LABEL: Record<EmailTemplate, string> = {
  WELCOME: 'Welcome / verify email',
  RESET_PASSWORD: 'Password reset',
  KYC_SUBMITTED: 'KYC submitted',
  KYC_APPROVED: 'KYC approved',
  KYC_REJECTED: 'KYC rejected',
  INVESTMENT_DUE: 'Investment payment due',
  OTHER: 'Notification',
};

function mapEmailLog(raw: RawEmailLog): EmailLog {
  return {
    id: raw.id ?? raw._id ?? '',
    userId: raw.userId,
    to: raw.to,
    subject: raw.subject,
    html: raw.html,
    template: raw.template ?? 'OTHER',
    status: raw.status,
    reason: raw.reason,
    providerId: raw.providerId,
    relatedType: raw.relatedType,
    relatedId: raw.relatedId,
    sentAt: raw.sentAt,
    createdAt: raw.createdAt,
  };
}

export interface EmailLogFilters {
  userId?: string;
  relatedId?: string;
  template?: EmailTemplate;
  status?: EmailStatus;
  limit?: number;
}

/** GET /emails/logs  (admin) — delivery history, newest first. */
export async function listEmailLogs(filters: EmailLogFilters = {}): Promise<EmailLog[]> {
  const { data } = await api.get<ApiResponse<RawEmailLog[]>>('/emails/logs', {
    params: filters,
  });
  return (data.data ?? []).map(mapEmailLog);
}

/** GET /emails/logs/:id  (admin) — one record with its rendered HTML. */
export async function getEmailLog(id: string): Promise<EmailLog> {
  const { data } = await api.get<ApiResponse<RawEmailLog>>(`/emails/logs/${id}`);
  return mapEmailLog(data.data);
}
