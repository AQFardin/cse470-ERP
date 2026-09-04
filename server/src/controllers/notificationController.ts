import { Request, Response } from 'express';
import * as notifications from '../lib/notifications';

export async function getNotifications(req: Request, res: Response) {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const [items, unreadCount] = await Promise.all([
      notifications.listNotifications(req.currentUser!.id, { unreadOnly }),
      notifications.countUnread(req.currentUser!.id),
    ]);
    res.json({ success: true, data: items, unreadCount });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const updated = await notifications.markRead(req.params.id as string, req.currentUser!.id);
    if (!updated) { res.status(404).json({ success: false, error: 'Notification not found' }); return; }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to mark notification read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification read' });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    await notifications.markAllRead(req.currentUser!.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications read' });
  }
}
