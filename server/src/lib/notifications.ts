import { NotificationType } from '@prisma/client';
import { prisma } from './prisma';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification({ userId, type, title, message, entityType, entityId }: CreateNotificationParams) {
  return prisma.notification.create({
    data: { userId, type, title, message, entityType: entityType ?? null, entityId: entityId ?? null },
  });
}

/** Avoids re-notifying the same user about the same entity every sweep — only creates one if no unread notification for this (user, type, entity) combo already exists. */
export async function createNotificationIfNotDuplicate(params: CreateNotificationParams) {
  const existing = await prisma.notification.findFirst({
    where: { userId: params.userId, type: params.type, entityType: params.entityType ?? null, entityId: params.entityId ?? null, isRead: false },
  });
  if (existing) return existing;
  return createNotification(params);
}

export async function listNotifications(userId: string, opts: { unreadOnly?: boolean } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(opts.unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(id: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) return null;
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
