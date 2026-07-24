"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLeaveRequest = createLeaveRequest;
exports.getAllLeaveRequests = getAllLeaveRequests;
exports.getEmployeeLeaveRequests = getEmployeeLeaveRequests;
exports.reviewLeaveRequest = reviewLeaveRequest;
const prisma_1 = require("../lib/prisma");
const auditLog_1 = require("../lib/auditLog");
const authorize_1 = require("../middleware/authorize");
// HR-routed leave types — these go straight to HR for approval
const HR_ROUTED_LEAVE_TYPES = ['MATERNITY', 'UNPAID', 'EXTENDED', 'LEGAL'];
/**
 * Determine the approver for a leave request based on:
 * 1. Leave type → if special type, find user with HR role
 * 2. Submitter's role → if Manager, find user with Admin role
 * 3. Otherwise → use reportingManagerId from employee record
 */
async function determineApprover(employeeId, leaveType) {
    // 1. HR-routed types → find an HR user's linked employee
    if (HR_ROUTED_LEAVE_TYPES.includes(leaveType)) {
        const hrUser = await prisma_1.prisma.user.findFirst({
            where: { roles: { some: { role: 'HR' } }, isActive: true },
            select: { employeeId: true },
        });
        return hrUser?.employeeId || null;
    }
    // 2. Check if the submitter is a Manager → route to Admin
    const submitterUser = await prisma_1.prisma.user.findFirst({
        where: { employeeId, isActive: true },
        include: { roles: { select: { role: true } } },
    });
    if (submitterUser) {
        const submitterRoles = submitterUser.roles.map((r) => r.role);
        if (submitterRoles.includes('MANAGER') || submitterRoles.includes('ADMIN')) {
            // Manager/Admin submits → route to Admin (find a different admin)
            const adminUser = await prisma_1.prisma.user.findFirst({
                where: {
                    roles: { some: { role: 'ADMIN' } },
                    isActive: true,
                    employeeId: { not: employeeId }, // not the same person
                },
                select: { employeeId: true },
            });
            // If no other admin, fall through to reporting manager
            if (adminUser?.employeeId)
                return adminUser.employeeId;
        }
    }
    // 3. Normal flow → reporting manager
    const employee = await prisma_1.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { reportingManagerId: true },
    });
    return employee?.reportingManagerId || null;
}
// ─── CREATE Leave Request ───────────────────────────────
async function createLeaveRequest(req, res) {
    try {
        const { employeeId, type, startDate, endDate, reason } = req.body;
        // Validate employee exists and is active
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!employee) {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        if (employee.status !== 'ACTIVE') {
            res.status(400).json({
                success: false,
                error: 'Only active employees can submit leave requests',
            });
            return;
        }
        // Determine approver dynamically
        const approverId = await determineApprover(employeeId, type);
        const leaveRequest = await prisma_1.prisma.leaveRequest.create({
            data: {
                employeeId,
                type: type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                approverId,
            },
            include: {
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeId: true,
                        department: true,
                    },
                },
                approver: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeId: true,
                    },
                },
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'CREATE',
            targetEntity: 'LeaveRequest',
            targetId: leaveRequest.id,
            after: leaveRequest,
        });
        res.status(201).json({ success: true, data: leaveRequest });
    }
    catch (error) {
        console.error('Create leave request error:', error);
        res.status(500).json({ success: false, error: 'Failed to create leave request' });
    }
}
// ─── GET ALL Leave Requests (role-scoped) ───────────────
async function getAllLeaveRequests(req, res) {
    try {
        const { status, employeeId: filterEmpId } = req.query;
        const userRoles = req.currentUser.roles;
        const currentEmployeeId = req.currentUser.employeeId;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (filterEmpId) {
            where.employeeId = filterEmpId;
        }
        // Role-based scoping
        const canViewAll = await (0, authorize_1.userHasPermission)(userRoles, 'leave', 'view_all');
        const canViewTeam = await (0, authorize_1.userHasPermission)(userRoles, 'leave', 'view_team');
        if (canViewAll) {
            // No additional scoping
        }
        else if (canViewTeam && currentEmployeeId) {
            // Manager: see own + direct reports' requests + requests where they are the approver
            const directReports = await prisma_1.prisma.employee.findMany({
                where: { reportingManagerId: currentEmployeeId },
                select: { id: true },
            });
            const reportIds = directReports.map((r) => r.id);
            where.OR = [
                { employeeId: currentEmployeeId },
                { employeeId: { in: reportIds } },
                { approverId: currentEmployeeId },
            ];
        }
        else if (currentEmployeeId) {
            // Employee: own requests only
            where.employeeId = currentEmployeeId;
        }
        const leaveRequests = await prisma_1.prisma.leaveRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeId: true,
                        department: true,
                        avatarUrl: true,
                    },
                },
                reviewedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                approver: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeId: true,
                    },
                },
            },
        });
        res.json({ success: true, data: leaveRequests, count: leaveRequests.length });
    }
    catch (error) {
        console.error('Get leave requests error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
    }
}
// ─── GET Leave Requests for Employee ────────────────────
async function getEmployeeLeaveRequests(req, res) {
    try {
        const { id } = req.params;
        const leaveRequests = await prisma_1.prisma.leaveRequest.findMany({
            where: { employeeId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                reviewedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                approver: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeId: true,
                    },
                },
            },
        });
        res.json({ success: true, data: leaveRequests, count: leaveRequests.length });
    }
    catch (error) {
        console.error('Get employee leaves error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
    }
}
// ─── REVIEW Leave Request (Approve/Deny) ────────────────
async function reviewLeaveRequest(req, res) {
    try {
        const { id } = req.params;
        const { status, reviewedById } = req.body;
        if (!status || !['APPROVED', 'DENIED'].includes(status)) {
            res.status(400).json({
                success: false,
                error: 'Status must be APPROVED or DENIED',
            });
            return;
        }
        // Verify the request exists and is pending
        const existing = await prisma_1.prisma.leaveRequest.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Leave request not found' });
            return;
        }
        if (existing.status !== 'PENDING') {
            res.status(400).json({
                success: false,
                error: `Cannot review a request that is already ${existing.status}`,
            });
            return;
        }
        // Verify the reviewer is the designated approver (or has leave.approve + is Admin/HR)
        const currentEmployeeId = req.currentUser.employeeId;
        const userRoles = req.currentUser.roles;
        const isDesignatedApprover = existing.approverId === currentEmployeeId;
        const isAdmin = userRoles.includes('ADMIN');
        const isHR = userRoles.includes('HR');
        // HR can only approve HR-routed types
        if (!isDesignatedApprover && !isAdmin) {
            if (isHR && !HR_ROUTED_LEAVE_TYPES.includes(existing.type)) {
                res.status(403).json({
                    success: false,
                    error: 'HR can only approve special leave types (maternity, unpaid, extended, legal)',
                });
                return;
            }
            if (!isHR) {
                res.status(403).json({
                    success: false,
                    error: 'Only the designated approver can review this request',
                });
                return;
            }
        }
        const before = { ...existing };
        const leaveRequest = await prisma_1.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: status,
                reviewedById: reviewedById || currentEmployeeId,
                reviewedAt: new Date(),
            },
            include: {
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeId: true,
                        department: true,
                    },
                },
                reviewedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                approver: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeId: true,
                    },
                },
            },
        });
        // If approved, deduct from leave balance
        if (status === 'APPROVED') {
            const start = new Date(existing.startDate);
            const end = new Date(existing.endDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const year = start.getFullYear();
            const balance = await prisma_1.prisma.leaveBalance.findFirst({
                where: {
                    employeeId: existing.employeeId,
                    leaveType: existing.type,
                    year,
                },
            });
            if (balance) {
                await prisma_1.prisma.leaveBalance.update({
                    where: { id: balance.id },
                    data: { balance: Math.max(0, balance.balance - days) },
                });
            }
        }
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'LeaveRequest',
            targetId: id,
            before,
            after: leaveRequest,
        });
        res.json({ success: true, data: leaveRequest });
    }
    catch (error) {
        console.error('Review leave request error:', error);
        res.status(500).json({ success: false, error: 'Failed to review leave request' });
    }
}
//# sourceMappingURL=leaveController.js.map