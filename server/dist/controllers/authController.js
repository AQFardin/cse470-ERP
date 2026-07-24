"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = getAllUsers;
exports.getCurrentUser = getCurrentUser;
exports.getAuditLogs = getAuditLogs;
const prisma_1 = require("../lib/prisma");
// ─── GET ALL Users (for impersonation dropdown) ─────────
async function getAllUsers(_req, res) {
    try {
        const users = await prisma_1.prisma.user.findMany({
            where: { isActive: true },
            include: {
                roles: { select: { role: true } },
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: true,
                        position: true,
                        status: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        res.json({
            success: true,
            data: users.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                employeeId: u.employeeId,
                roles: u.roles.map((r) => r.role),
                employee: u.employee,
            })),
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
}
// ─── GET Current User Profile ───────────────────────────
async function getCurrentUser(req, res) {
    try {
        if (!req.currentUser) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.currentUser.id },
            include: {
                roles: { select: { role: true } },
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: true,
                        position: true,
                        status: true,
                        avatarUrl: true,
                        reportingManagerId: true,
                    },
                },
            },
        });
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        // Collect all permissions for this user's roles
        const roleValues = user.roles.map((r) => r.role);
        const rolePermissions = await prisma_1.prisma.rolePermission.findMany({
            where: { role: { in: roleValues } },
            include: { permission: true },
        });
        // Deduplicate permissions
        const permSet = new Set();
        rolePermissions.forEach((rp) => {
            permSet.add(`${rp.permission.module}.${rp.permission.action}`);
        });
        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                employeeId: user.employeeId,
                roles: roleValues,
                permissions: Array.from(permSet),
                employee: user.employee,
            },
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch current user' });
    }
}
// ─── GET Audit Logs (Admin only) ────────────────────────
async function getAuditLogs(req, res) {
    try {
        const { targetEntity, actorId, limit } = req.query;
        const where = {};
        if (targetEntity)
            where.targetEntity = targetEntity;
        if (actorId)
            where.actorId = actorId;
        const logs = await prisma_1.prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: Number(limit) || 100,
            include: {
                actor: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        res.json({ success: true, data: logs, count: logs.length });
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
    }
}
//# sourceMappingURL=authController.js.map