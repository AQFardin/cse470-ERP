"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLeaveRequest = createLeaveRequest;
exports.getAllLeaveRequests = getAllLeaveRequests;
exports.getEmployeeLeaveRequests = getEmployeeLeaveRequests;
exports.reviewLeaveRequest = reviewLeaveRequest;
const prisma_1 = require("../lib/prisma");
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
        const leaveRequest = await prisma_1.prisma.leaveRequest.create({
            data: {
                employeeId,
                type: type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
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
            },
        });
        res.status(201).json({ success: true, data: leaveRequest });
    }
    catch (error) {
        console.error('Create leave request error:', error);
        res.status(500).json({ success: false, error: 'Failed to create leave request' });
    }
}
// ─── GET ALL Leave Requests ─────────────────────────────
async function getAllLeaveRequests(req, res) {
    try {
        const { status, employeeId } = req.query;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (employeeId) {
            where.employeeId = employeeId;
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
        const existing = await prisma_1.prisma.leaveRequest.findUnique({ where: { id } });
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
        const leaveRequest = await prisma_1.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: status,
                reviewedById,
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
            },
        });
        res.json({ success: true, data: leaveRequest });
    }
    catch (error) {
        console.error('Review leave request error:', error);
        res.status(500).json({ success: false, error: 'Failed to review leave request' });
    }
}
//# sourceMappingURL=leaveController.js.map