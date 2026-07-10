import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Department, EmployeeStatus, Role } from '@prisma/client';

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
      },
    });

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

// ─── GET ALL Employees ──────────────────────────────────
export async function getAllEmployees(req: Request, res: Response) {
  try {
    const { status, department, search, role } = req.query;

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
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { employeeId: { contains: search as string, mode: 'insensitive' } },
      ];
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
    const { id } = req.params;

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
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      department,
      position,
      address,
      avatarUrl,
    } = req.body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(department && { department: department as Department }),
        ...(position && { position }),
        ...(address !== undefined && { address }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
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
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(EmployeeStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(EmployeeStatus).join(', ')}`,
      });
      return;
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: { status: status as EmployeeStatus },
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
