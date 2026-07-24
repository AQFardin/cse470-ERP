"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmployee = createEmployee;
exports.getAllEmployees = getAllEmployees;
exports.getEmployee = getEmployee;
exports.updateEmployee = updateEmployee;
exports.toggleEmployeeStatus = toggleEmployeeStatus;
exports.getDashboardStats = getDashboardStats;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const auditLog_1 = require("../lib/auditLog");
const authorize_1 = require("../middleware/authorize");
// ─── CREATE Employee ────────────────────────────────────
async function createEmployee(req, res) {
    try {
        const { firstName, lastName, email, phoneNumber, department, position, role, hireDate, address, avatarUrl, reportingManagerId, systemRole, } = req.body;
        // Generate next employee ID
        const lastEmployee = await prisma_1.prisma.employee.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { employeeId: true },
        });
        let nextNum = 1;
        if (lastEmployee) {
            const match = lastEmployee.employeeId.match(/EMP(\d+)/);
            if (match)
                nextNum = parseInt(match[1], 10) + 1;
        }
        const employeeId = `EMP${String(nextNum).padStart(3, '0')}`;
        const employee = await prisma_1.prisma.employee.create({
            data: {
                employeeId,
                firstName,
                lastName,
                email,
                phoneNumber,
                department: department,
                position,
                role: role || client_1.Role.EMPLOYEE,
                hireDate: new Date(hireDate),
                address,
                avatarUrl,
                reportingManagerId: reportingManagerId || null,
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'CREATE',
            targetEntity: 'Employee',
            targetId: employee.id,
            after: employee,
        });
        // Automatically create a corresponding User for the Employee
        if (systemRole) {
            const user = await prisma_1.prisma.user.create({
                data: {
                    employeeId: employee.id,
                    name: `${firstName} ${lastName}`,
                    email,
                    passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiCR/PeRoIGL5JZ9As3Z5Y.V3iE0r2', // dummy 'password'
                },
            });
            // Assign Roles
            const roleAssignments = [{ userId: user.id, role: client_1.SystemRole.EMPLOYEE }];
            // If a specific system role is assigned, give them that too
            if (systemRole !== 'EMPLOYEE' && Object.values(client_1.SystemRole).includes(systemRole)) {
                roleAssignments.push({ userId: user.id, role: systemRole });
            }
            await prisma_1.prisma.userRole.createMany({ data: roleAssignments });
        }
        res.status(201).json({ success: true, data: employee });
    }
    catch (error) {
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
async function getAllEmployees(req, res) {
    try {
        const { status, department, search, role } = req.query;
        const userRoles = req.currentUser.roles;
        const employeeId = req.currentUser.employeeId;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (department && department !== 'ALL') {
            where.department = department;
        }
        if (role && role !== 'ALL') {
            where.role = role;
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
                { employeeId: { contains: search } },
            ];
        }
        // Role-based scoping
        const canViewAll = await (0, authorize_1.userHasPermission)(userRoles, 'employee_records', 'view_all');
        const canViewTeam = await (0, authorize_1.userHasPermission)(userRoles, 'employee_records', 'view_team');
        const isProjectManager = userRoles.includes('PROJECT_MANAGER');
        if (canViewAll || isProjectManager) {
            // No additional scoping — see everyone
        }
        else if (canViewTeam && employeeId) {
            // Manager: see own record + team in their department
            const currentEmp = await prisma_1.prisma.employee.findUnique({ where: { id: employeeId } });
            if (currentEmp) {
                where.OR = [
                    { department: currentEmp.department },
                    { reportingManagerId: employeeId },
                    { id: employeeId },
                ];
            }
            else {
                where.id = employeeId;
            }
        }
        else if (employeeId) {
            // Employee: own record only
            where.id = employeeId;
        }
        const employees = await prisma_1.prisma.employee.findMany({
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
    }
    catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch employees' });
    }
}
// ─── GET Single Employee ────────────────────────────────
async function getEmployee(req, res) {
    try {
        const id = req.params.id;
        const employee = await prisma_1.prisma.employee.findUnique({
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
    }
    catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch employee' });
    }
}
// ─── UPDATE Employee ────────────────────────────────────
async function updateEmployee(req, res) {
    try {
        const id = req.params.id;
        const { firstName, lastName, email, phoneNumber, department, position, address, avatarUrl, reportingManagerId, } = req.body;
        const before = await prisma_1.prisma.employee.findUnique({ where: { id } });
        const employee = await prisma_1.prisma.employee.update({
            where: { id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(email && { email }),
                ...(phoneNumber !== undefined && { phoneNumber }),
                ...(department && { department: department }),
                ...(position && { position }),
                ...(address !== undefined && { address }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(reportingManagerId !== undefined && { reportingManagerId }),
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'Employee',
            targetId: id,
            before,
            after: employee,
        });
        res.json({ success: true, data: employee });
    }
    catch (error) {
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
async function toggleEmployeeStatus(req, res) {
    try {
        const id = req.params.id;
        const { status } = req.body;
        if (!status || !Object.values(client_1.EmployeeStatus).includes(status)) {
            res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${Object.values(client_1.EmployeeStatus).join(', ')}`,
            });
            return;
        }
        const before = await prisma_1.prisma.employee.findUnique({ where: { id } });
        const employee = await prisma_1.prisma.employee.update({
            where: { id },
            data: { status: status },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'Employee',
            targetId: id,
            before,
            after: employee,
        });
        res.json({ success: true, data: employee });
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        console.error('Toggle status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
}
// ─── GET Dashboard Stats ────────────────────────────────
async function getDashboardStats(_req, res) {
    try {
        const [totalEmployees, activeEmployees, onLeaveEmployees, inactiveEmployees, pendingLeaves, totalTasks, overdueTasks, completedTasks,] = await Promise.all([
            prisma_1.prisma.employee.count(),
            prisma_1.prisma.employee.count({ where: { status: client_1.EmployeeStatus.ACTIVE } }),
            prisma_1.prisma.employee.count({ where: { status: client_1.EmployeeStatus.ON_LEAVE } }),
            prisma_1.prisma.employee.count({ where: { status: client_1.EmployeeStatus.INACTIVE } }),
            prisma_1.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
            prisma_1.prisma.taskAssignment.count(),
            prisma_1.prisma.taskAssignment.count({ where: { status: 'OVERDUE' } }),
            prisma_1.prisma.taskAssignment.count({ where: { status: 'COMPLETED' } }),
        ]);
        // Department distribution
        const departmentCounts = await prisma_1.prisma.employee.groupBy({
            by: ['department'],
            _count: { department: true },
            where: { status: { not: client_1.EmployeeStatus.INACTIVE } },
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
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
}
//# sourceMappingURL=employeeController.js.map