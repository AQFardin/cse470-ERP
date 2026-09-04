import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Role, TaskPriority, TaskStatus } from '@prisma/client';
import { logAudit } from '../lib/auditLog';
import { userHasPermission } from '../middleware/authorize';

// ─── CREATE Task Assignment ─────────────────────────────
export async function createTask(req: Request, res: Response) {
  try {
    const { title, description, assignedToId, assignedById, priority, deadline, projectId, projectChunkId, milestone } = req.body;

    // Validate assigned employee exists
    const assignee = await prisma.employee.findUnique({
      where: { id: assignedToId },
    });
    if (!assignee) {
      res.status(404).json({ success: false, error: 'Assigned employee not found' });
      return;
    }
    
    // Fetch the assigner
    const assignerId = assignedById || req.currentUser!.employeeId!;
    const assigner = await prisma.employee.findUnique({
      where: { id: assignerId },
    });
    
    if (!assigner) {
      res.status(404).json({ success: false, error: 'Assigner not found' });
      return;
    }

    // Check if the assigner is a Project Manager (cross-department role)
    const userRoles = req.currentUser!.roles;
    const isProjectManager = userRoles.includes('PROJECT_MANAGER');

    // Project Managers cannot assign tasks to themselves
    if (isProjectManager && assignerId === assignedToId) {
      res.status(400).json({ success: false, error: 'Project Managers cannot assign tasks to themselves' });
      return;
    }

    // Department managers: enforce same-department restriction
    // Project managers: skip department check (they operate cross-department)
    if (!isProjectManager && assigner.department !== assignee.department) {
      res.status(403).json({ success: false, error: 'You can only assign tasks to employees in your own department' });
      return;
    }

    // Enforce that tasks cannot be assigned to department managers
    if (assignee.role === Role.MANAGER || assignee.position.toLowerCase().includes('manager')) {
      res.status(400).json({ success: false, error: 'Tasks can only be assigned to regular team employees, not department managers' });
      return;
    }

    let finalProjectId = projectId || null;
    if (projectChunkId) {
      const chunk = await prisma.projectChunk.findUnique({
        where: { id: projectChunkId },
      });
      if (chunk) {
        finalProjectId = chunk.projectId;
      }
    }

    const task = await prisma.taskAssignment.create({
      data: {
        title,
        description,
        assignedToId,
        assignedById: assignedById || req.currentUser!.employeeId!,
        priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
        deadline: new Date(deadline),
        projectId: finalProjectId,
        projectChunkId: projectChunkId || null,
        milestone: milestone || null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            avatarUrl: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        projectChunk: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'CREATE',
      targetEntity: 'TaskAssignment',
      targetId: task.id,
      after: task,
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
}

// ─── GET ALL Tasks (role-scoped) ────────────────────────
export async function getAllTasks(req: Request, res: Response) {
  try {
    const { status, priority, assignedToId } = req.query;
    const userRoles = req.currentUser!.roles;
    const currentEmployeeId = req.currentUser!.employeeId;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as TaskStatus;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority as TaskPriority;
    }
    if (assignedToId) {
      where.assignedToId = assignedToId as string;
    }

    // Role-based scoping
    const canViewAll = await userHasPermission(userRoles, 'task', 'view_all');
    const canViewTeam = await userHasPermission(userRoles, 'task', 'view_team');

    if (!canViewAll && currentEmployeeId) {
      if (canViewTeam) {
        const emp = await prisma.employee.findUnique({ where: { id: currentEmployeeId } });
        if (emp) {
          where.OR = [
            { assignedToId: currentEmployeeId },
            { assignedById: currentEmployeeId },
            { assignedTo: { department: emp.department } },
          ];
        } else {
          where.assignedToId = currentEmployeeId;
        }
      } else {
        // Regular employee: only own tasks
        where.assignedToId = currentEmployeeId;
      }
    }

    const tasks = await prisma.taskAssignment.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            avatarUrl: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        projectChunk: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
}

// ─── GET Tasks for Employee ─────────────────────────────
export async function getEmployeeTasks(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const tasks = await prisma.taskAssignment.findMany({
      where: { assignedToId: id },
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
      include: {
        assignedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (error) {
    console.error('Get employee tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
}

// ─── UPDATE Task ────────────────────────────────────────
export async function updateTask(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { title, description, priority, status, deadline, assignedToId } = req.body;
    const userRoles = req.currentUser!.roles;
    const currentEmployeeId = req.currentUser!.employeeId;

    const before = await prisma.taskAssignment.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const canEdit = await userHasPermission(userRoles, 'task', 'edit');
    const isAssignee = currentEmployeeId && before.assignedToId === currentEmployeeId;

    // Check if updating only status
    const isStatusOnly = status && !title && !description && !priority && !deadline && !assignedToId;

    if (!canEdit) {
      if (!isAssignee || !isStatusOnly) {
        res.status(403).json({
          success: false,
          error: 'Employees can only update the status of their own assigned tasks',
        });
        return;
      }
    }

    const task = await prisma.taskAssignment.update({
      where: { id },
      data: {
        ...(canEdit && title && { title }),
        ...(canEdit && description !== undefined && { description }),
        ...(canEdit && priority && { priority: priority as TaskPriority }),
        ...(status && { status: status as TaskStatus }),
        ...(canEdit && deadline && { deadline: new Date(deadline) }),
        ...(canEdit && assignedToId && { assignedToId }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            avatarUrl: true,
          },
        },
        assignedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'TaskAssignment',
      targetId: id,
      before,
      after: task,
    });

    res.json({ success: true, data: task });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
}

// ─── DELETE Task ────────────────────────────────────────
export async function deleteTask(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const before = await prisma.taskAssignment.findUnique({ where: { id } });

    await prisma.taskAssignment.delete({ where: { id } });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'DELETE',
      targetEntity: 'TaskAssignment',
      targetId: id,
      before,
    });

    res.json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
}
