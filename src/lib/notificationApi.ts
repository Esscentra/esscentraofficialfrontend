import api from './api';
import type { ApiResponse } from '@/types';

/**
 * Notifications for the logged-in user.
 *
 * Endpoints (all require a Bearer session):
 *   GET    /notifications            → all notifications of the current user
 *   GET    /notifications/:id        → one notification
 *   PATCH  /notifications/:id/read   → mark one as read
 *   PATCH  /notifications/read-all   → mark all as read
 *   DELETE /notifications/:id        → delete one
 */

interface RawNotification {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  isRead?: boolean;
  read?: boolean;
  link?: string;
  url?: string;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  /** Free-form type (e.g. INFO / SUCCESS / WARNING / KYC / PAYMENT …). */
  type?: string;
  read: boolean;
  /** Optional deep-link (internal path or absolute URL). */
  link?: string;
  createdAt?: string;
}

function mapNotification(raw: RawNotification): AppNotification {
  return {
    id: raw.id ?? raw._id ?? '',
    title: raw.title ?? 'Notification',
    message: raw.message ?? raw.body ?? '',
    type: raw.type,
    read: raw.isRead ?? raw.read ?? false,
    link: raw.link ?? raw.url,
    createdAt: raw.createdAt,
  };
}

/** Unwrap the list whether the API returns an array or an object wrapper. */
function extractList(data: unknown): RawNotification[] {
  if (Array.isArray(data)) return data as RawNotification[];
  const obj = data as { notifications?: RawNotification[]; items?: RawNotification[] } | null;
  return obj?.notifications ?? obj?.items ?? [];
}

/** GET /notifications — all notifications for the current user, newest first. */
export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<ApiResponse<RawNotification[]>>('/notifications');
  return extractList(data.data).map(mapNotification);
}

/** GET /notifications/:id — a single notification. */
export async function getNotification(id: string): Promise<AppNotification> {
  const { data } = await api.get<ApiResponse<RawNotification>>(`/notifications/${id}`);
  return mapNotification(data.data);
}

/** PATCH /notifications/:id/read — mark one as read. */
export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`, {});
}

/** PATCH /notifications/read-all — mark every notification as read. */
export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all', {});
}

/** DELETE /notifications/:id — remove a notification. */
export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
