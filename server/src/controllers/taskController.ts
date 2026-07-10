import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { TaskPriority, TaskStatus } from '@prisma/client';

// ─── CREATE Task Assignment ─────────────────────────────
export async function createTask(req: Request, res: Response) {
  try {
    const { title, description, assignedToId, assignedById, priority, deadline } = req.body;

    // Validate assigned employee exists
    const assignee = await prisma.employee.findUnique({
      where: { id: assignedToId },
    });
    if (!assignee) {
      res.status(404).json({ success: false, error: 'Assigned employee not found' });
      return;
    }

    const task = await prisma.taskAssignment.create({
      data: {
        title,
        description,
        assignedToId,
        assignedById,
        priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
        deadline: new Date(deadline),
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

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
}

// ─── GET ALL Tasks ──────────────────────────────────────
export async function getAllTasks(req: Request, res: Response) {
  try {
    const { status, priority, assignedToId } = req.query;

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
            firstName: true,
            lastName: true,
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
    const { id } = req.params;

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
    const { id } = req.params;
    const { title, description, priority, status, deadline, assignedToId } = req.body;

    const task = await prisma.taskAssignment.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority: priority as TaskPriority }),
        ...(status && { status: status as TaskStatus }),
        ...(deadline && { deadline: new Date(deadline) }),
        ...(assignedToId && { assignedToId }),
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
    const { id } = req.params;

    await prisma.taskAssignment.delete({ where: { id } });

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
