import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logAudit } from '../lib/auditLog';

// ─── GET Leave Balances for Employee ────────────────────
export async function getLeaveBalances(req: Request, res: Response) {
  try {
    const employeeId = req.params.employeeId as string;
    const { year } = req.query;

    const balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId,
        year: year ? Number(year) : new Date().getFullYear(),
      },
      orderBy: { leaveType: 'asc' },
    });

    res.json({ success: true, data: balances });
  } catch (error) {
    console.error('Get leave balances error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave balances' });
  }
}

// ─── GET All Leave Balances (HR/Admin) ──────────────────
export async function getAllLeaveBalances(req: Request, res: Response) {
  try {
    const { year } = req.query;
    const targetYear = year ? Number(year) : new Date().getFullYear();

    const balances = await prisma.leaveBalance.findMany({
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
  } catch (error) {
    console.error('Get all leave balances error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave balances' });
  }
}

// ─── CORRECT Leave Balance (HR only) ────────────────────
export async function correctLeaveBalance(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { balance, reason } = req.body;

    if (balance === undefined || balance < 0) {
      res.status(400).json({ success: false, error: 'Balance must be a non-negative number' });
      return;
    }

    const existing = await prisma.leaveBalance.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Leave balance record not found' });
      return;
    }

    const before = { ...existing };

    const updated = await prisma.leaveBalance.update({
      where: { id },
      data: { balance },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'LeaveBalance',
      targetId: id,
      before: { ...before, reason: reason || 'HR correction' },
      after: updated,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Correct leave balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to correct leave balance' });
  }
}
