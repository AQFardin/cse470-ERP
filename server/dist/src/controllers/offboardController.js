"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOffboardRequest = createOffboardRequest;
exports.getAllOffboardRequests = getAllOffboardRequests;
exports.reviewOffboardRequest = reviewOffboardRequest;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const auditLog_1 = require("../lib/auditLog");
// ─── CREATE Offboard Request ────────────────────────────
async function createOffboardRequest(req, res) {
    try {
        const { employeeId, reason, effectiveDate } = req.body;
        // Validate employee exists and is active
        const employee = await prisma_1.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        if (employee.status === 'INACTIVE') {
            res.status(400).json({ success: false, error: 'Employee is already inactive' });
            return;
        }
        // Check no existing pending/approved request
        const existing = await prisma_1.prisma.offboardRequest.findFirst({
            where: { employeeId, status: { in: ['PENDING', 'APPROVED'] } },
        });
        if (existing) {
            res.status(409).json({ success: false, error: 'An offboard request already exists for this employee' });
            return;
        }
        const request = await prisma_1.prisma.offboardRequest.create({
            data: {
                employeeId,
                requestedById: req.currentUser.id,
                reason,
                effectiveDate: new Date(effectiveDate),
            },
            include: {
                employee: {
                    select: { id: true, employeeId: true, firstName: true, lastName: true, department: true },
                },
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'CREATE',
            targetEntity: 'OffboardRequest',
            targetId: request.id,
            after: request,
        });
        res.status(201).json({ success: true, data: request });
    }
    catch (error) {
        console.error('Create offboard request error:', error);
        res.status(500).json({ success: false, error: 'Failed to create offboard request' });
    }
}
// ─── GET ALL Offboard Requests ──────────────────────────
async function getAllOffboardRequests(req, res) {
    try {
        const { status } = req.query;
        const where = {};
        if (status && status !== 'ALL')
            where.status = status;
        const requests = await prisma_1.prisma.offboardRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: true,
                        position: true,
                        status: true,
                    },
                },
            },
        });
        // Fetch requester and reviewer names from User table
        const userIds = new Set();
        requests.forEach((r) => {
            userIds.add(r.requestedById);
            if (r.reviewedById)
                userIds.add(r.reviewedById);
        });
        const users = await prisma_1.prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, name: true },
        });
        const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
        const data = requests.map((r) => ({
            ...r,
            requestedByName: userMap[r.requestedById] || 'Unknown',
            reviewedByName: r.reviewedById ? userMap[r.reviewedById] || 'Unknown' : null,
        }));
        res.json({ success: true, data, count: data.length });
    }
    catch (error) {
        console.error('Get offboard requests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch offboard requests' });
    }
}
// ─── REVIEW Offboard Request (HR approves/rejects) ──────
async function reviewOffboardRequest(req, res) {
    try {
        const id = req.params.id;
        const { status } = req.body; // 'APPROVED' or 'REJECTED'
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            res.status(400).json({ success: false, error: 'Status must be APPROVED or REJECTED' });
            return;
        }
        const existing = await prisma_1.prisma.offboardRequest.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Offboard request not found' });
            return;
        }
        if (existing.status !== 'PENDING') {
            res.status(400).json({ success: false, error: `Cannot review a request that is ${existing.status}` });
            return;
        }
        const before = { ...existing };
        // Update offboard request
        const updated = await prisma_1.prisma.offboardRequest.update({
            where: { id },
            data: {
                status: status,
                reviewedById: req.currentUser.id,
                reviewedAt: new Date(),
            },
            include: {
                employee: {
                    select: { id: true, employeeId: true, firstName: true, lastName: true, department: true },
                },
            },
        });
        // If approved → deactivate the employee
        if (status === 'APPROVED') {
            const empBefore = await prisma_1.prisma.employee.findUnique({ where: { id: existing.employeeId } });
            await prisma_1.prisma.employee.update({
                where: { id: existing.employeeId },
                data: { status: client_1.EmployeeStatus.INACTIVE },
            });
            // Mark request as completed
            await prisma_1.prisma.offboardRequest.update({
                where: { id },
                data: { status: 'COMPLETED' },
            });
            await (0, auditLog_1.logAudit)({
                actorId: req.currentUser.id,
                action: 'UPDATE',
                targetEntity: 'Employee',
                targetId: existing.employeeId,
                before: empBefore,
                after: { ...empBefore, status: 'INACTIVE' },
            });
        }
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'OffboardRequest',
            targetId: id,
            before,
            after: updated,
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('Review offboard request error:', error);
        res.status(500).json({ success: false, error: 'Failed to review offboard request' });
    }
}
//# sourceMappingURL=offboardController.js.map