"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.createProjectChunk = createProjectChunk;
exports.getAllProjects = getAllProjects;
exports.getProject = getProject;
exports.updateProject = updateProject;
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
//# sourceMappingURL=projectController.js.map