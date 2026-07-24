import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Department, ProjectStatus, Role } from '@prisma/client';
import { logAudit } from '../lib/auditLog';

// ─── CREATE Project (Admin Creates Project & Assigns PM) ───
export async function createProject(req: Request, res: Response) {
  try {
    const { name, description, department, startDate, endDate, status, projectManagerId } = req.body;

    if (!name || !department || !startDate) {
      res.status(400).json({ success: false, error: 'Name, department, and startDate are required' });
      return;
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        department: department as Department,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: (status as ProjectStatus) || ProjectStatus.ACTIVE,
        projectManagerId: projectManagerId || null,
        createdById: req.currentUser!.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        chunks: true,
        _count: { select: { tasks: true } },
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'CREATE',
      targetEntity: 'Project',
      targetId: project.id,
      after: project,
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
}

// ─── CREATE Project Chunk (Project Manager Creates Chunk for Department) ───
export async function createProjectChunk(req: Request, res: Response) {
  try {
    const { projectId, title, description, assignedDepartment, assignedManagerId } = req.body;

    if (!projectId || !title || !assignedDepartment) {
      res.status(400).json({ success: false, error: 'projectId, title, and assignedDepartment are required' });
      return;
    }

    // Prevent PM from assigning chunk to themselves
    const currentEmployeeId = req.currentUser!.employeeId;
    if (assignedManagerId && assignedManagerId === currentEmployeeId) {
      res.status(400).json({ success: false, error: 'Project Managers cannot assign project chunks to themselves' });
      return;
    }

    // Validate that the assigned manager is a department MANAGER of the correct department
    if (assignedManagerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: assignedManagerId },
      });

      if (!manager) {
        res.status(404).json({ success: false, error: 'Selected manager not found' });
        return;
      }

      if (manager.role !== Role.MANAGER) {
        res.status(400).json({ success: false, error: 'The selected employee is not a department manager' });
        return;
      }

      if (manager.department !== (assignedDepartment as Department)) {
        res.status(400).json({ success: false, error: `The selected manager does not belong to the ${assignedDepartment} department` });
        return;
      }
    }

    const chunk = await prisma.projectChunk.create({
      data: {
        projectId,
        title,
        description,
        assignedDepartment: assignedDepartment as Department,
        assignedManagerId: assignedManagerId || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'CREATE',
      targetEntity: 'ProjectChunk',
      targetId: chunk.id,
      after: chunk,
    });

    res.status(201).json({ success: true, data: chunk });
  } catch (error) {
    console.error('Create project chunk error:', error);
    res.status(500).json({ success: false, error: 'Failed to create project chunk' });
  }
}

// ─── GET ALL Projects (Hierarchy & Chunks) ─────────────
export async function getAllProjects(req: Request, res: Response) {
  try {
    const { status, department } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status as ProjectStatus;
    if (department && department !== 'ALL') where.department = department as Department;

    const projects = await prisma.project.findMany({
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
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
}

// ─── GET Single Project ─────────────────────────────────
export async function getProject(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({
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
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
}

// ─── UPDATE Project ─────────────────────────────────────
export async function updateProject(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { name, description, department, status, startDate, endDate, projectManagerId } = req.body;

    const before = await prisma.project.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(department && { department: department as Department }),
        ...(status && { status: status as ProjectStatus }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(projectManagerId !== undefined && { projectManagerId }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'Project',
      targetId: id,
      before,
      after: project,
    });

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
}

// ─── UPDATE Project Chunk ────────────────────────────────
export async function updateProjectChunk(req: Request, res: Response) {
  try {
    const chunkId = req.params.chunkId as string;
    const { title, description, assignedDepartment, assignedManagerId, status } = req.body;

    const before = await prisma.projectChunk.findUnique({ where: { id: chunkId } });
    if (!before) {
      res.status(404).json({ success: false, error: 'Project chunk not found' });
      return;
    }

    const targetDept = assignedDepartment || before.assignedDepartment;
    if (assignedManagerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: assignedManagerId },
      });

      if (!manager) {
        res.status(404).json({ success: false, error: 'Selected manager not found' });
        return;
      }

      if (manager.role !== Role.MANAGER) {
        res.status(400).json({ success: false, error: 'The selected employee is not a department manager' });
        return;
      }

      if (manager.department !== (targetDept as Department)) {
        res.status(400).json({ success: false, error: `The selected manager does not belong to the ${targetDept} department` });
        return;
      }
    }

    const chunk = await prisma.projectChunk.update({
      where: { id: chunkId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(assignedDepartment && { assignedDepartment: assignedDepartment as Department }),
        ...(assignedManagerId !== undefined && { assignedManagerId: assignedManagerId || null }),
        ...(status && { status }),
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'ProjectChunk',
      targetId: chunkId,
      before,
      after: chunk,
    });

    res.json({ success: true, data: chunk });
  } catch (error) {
    console.error('Update project chunk error:', error);
    res.status(500).json({ success: false, error: 'Failed to update project chunk' });
  }
}

