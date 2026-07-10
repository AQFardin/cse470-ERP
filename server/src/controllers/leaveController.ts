import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { LeaveStatus, LeaveType } from '@prisma/client';

// ─── CREATE Leave Request ───────────────────────────────
export async function createLeaveRequest(req: Request, res: Response) {
  try {
    const { employeeId, type, startDate, endDate, reason } = req.body;

    // Validate employee exists and is active
    const employee = await prisma.employee.findUnique({
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

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        type: type as LeaveType,
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
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to create leave request' });
  }
}

// ─── GET ALL Leave Requests ─────────────────────────────
export async function getAllLeaveRequests(req: Request, res: Response) {
  try {
    const { status, employeeId } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as LeaveStatus;
    }
    if (employeeId) {
      where.employeeId = employeeId as string;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
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
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
  }
}

// ─── GET Leave Requests for Employee ────────────────────
export async function getEmployeeLeaveRequests(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const leaveRequests = await prisma.leaveRequest.findMany({
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
  } catch (error) {
    console.error('Get employee leaves error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
  }
}

// ─── REVIEW Leave Request (Approve/Deny) ────────────────
export async function reviewLeaveRequest(req: Request, res: Response) {
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
    const existing = await prisma.leaveRequest.findUnique({ where: { id } });
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

    const leaveRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
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
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to review leave request' });
  }
}
