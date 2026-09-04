import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EmployeeStatus } from '@prisma/client';
import { logAudit } from '../lib/auditLog';

// ─── CREATE Offboard Request ────────────────────────────
export async function createOffboardRequest(req: Request, res: Response) {
  try {
    const { employeeId, reason, effectiveDate } = req.body;

    // Validate employee exists and is active
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }
    if (employee.status === 'INACTIVE') {
      res.status(400).json({ success: false, error: 'Employee is already inactive' });
      return;
    }

    // Check no existing pending/approved request
    const existing = await prisma.offboardRequest.findFirst({
      where: { employeeId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (existing) {
      res.status(409).json({ success: false, error: 'An offboard request already exists for this employee' });
      return;
    }

    const request = await prisma.offboardRequest.create({
      data: {
        employeeId,
        requestedById: req.currentUser!.id,
        reason,
        effectiveDate: new Date(effectiveDate),
      },
      include: {
        employee: {
          select: { id: true, employeeId: true, firstName: true, lastName: true, department: true },
        },
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'CREATE',
      targetEntity: 'OffboardRequest',
      targetId: request.id,
      after: request,
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    console.error('Create offboard request error:', error);
    res.status(500).json({ success: false, error: 'Failed to create offboard request' });
  }
}

// ─── GET ALL Offboard Requests ──────────────────────────
export async function getAllOffboardRequests(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') where.status = status;

    const requests = await prisma.offboardRequest.findMany({
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
    const userIds = new Set<string>();
    requests.forEach((r) => {
      userIds.add(r.requestedById);
      if (r.reviewedById) userIds.add(r.reviewedById);
    });

    const users = await prisma.user.findMany({
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
  } catch (error) {
    console.error('Get offboard requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch offboard requests' });
  }
}

// ─── REVIEW Offboard Request (HR approves/rejects) ──────
export async function reviewOffboardRequest(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Status must be APPROVED or REJECTED' });
      return;
    }

    const existing = await prisma.offboardRequest.findUnique({ where: { id } });
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
    const updated = await prisma.offboardRequest.update({
      where: { id },
      data: {
        status: status as any,
        reviewedById: req.currentUser!.id,
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
      const empBefore = await prisma.employee.findUnique({ where: { id: existing.employeeId } });
      await prisma.employee.update({
        where: { id: existing.employeeId },
        data: { status: EmployeeStatus.INACTIVE },
      });

      // Mark request as completed
      await prisma.offboardRequest.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      await logAudit({
        actorId: req.currentUser!.id,
        action: 'UPDATE',
        targetEntity: 'Employee',
        targetId: existing.employeeId,
        before: empBefore,
        after: { ...empBefore, status: 'INACTIVE' },
      });
    }

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'OffboardRequest',
      targetId: id,
      before,
      after: updated,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Review offboard request error:', error);
    res.status(500).json({ success: false, error: 'Failed to review offboard request' });
  }
}
