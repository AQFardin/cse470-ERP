"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.createProjectChunk = createProjectChunk;
exports.getAllProjects = getAllProjects;
exports.getProject = getProject;
exports.updateProject = updateProject;
exports.updateProjectChunk = updateProjectChunk;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const auditLog_1 = require("../lib/auditLog");
// ─── CREATE Project (Admin Creates Project & Assigns PM) ───
async function createProject(req, res) {
    try {
        const { name, description, department, startDate, endDate, status, projectManagerId } = req.body;
        if (!name || !department || !startDate) {
            res.status(400).json({ success: false, error: 'Name, department, and startDate are required' });
            return;
        }
        const project = await prisma_1.prisma.project.create({
            data: {
                name,
                description,
                department: department,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                status: status || client_1.ProjectStatus.ACTIVE,
                projectManagerId: projectManagerId || null,
                createdById: req.currentUser.id,
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                projectManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                chunks: true,
                _count: { select: { tasks: true } },
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'CREATE',
            targetEntity: 'Project',
            targetId: project.id,
            after: project,
        });
        res.status(201).json({ success: true, data: project });
    }
    catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ success: false, error: 'Failed to create project' });
    }
}
// ─── CREATE Project Chunk (Project Manager Creates Chunk for Department) ───
async function createProjectChunk(req, res) {
    try {
        const { projectId, title, description, assignedDepartment, assignedManagerId } = req.body;
        if (!projectId || !title || !assignedDepartment) {
            res.status(400).json({ success: false, error: 'projectId, title, and assignedDepartment are required' });
            return;
        }
        // Prevent PM from assigning chunk to themselves
        const currentEmployeeId = req.currentUser.employeeId;
        if (assignedManagerId && assignedManagerId === currentEmployeeId) {
            res.status(400).json({ success: false, error: 'Project Managers cannot assign project chunks to themselves' });
            return;
        }
        // Validate that the assigned manager is a department MANAGER of the correct department
        if (assignedManagerId) {
            const manager = await prisma_1.prisma.employee.findUnique({
                where: { id: assignedManagerId },
            });
            if (!manager) {
                res.status(404).json({ success: false, error: 'Selected manager not found' });
                return;
            }
            if (manager.role !== client_1.Role.MANAGER) {
                res.status(400).json({ success: false, error: 'The selected employee is not a department manager' });
                return;
            }
            if (manager.department !== assignedDepartment) {
                res.status(400).json({ success: false, error: `The selected manager does not belong to the ${assignedDepartment} department` });
                return;
            }
        }
        const chunk = await prisma_1.prisma.projectChunk.create({
            data: {
                projectId,
                title,
                description,
                assignedDepartment: assignedDepartment,
                assignedManagerId: assignedManagerId || null,
            },
            include: {
                project: { select: { id: true, name: true } },
                assignedManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'CREATE',
            targetEntity: 'ProjectChunk',
            targetId: chunk.id,
            after: chunk,
        });
        res.status(201).json({ success: true, data: chunk });
    }
    catch (error) {
        console.error('Create project chunk error:', error);
        res.status(500).json({ success: false, error: 'Failed to create project chunk' });
    }
}
// ─── GET ALL Projects (Hierarchy & Chunks) ─────────────
async function getAllProjects(req, res) {
    try {
        const { status, department } = req.query;
        const where = {};
        if (status && status !== 'ALL')
            where.status = status;
        if (department && department !== 'ALL')
            where.department = department;
        const projects = await prisma_1.prisma.project.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                projectManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                chunks: {
                    include: {
                        assignedManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                        tasks: {
                            include: {
                                assignedTo: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                            },
                        },
                    },
                },
                tasks: {
                    include: {
                        assignedTo: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                    },
                },
                _count: { select: { tasks: true } },
            },
        });
        res.json({ success: true, data: projects, count: projects.length });
    }
    catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
}
// ─── GET Single Project ─────────────────────────────────
async function getProject(req, res) {
    try {
        const id = req.params.id;
        const project = await prisma_1.prisma.project.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                projectManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                chunks: {
                    include: {
                        assignedManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                        tasks: {
                            include: {
                                assignedTo: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
                            },
                        },
                    },
                },
                tasks: {
                    include: {
                        assignedTo: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } },
                        assignedBy: { select: { id: true, firstName: true, lastName: true } },
                    },
                    orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
                },
            },
        });
        if (!project) {
            res.status(404).json({ success: false, error: 'Project not found' });
            return;
        }
        res.json({ success: true, data: project });
    }
    catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
}
// ─── UPDATE Project ─────────────────────────────────────
async function updateProject(req, res) {
    try {
        const id = req.params.id;
        const { name, description, department, status, startDate, endDate, projectManagerId } = req.body;
        const before = await prisma_1.prisma.project.findUnique({ where: { id } });
        if (!before) {
            res.status(404).json({ success: false, error: 'Project not found' });
            return;
        }
        const project = await prisma_1.prisma.project.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(department && { department: department }),
                ...(status && { status: status }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(projectManagerId !== undefined && { projectManagerId }),
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                projectManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'Project',
            targetId: id,
            before,
            after: project,
        });
        res.json({ success: true, data: project });
    }
    catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ success: false, error: 'Failed to update project' });
    }
}
// ─── UPDATE Project Chunk ────────────────────────────────
async function updateProjectChunk(req, res) {
    try {
        const chunkId = req.params.chunkId;
        const { title, description, assignedDepartment, assignedManagerId, status } = req.body;
        const before = await prisma_1.prisma.projectChunk.findUnique({ where: { id: chunkId } });
        if (!before) {
            res.status(404).json({ success: false, error: 'Project chunk not found' });
            return;
        }
        const targetDept = assignedDepartment || before.assignedDepartment;
        if (assignedManagerId) {
            const manager = await prisma_1.prisma.employee.findUnique({
                where: { id: assignedManagerId },
            });
            if (!manager) {
                res.status(404).json({ success: false, error: 'Selected manager not found' });
                return;
            }
            if (manager.role !== client_1.Role.MANAGER) {
                res.status(400).json({ success: false, error: 'The selected employee is not a department manager' });
                return;
            }
            if (manager.department !== targetDept) {
                res.status(400).json({ success: false, error: `The selected manager does not belong to the ${targetDept} department` });
                return;
            }
        }
        const chunk = await prisma_1.prisma.projectChunk.update({
            where: { id: chunkId },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(assignedDepartment && { assignedDepartment: assignedDepartment }),
                ...(assignedManagerId !== undefined && { assignedManagerId: assignedManagerId || null }),
                ...(status && { status }),
            },
            include: {
                project: { select: { id: true, name: true } },
                assignedManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'ProjectChunk',
            targetId: chunkId,
            before,
            after: chunk,
        });
        res.json({ success: true, data: chunk });
    }
    catch (error) {
        console.error('Update project chunk error:', error);
        res.status(500).json({ success: false, error: 'Failed to update project chunk' });
    }
}
//# sourceMappingURL=projectController.js.map