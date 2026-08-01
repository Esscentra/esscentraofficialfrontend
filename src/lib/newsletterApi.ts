import api from './api';
import type {
  ApiResponse,
  NewsletterCampaign,
  NewsletterPreview,
  NewsletterSettings,
  NewsletterStats,
  NewsletterSubscriber,
} from '@/types';

/**
 * Newsletter — wired to the live Esscentra backend.
 *
 * Subscribing and unsubscribing stay public (they run from the marketing site
 * and from links inside the emails). Everything else is ADMIN / SUPER_ADMIN:
 * the subscriber list is PII and the campaign history records exactly who was
 * mailed.
 *
 *   POST   /newsletter                    → public (subscribe)
 *   GET    /newsletter/unsubscribe/:token → public (link in every email)
 *   GET    /newsletter                    → admin (subscribers + stats)
 *   DELETE /newsletter/:id                → admin
 *   GET    /newsletter/campaigns          → admin
 *   GET    /newsletter/campaigns/preview  → admin
 *   POST   /newsletter/campaigns/send     → admin (send now)
 *   GET|PATCH /newsletter/settings        → admin (pause toggle)
 */

/* --------------------------------- mapping -------------------------------- */

interface RawSubscriber {
  _id?: string;
  id?: string;
  email: string;
  isSubscribed?: boolean;
  subscribedAt?: string;
  unsubscribedAt?: string;
  lastSentAt?: string;
}

interface RawPerson {
  firstName?: string;
  lastName?: string;
}

interface RawCampaign {
  _id?: string;
  id?: string;
  blogId?: string;
  blogTitle?: string;
  blogSlug?: string;
  subject: string;
  source: NewsletterCampaign['source'];
  status: NewsletterCampaign['status'];
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
  skippedCount?: number;
  reason?: string;
  triggeredBy?: RawPerson | string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

function mapSubscriber(s: RawSubscriber): NewsletterSubscriber {
  return {
    id: String(s._id ?? s.id ?? ''),
    email: s.email,
    isSubscribed: s.isSubscribed ?? true,
    subscribedAt: s.subscribedAt,
    unsubscribedAt: s.unsubscribedAt,
    lastSentAt: s.lastSentAt,
  };
}

function personName(ref?: RawPerson | string): string | undefined {
  if (!ref || typeof ref === 'string') return undefined;
  const name = [ref.firstName, ref.lastName].filter(Boolean).join(' ').trim();
  return name || undefined;
}

function mapCampaign(c: RawCampaign): NewsletterCampaign {
  return {
    id: String(c._id ?? c.id ?? ''),
    blogId: c.blogId ? String(c.blogId) : undefined,
    blogTitle: c.blogTitle,
    blogSlug: c.blogSlug,
    subject: c.subject,
    source: c.source ?? 'SCHEDULED',
    status: c.status ?? 'COMPLETED',
    recipientCount: c.recipientCount ?? 0,
    sentCount: c.sentCount ?? 0,
    failedCount: c.failedCount ?? 0,
    skippedCount: c.skippedCount ?? 0,
    reason: c.reason,
    triggeredByName: personName(c.triggeredBy),
    startedAt: c.startedAt,
    completedAt: c.completedAt,
    createdAt: c.createdAt,
  };
}

/* ------------------------------- subscribers ------------------------------ */

export interface SubscriberList {
  subscribers: NewsletterSubscriber[];
  stats: NewsletterStats;
}

/** Admin only. Returns every address, subscribed or not, plus headline counts. */
export async function listSubscribers(): Promise<SubscriberList> {
  const { data } = await api.get<
    ApiResponse<{ subscribers: RawSubscriber[]; stats: NewsletterStats }>
  >('/newsletter');

  return {
    subscribers: (data.data?.subscribers ?? []).map(mapSubscriber),
    stats: data.data?.stats ?? { active: 0, unsubscribed: 0, total: 0 },
  };
}

/** Admin only. */
export async function deleteSubscriber(id: string): Promise<void> {
  await api.delete(`/newsletter/${id}`);
}

/** Public — used by the marketing site. Kept here so the API surface is in one place. */
export async function subscribe(email: string): Promise<NewsletterSubscriber> {
  const { data } = await api.post<ApiResponse<RawSubscriber>>('/newsletter', {
    email: email.trim().toLowerCase(),
  });
  return mapSubscriber(data.data);
}

/* -------------------------------- campaigns ------------------------------- */

/** Admin only. Send history, newest first. */
export async function listCampaigns(limit = 50): Promise<NewsletterCampaign[]> {
  const { data } = await api.get<ApiResponse<RawCampaign[]>>('/newsletter/campaigns', {
    params: { limit },
  });
  return (data.data ?? []).map(mapCampaign);
}

/**
 * Admin only. Renders the post that would go out next — or a specific one —
 * without sending anything.
 */
export async function previewCampaign(blogId?: string): Promise<NewsletterPreview> {
  const { data } = await api.get<ApiResponse<NewsletterPreview>>(
    '/newsletter/campaigns/preview',
    { params: blogId ? { blogId } : undefined },
  );
  return data.data;
}

/** Admin only. Sends immediately rather than waiting for Tuesday. */
export async function sendCampaign(blogId?: string): Promise<NewsletterCampaign> {
  const { data } = await api.post<ApiResponse<RawCampaign>>(
    '/newsletter/campaigns/send',
    blogId ? { blogId } : {},
  );
  return mapCampaign(data.data);
}

/* -------------------------------- settings -------------------------------- */

export async function getSettings(): Promise<NewsletterSettings> {
  const { data } = await api.get<ApiResponse<NewsletterSettings>>('/newsletter/settings');
  return data.data;
}

/** Pause or resume the automatic Tuesday/Wednesday send. */
export async function updateSettings(input: {
  isPaused: boolean;
}): Promise<NewsletterSettings> {
  const { data } = await api.patch<ApiResponse<NewsletterSettings>>(
    '/newsletter/settings',
    input,
  );
  return data.data;
}
