"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.createNotification = createNotification;
exports.markNotificationRead = markNotificationRead;
exports.getNotificationPreferences = getNotificationPreferences;
exports.updateNotificationPreferences = updateNotificationPreferences;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function getNotifications(req, res) {
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch notifications" });
    }
}
async function createNotification(req, res) {
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to create notification" });
    }
}
async function markNotificationRead(req, res) {
    try {
        const id = String(req.params.id);
        const notification = await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        return res.json(notification);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to mark notification as read" });
    }
}
async function getNotificationPreferences(req, res) {
    try {
        const employeeId = String(req.query.employeeId || "");
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch preferences" });
    }
}
async function updateNotificationPreferences(req, res) {
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to update preferences" });
    }
}
//# sourceMappingURL=notification.controller.js.map