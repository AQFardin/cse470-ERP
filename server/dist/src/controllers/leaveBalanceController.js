"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaveBalances = getLeaveBalances;
exports.getAllLeaveBalances = getAllLeaveBalances;
exports.correctLeaveBalance = correctLeaveBalance;
const prisma_1 = require("../lib/prisma");
const auditLog_1 = require("../lib/auditLog");
// ─── GET Leave Balances for Employee ────────────────────
async function getLeaveBalances(req, res) {
    try {
        const employeeId = req.params.employeeId;
        const { year } = req.query;
        const balances = await prisma_1.prisma.leaveBalance.findMany({
            where: {
                employeeId,
                year: year ? Number(year) : new Date().getFullYear(),
            },
            orderBy: { leaveType: 'asc' },
        });
        res.json({ success: true, data: balances });
    }
    catch (error) {
        console.error('Get leave balances error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch leave balances' });
    }
}
// ─── GET All Leave Balances (HR/Admin) ──────────────────
async function getAllLeaveBalances(req, res) {
    try {
        const { year } = req.query;
        const targetYear = year ? Number(year) : new Date().getFullYear();
        const balances = await prisma_1.prisma.leaveBalance.findMany({
            where: { year: targetYear },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: true,
                        status: true,
                    },
                },
            },
            orderBy: [{ employee: { firstName: 'asc' } }, { leaveType: 'asc' }],
        });
        res.json({ success: true, data: balances, count: balances.length });
    }
    catch (error) {
        console.error('Get all leave balances error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch leave balances' });
    }
}
// ─── CORRECT Leave Balance (HR only) ────────────────────
async function correctLeaveBalance(req, res) {
    try {
        const id = req.params.id;
        const { balance, reason } = req.body;
        if (balance === undefined || balance < 0) {
            res.status(400).json({ success: false, error: 'Balance must be a non-negative number' });
            return;
        }
        const existing = await prisma_1.prisma.leaveBalance.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Leave balance record not found' });
            return;
        }
        const before = { ...existing };
        const updated = await prisma_1.prisma.leaveBalance.update({
            where: { id },
            data: { balance },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'LeaveBalance',
            targetId: id,
            before: { ...before, reason: reason || 'HR correction' },
            after: updated,
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('Correct leave balance error:', error);
        res.status(500).json({ success: false, error: 'Failed to correct leave balance' });
    }
}
//# sourceMappingURL=leaveBalanceController.js.map