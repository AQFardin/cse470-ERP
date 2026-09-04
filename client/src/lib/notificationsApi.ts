import { getCurrentUserId } from './api';

export interface AppNotification {
  id: string;
  type: 'AR_OVERDUE_REMINDER' | 'BUDGET_THRESHOLD_ALERT' | 'GENERAL';
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

async function apiCall(url: string, options?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const userId = getCurrentUserId();
  if (userId) headers['x-current-user-id'] = userId;
  const res = await fetch(`/api/notifications${url}`, { headers, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}

export async function fetchNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const res = await apiCall('/');
  return { notifications: res.data, unreadCount: res.unreadCount };
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiCall(`/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiCall('/read-all', { method: 'POST' });
}
