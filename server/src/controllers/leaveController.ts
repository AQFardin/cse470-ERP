import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { LeaveStatus, LeaveType } from '@prisma/client';
import { logAudit } from '../lib/auditLog';
import { userHasPermission } from '../middleware/authorize';

// HR-routed leave types — these go straight to HR for approval
const HR_ROUTED_LEAVE_TYPES: LeaveType[] = ['MATERNITY', 'UNPAID', 'EXTENDED', 'LEGAL'];

/**
 * Determine the approver for a leave request based on:
 * 1. Leave type → if special type, find user with HR role
 * 2. Submitter's role → if Manager, find user with Admin role
 * 3. Otherwise → use reportingManagerId from employee record
 */
async function determineApprover(employeeId: string, _leaveType: LeaveType): Promise<string | null> {
  // All employee leave requests go to HR for approval
  const hrUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'HR' } }, isActive: true },
    select: { employeeId: true },
  });
  if (hrUser?.employeeId) {
    return hrUser.employeeId;
  }

  // Fallback to reporting manager if no HR user found
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { reportingManagerId: true },
  });

  return employee?.reportingManagerId || null;
}

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

    // Determine approver dynamically
    const approverId = await determineApprover(employeeId, type as LeaveType);

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        type: type as LeaveType,
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

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'CREATE',
      targetEntity: 'LeaveRequest',
      targetId: leaveRequest.id,
      after: leaveRequest,
    });

    res.status(201).json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to create leave request' });
  }
}

// ─── GET ALL Leave Requests (role-scoped) ───────────────
export async function getAllLeaveRequests(req: Request, res: Response) {
  try {
    const { status, employeeId: filterEmpId } = req.query;
    const userRoles = req.currentUser!.roles;
    const currentEmployeeId = req.currentUser!.employeeId;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as LeaveStatus;
    }
    if (filterEmpId) {
      where.employeeId = filterEmpId as string;
    }

    // Role-based scoping
    const canViewAll = await userHasPermission(userRoles, 'leave', 'view_all');
    const canViewTeam = await userHasPermission(userRoles, 'leave', 'view_team');

    if (canViewAll) {
      // No additional scoping
    } else if (canViewTeam && currentEmployeeId) {
      // Manager: see own + direct reports' requests + requests where they are the approver
      const directReports = await prisma.employee.findMany({
        where: { reportingManagerId: currentEmployeeId },
        select: { id: true },
      });
      const reportIds = directReports.map((r) => r.id);
      where.OR = [
        { employeeId: currentEmployeeId },
        { employeeId: { in: reportIds } },
        { approverId: currentEmployeeId },
      ];
    } else if (currentEmployeeId) {
      // Employee: own requests only
      where.employeeId = currentEmployeeId;
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
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
  }
}

// ─── GET Leave Requests for Employee ────────────────────
export async function getEmployeeLeaveRequests(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

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
  } catch (error) {
    console.error('Get employee leaves error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
  }
}

// ─── REVIEW Leave Request (Approve/Deny) ────────────────
export async function reviewLeaveRequest(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { status, reviewedById } = req.body;

    if (!status || !['APPROVED', 'DENIED'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Status must be APPROVED or DENIED',
      });
      return;
    }

    // Verify the request exists and is pending
    const existing = await prisma.leaveRequest.findUnique({
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
    const currentEmployeeId = req.currentUser!.employeeId;
    const userRoles = req.currentUser!.roles;
    const isDesignatedApprover = existing.approverId === currentEmployeeId;
    const isAdmin = userRoles.includes('ADMIN');
    const isHR = userRoles.includes('HR');

    // Allow designated approver, Admin, or HR to review leave requests
    if (!isDesignatedApprover && !isAdmin && !isHR) {
      res.status(403).json({
        success: false,
        error: 'Only HR or the designated approver can review this leave request',
      });
      return;
    }

    const before = { ...existing };

    const leaveRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
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
      const balance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: existing.employeeId,
          leaveType: existing.type,
          year,
        },
      });

      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { balance: Math.max(0, balance.balance - days) },
        });
      }
    }

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'LeaveRequest',
      targetId: id,
      before,
      after: leaveRequest,
    });

    res.json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to review leave request' });
  }
}
