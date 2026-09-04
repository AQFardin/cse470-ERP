import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as nodemailer from "nodemailer";
import webpush from "web-push";

const prisma = new PrismaClient();
if (process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendEmail(
  to: string,
  title: string,
  message: string
) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: title,
    text: message,
  });
}

export async function getNotifications(req: Request, res: Response) {
  try {
    const employeeId = String(req.query.employeeId || "");

    if (!employeeId) {
      return res.status(400).json({
        error: "employeeId is required",
      });
    }

    const notifications = await prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch notifications",
    });
  }
}

export async function createNotification(req: Request, res: Response) {
  try {
   const { employeeId, title, message, type, toEmail } = req.body;

    if (!employeeId || !title || !message) {
      return res.status(400).json({
        error: "employeeId, title and message are required",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
      });
    }

    // Always create the in-app notification
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        title,
        message,
        type: type || "INFO",
      },
    });

    // Check the employee's notification preferences
    const preferences =
      await prisma.notificationPreference.findUnique({
        where: { employeeId },
      });

    let emailSent = false;

    // Send to an explicitly entered email address when provided.
// Otherwise use the employee's saved email preference.
const emailRecipient = toEmail?.trim() || employee.email;

if (emailRecipient) {
  try {
    await sendEmail(emailRecipient, title, message);
    emailSent = true;

    console.log(
      `📧 Email sent to ${emailRecipient}`
    );
  } catch (emailError) {
    console.error(
      "Email sending failed:",
      emailError
    );
  }
}

    return res.status(201).json({
      ...notification,
      emailSent,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to create notification",
    });
  }
}

export async function markNotificationRead(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json(notification);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to mark notification as read",
    });
  }
}

export async function getNotificationPreferences(
  req: Request,
  res: Response
) {
  try {
    const employeeId = String(req.params.employeeId || "");

    if (!employeeId) {
      return res.status(400).json({
        error: "employeeId is required",
      });
    }

    const preferences =
      await prisma.notificationPreference.findUnique({
        where: { employeeId },
      });

    if (!preferences) {
      const created =
        await prisma.notificationPreference.create({
          data: { employeeId },
        });

      return res.json(created);
    }

    return res.json(preferences);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to fetch preferences",
    });
  }
}

export async function updateNotificationPreferences(
  req: Request,
  res: Response
) {
  try {
    const {
      employeeId,
      pushEnabled,
      emailEnabled,
      smsEnabled,
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        error: "employeeId is required",
      });
    }

    const preferences =
      await prisma.notificationPreference.upsert({
        where: { employeeId },

        update: {
          ...(pushEnabled !== undefined && {
            pushEnabled,
          }),
          ...(emailEnabled !== undefined && {
            emailEnabled,
          }),
          ...(smsEnabled !== undefined && {
            smsEnabled,
          }),
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

    return res.status(500).json({
      error: "Failed to update preferences",
    });
  }
}
export async function savePushSubscription(
  req: Request,
  res: Response
) {
  try {
    const { employeeId, subscription } = req.body;

    if (!employeeId || !subscription?.endpoint) {
      return res.status(400).json({
        error: "employeeId and subscription are required",
      });
    }

    const saved = await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        p256dh: subscription.keys?.p256dh || "",
        auth: subscription.keys?.auth || "",
        employeeId,
      },
      create: {
        employeeId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || "",
        auth: subscription.keys?.auth || "",
      },
    });

    return res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to save push subscription",
    });
  }
}
export async function getPushPublicKey(
  _req: Request,
  res: Response
) {
  return res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
}