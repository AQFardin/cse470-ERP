import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Department, EmployeeStatus, Role, SystemRole } from '@prisma/client';
import { logAudit } from '../lib/auditLog';
import { userHasPermission } from '../middleware/authorize';

// ─── CREATE Employee ────────────────────────────────────
export async function createEmployee(req: Request, res: Response) {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      department,
      position,
      role,
      hireDate,
      address,
      avatarUrl,
      reportingManagerId,
      systemRole,
    } = req.body;

    // Generate next employee ID
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { employeeId: true },
    });

    let nextNum = 1;
    if (lastEmployee) {
      const match = lastEmployee.employeeId.match(/EMP(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const employeeId = `EMP${String(nextNum).padStart(3, '0')}`;

    // Enforce 1-manager-per-department rule:
    const isManagerRole = role === Role.MANAGER || systemRole === 'MANAGER';
    if (isManagerRole) {
      const existingManager = await prisma.employee.findFirst({
        where: {
          department: department as Department,
          role: Role.MANAGER,
          status: { not: 'INACTIVE' },
        },
      });
      if (existingManager) {
        res.status(400).json({
          success: false,
          error: `Department ${department} already has an active Manager (${existingManager.firstName} ${existingManager.lastName}, ${existingManager.employeeId}). Each department can only have one manager.`,
        });
        return;
      }
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        phoneNumber,
        department: department as Department,
        position,
        role: (role as Role) || Role.EMPLOYEE,
        hireDate: new Date(hireDate),
        address,
        avatarUrl,
        reportingManagerId: reportingManagerId || null,
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'CREATE',
      targetEntity: 'Employee',
      targetId: employee.id,
      after: employee,
    });

    // Automatically create a corresponding User for the Employee
    if (systemRole) {
      const user = await prisma.user.create({
        data: {
          employeeId: employee.id,
          name: `${firstName} ${lastName}`,
          email,
          passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiCR/PeRoIGL5JZ9As3Z5Y.V3iE0r2', // dummy 'password'
        },
      });

      // Assign Roles
      const roleAssignments: { userId: string; role: SystemRole }[] = [{ userId: user.id, role: SystemRole.EMPLOYEE }];
      
      // If a specific system role is assigned, give them that too
      if (systemRole !== 'EMPLOYEE' && Object.values(SystemRole).includes(systemRole)) {
        roleAssignments.push({ userId: user.id, role: systemRole as SystemRole });
      }
      
      await prisma.userRole.createMany({ data: roleAssignments });
    }

    res.status(201).json({ success: true, data: employee });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: `A record with that ${error.meta?.target?.join(', ')} already exists.`,
      });
      return;
    }
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to create employee' });
  }
}

// ─── GET ALL Employees (role-scoped) ────────────────────
export async function getAllEmployees(req: Request, res: Response) {
  try {
    const { status, department, search, role } = req.query;
    const userRoles = req.currentUser!.roles;
    const employeeId = req.currentUser!.employeeId;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status as EmployeeStatus;
    }
    if (department && department !== 'ALL') {
      where.department = department as Department;
    }
    if (role && role !== 'ALL') {
      where.role = role as Role;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
        { email: { contains: search as string } },
        { employeeId: { contains: search as string } },
      ];
    }

    // Role-based scoping
    const canViewAll = await userHasPermission(userRoles, 'employee_records', 'view_all');
    const canViewTeam = await userHasPermission(userRoles, 'employee_records', 'view_team');
    const isProjectManager = userRoles.includes('PROJECT_MANAGER');

    if (canViewAll || isProjectManager) {
      // No additional scoping — see everyone
    } else if (canViewTeam && employeeId) {
      // Manager: see own record + team in their department
      const currentEmp = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (currentEmp) {
        where.OR = [
          { department: currentEmp.department },
          { reportingManagerId: employeeId },
          { id: employeeId },
        ];
      } else {
        where.id = employeeId;
      }
    } else if (employeeId) {
      // Employee: own record only
      where.id = employeeId;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            assignedTasks: true,
            leaveRequests: true,
          },
        },
        reportingManager: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
      },
    });

    res.json({ success: true, data: employees, count: employees.length });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
}

// ─── GET Single Employee ────────────────────────────────
export async function getEmployee(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        assignedTasks: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            assignedTasks: true,
            leaveRequests: true,
          },
        },
        reportingManager: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        directReports: {
          select: { id: true, firstName: true, lastName: true, employeeId: true, department: true, position: true, status: true },
        },
      },
    });

    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employee' });
  }
}

// ─── UPDATE Employee ────────────────────────────────────
export async function updateEmployee(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      department,
      position,
      role,
      address,
      avatarUrl,
      reportingManagerId,
    } = req.body;

    const before = await prisma.employee.findUnique({ where: { id } });

    // Enforce 1-manager-per-department rule on updates:
    const targetDepartment = department || before?.department;
    const targetRole = role || before?.role;
    if (targetRole === Role.MANAGER) {
      const existingManager = await prisma.employee.findFirst({
        where: {
          department: targetDepartment as Department,
          role: Role.MANAGER,
          status: { not: 'INACTIVE' },
          id: { not: id },
        },
      });
      if (existingManager) {
        res.status(400).json({
          success: false,
          error: `Department ${targetDepartment} already has an active Manager (${existingManager.firstName} ${existingManager.lastName}). Each department can only have one manager.`,
        });
        return;
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(department && { department: department as Department }),
        ...(position && { position }),
        ...(role && { role: role as Role }),
        ...(address !== undefined && { address }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(reportingManagerId !== undefined && { reportingManagerId }),
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'Employee',
      targetId: id,
      before,
      after: employee,
    });

    res.json({ success: true, data: employee });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: `A record with that ${error.meta?.target?.join(', ')} already exists.`,
      });
      return;
    }
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to update employee' });
  }
}

// ─── TOGGLE Employee Status (Deactivate/Reactivate) ────
export async function toggleEmployeeStatus(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status || !Object.values(EmployeeStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(EmployeeStatus).join(', ')}`,
      });
      return;
    }

    const before = await prisma.employee.findUnique({ where: { id } });

    const employee = await prisma.employee.update({
      where: { id },
      data: { status: status as EmployeeStatus },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'Employee',
      targetId: id,
      before,
      after: employee,
    });

    res.json({ success: true, data: employee });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }
    console.error('Toggle status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
}

// ─── GET Dashboard Stats ────────────────────────────────
export async function getDashboardStats(_req: Request, res: Response) {
  try {
    const [
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      inactiveEmployees,
      pendingLeaves,
      totalTasks,
      overdueTasks,
      completedTasks,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } }),
      prisma.employee.count({ where: { status: EmployeeStatus.ON_LEAVE } }),
      prisma.employee.count({ where: { status: EmployeeStatus.INACTIVE } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.taskAssignment.count(),
      prisma.taskAssignment.count({ where: { status: 'OVERDUE' } }),
      prisma.taskAssignment.count({ where: { status: 'COMPLETED' } }),
    ]);

    // Department distribution
    const departmentCounts = await prisma.employee.groupBy({
      by: ['department'],
      _count: { department: true },
      where: { status: { not: EmployeeStatus.INACTIVE } },
    });

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        onLeaveEmployees,
        inactiveEmployees,
        pendingLeaves,
        totalTasks,
        overdueTasks,
        completedTasks,
        departmentCounts: departmentCounts.map((d) => ({
          department: d.department,
          count: d._count.department,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
}
