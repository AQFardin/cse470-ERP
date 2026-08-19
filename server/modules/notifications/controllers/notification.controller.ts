import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getNotifications(req: Request, res: Response) {
  try {
    const employeeId = String(req.query.employeeId || "");

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const notifications = await prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

export async function createNotification(req: Request, res: Response) {
  try {
    const { employeeId, title, message, type } = req.body;

    if (!employeeId || !title || !message) {
      return res.status(400).json({
        error: "employeeId, title and message are required",
      });
    }

    const notification = await prisma.notification.create({
      data: {
        employeeId,
        title,
        message,
        type: type || "INFO",
      },
    });

    return res.status(201).json(notification);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create notification" });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json(notification);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
}

export async function getNotificationPreferences(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.employeeId || "");

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const preferences = await prisma.notificationPreference.findUnique({
      where: { employeeId },
    });

    if (!preferences) {
      const created = await prisma.notificationPreference.create({
        data: { employeeId },
      });

      return res.json(created);
    }

    return res.json(preferences);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch preferences" });
  }
}

export async function updateNotificationPreferences(
  req: Request,
  res: Response
) {
  try {
    const { employeeId, pushEnabled, emailEnabled, smsEnabled } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { employeeId },
      update: {
        ...(pushEnabled !== undefined && { pushEnabled }),
        ...(emailEnabled !== undefined && { emailEnabled }),
        ...(smsEnabled !== undefined && { smsEnabled }),
      },
      create: {
        employeeId,
        pushEnabled: pushEnabled ?? true,
        emailEnabled: emailEnabled ?? true,
        smsEnabled: smsEnabled ?? false,
      },
    });

    return res.json(preferences);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update preferences" });
  }
}
