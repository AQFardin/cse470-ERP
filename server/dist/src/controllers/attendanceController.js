"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clockIn = clockIn;
exports.clockOut = clockOut;
exports.getEmployeeAttendance = getEmployeeAttendance;
exports.getTodayStatus = getTodayStatus;
exports.getTeamCalendar = getTeamCalendar;
const prisma_1 = require("../lib/prisma");
const auditLog_1 = require("../lib/auditLog");
// ─── CLOCK IN ───────────────────────────────────────────
async function clockIn(req, res) {
    try {
        const employeeId = req.currentUser.employeeId;
        if (!employeeId) {
            res.status(400).json({ success: false, error: 'No employee linked to this user' });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Check if already clocked in today
        const existing = await prisma_1.prisma.attendanceLog.findUnique({
            where: { employeeId_date: { employeeId, date: today } },
        });
        if (existing) {
            if (existing.clockIn) {
                res.status(400).json({ success: false, error: 'Already clocked in today' });
                return;
            }
        }
        const log = await prisma_1.prisma.attendanceLog.upsert({
            where: { employeeId_date: { employeeId, date: today } },
            update: { clockIn: new Date(), status: 'PRESENT' },
            create: {
                employeeId,
                date: today,
                clockIn: new Date(),
                status: 'PRESENT',
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'CREATE',
            targetEntity: 'AttendanceLog',
            targetId: log.id,
            after: log,
        });
        res.json({ success: true, data: log });
    }
    catch (error) {
        console.error('Clock in error:', error);
        res.status(500).json({ success: false, error: 'Failed to clock in' });
    }
}
// ─── CLOCK OUT ──────────────────────────────────────────
async function clockOut(req, res) {
    try {
        const employeeId = req.currentUser.employeeId;
        if (!employeeId) {
            res.status(400).json({ success: false, error: 'No employee linked to this user' });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await prisma_1.prisma.attendanceLog.findUnique({
            where: { employeeId_date: { employeeId, date: today } },
        });
        if (!existing || !existing.clockIn) {
            res.status(400).json({ success: false, error: 'You must clock in before clocking out' });
            return;
        }
        if (existing.clockOut) {
            res.status(400).json({ success: false, error: 'Already clocked out today' });
            return;
        }
        const clockOut = new Date();
        const hoursWorked = (clockOut.getTime() - existing.clockIn.getTime()) / (1000 * 60 * 60);
        const log = await prisma_1.prisma.attendanceLog.update({
            where: { id: existing.id },
            data: {
                clockOut,
                hoursWorked: Math.round(hoursWorked * 100) / 100,
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'AttendanceLog',
            targetId: log.id,
            before: existing,
            after: log,
        });
        res.json({ success: true, data: log });
    }
    catch (error) {
        console.error('Clock out error:', error);
        res.status(500).json({ success: false, error: 'Failed to clock out' });
    }
}
// ─── GET Attendance for Employee ────────────────────────
async function getEmployeeAttendance(req, res) {
    try {
        const employeeId = req.params.employeeId;
        const { month, year } = req.query;
        const targetYear = year ? Number(year) : new Date().getFullYear();
        const targetMonth = month ? Number(month) - 1 : new Date().getMonth();
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        const logs = await prisma_1.prisma.attendanceLog.findMany({
            where: {
                employeeId,
                date: { gte: startDate, lte: endDate },
            },
            orderBy: { date: 'desc' },
        });
        res.json({ success: true, data: logs, count: logs.length });
    }
    catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
    }
}
// ─── GET Today's Status for Current User ────────────────
async function getTodayStatus(req, res) {
    try {
        const employeeId = req.currentUser.employeeId;
        if (!employeeId) {
            res.json({ success: true, data: null });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const log = await prisma_1.prisma.attendanceLog.findUnique({
            where: { employeeId_date: { employeeId, date: today } },
        });
        res.json({ success: true, data: log });
    }
    catch (error) {
        console.error('Get today status error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch today status' });
    }
}
// ─── GET Team Calendar (Manager) ────────────────────────
async function getTeamCalendar(req, res) {
    try {
        const employeeId = req.currentUser.employeeId;
        if (!employeeId) {
            res.status(400).json({ success: false, error: 'No employee linked' });
            return;
        }
        const { month, year } = req.query;
        const targetYear = year ? Number(year) : new Date().getFullYear();
        const targetMonth = month ? Number(month) - 1 : new Date().getMonth();
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        // Get direct reports
        const directReports = await prisma_1.prisma.employee.findMany({
            where: { reportingManagerId: employeeId },
            select: { id: true, firstName: true, lastName: true, employeeId: true },
        });
        const reportIds = directReports.map((r) => r.id);
        // Get attendance + leave for all direct reports in the month
        const [attendance, leaves] = await Promise.all([
            prisma_1.prisma.attendanceLog.findMany({
                where: {
                    employeeId: { in: reportIds },
                    date: { gte: startDate, lte: endDate },
                },
                include: {
                    employee: { select: { firstName: true, lastName: true, employeeId: true } },
                },
                orderBy: { date: 'asc' },
            }),
            prisma_1.prisma.leaveRequest.findMany({
                where: {
                    employeeId: { in: reportIds },
                    status: 'APPROVED',
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                },
                include: {
                    employee: { select: { firstName: true, lastName: true, employeeId: true } },
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                team: directReports,
                attendance,
                approvedLeaves: leaves,
            },
        });
    }
    catch (error) {
        console.error('Get team calendar error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch team calendar' });
    }
}
//# sourceMappingURL=attendanceController.js.map