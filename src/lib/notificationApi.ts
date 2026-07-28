import api from './api';
import type { ApiResponse } from '@/types';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DUE'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'LEAD_ASSIGNED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'INVESTMENT_DUE'
  | 'SYSTEM';

interface RawNotification {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  type?: NotificationType;
  isRead?: boolean;
  readAt?: string;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt?: string;
}

function mapNotification(raw: RawNotification): AppNotification {
  return {
    id: raw.id ?? raw._id ?? '',
    title: raw.title,
    message: raw.message,
    type: raw.type ?? 'SYSTEM',
    isRead: raw.isRead ?? false,
    createdAt: raw.createdAt,
  };
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<ApiResponse<RawNotification[]>>('/notifications');
  return (data.data ?? []).map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
