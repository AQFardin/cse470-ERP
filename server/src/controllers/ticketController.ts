import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { logAudit } from '../lib/auditLog';
import { userHasPermission } from '../middleware/authorize';

// ─── CREATE Ticket ──────────────────────────────────────
export async function createTicket(req: Request, res: Response) {
  try {
    const { title, description, category, priority, assignedToId } = req.body;

    if (!title || !description || !category) {
      res.status(400).json({ success: false, error: 'Title, description, and category are required' });
      return;
    }

    const raisedById = req.currentUser!.id;

    // Auto-assignment routing by category if assignedToId is not provided
    let targetAssigneeId = assignedToId || null;
    if (!targetAssigneeId) {
      if (category === 'CUSTOMER_SUPPORT') {
        const supportUser = await prisma.user.findFirst({
          where: { roles: { some: { role: 'SUPPORT' } }, isActive: true },
        });
        targetAssigneeId = supportUser?.id || null;
      } else if (category === 'INTERNAL_IT' || category === 'MANAGER_ASSIST') {
        const adminUser = await prisma.user.findFirst({
          where: { roles: { some: { role: 'ADMIN' } }, isActive: true },
        });
        targetAssigneeId = adminUser?.id || null;
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        category: category as TicketCategory,
        priority: (priority as TicketPriority) || TicketPriority.MEDIUM,
        raisedById,
        assignedToId: targetAssigneeId,
      },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await logAudit({
      actorId: raisedById,
      action: 'CREATE',
      targetEntity: 'Ticket',
      targetId: ticket.id,
      after: ticket,
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
}

// ─── GET ALL Tickets (Role-Scoped & Category Lanes) ─────
export async function getAllTickets(req: Request, res: Response) {
  try {
    const { category, status, priority } = req.query;
    const userRoles = req.currentUser!.roles;
    const currentUserId = req.currentUser!.id;

    const where: any = {};
    if (category && category !== 'ALL') where.category = category as TicketCategory;
    if (status && status !== 'ALL') where.status = status as TicketStatus;
    if (priority && priority !== 'ALL') where.priority = priority as TicketPriority;

    const canViewAll = await userHasPermission(userRoles, 'ticket', 'view_all');

    if (!canViewAll) {
      // Base Employee: view tickets raised by them or assigned to them
      where.OR = [
        { raisedById: currentUserId },
        { assignedToId: currentUserId },
      ];
    } else {
      // Support role views Customer Support lane; Admin/Manager views IT/Internal lane
      const isSupportOnly = userRoles.includes('SUPPORT') && !userRoles.includes('ADMIN') && !userRoles.includes('MANAGER');
      if (isSupportOnly && !category) {
        where.category = TicketCategory.CUSTOMER_SUPPORT;
      }
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, data: tickets, count: tickets.length });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
}

// ─── GET Single Ticket ──────────────────────────────────
export async function getTicket(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
  }
}

// ─── UPDATE Ticket (Status / Assignee / Priority) ───────
export async function updateTicket(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { status, assignedToId, priority, title, description } = req.body;

    const before = await prisma.ticket.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(status && { status: status as TicketStatus }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(priority && { priority: priority as TicketPriority }),
        ...(title && { title }),
        ...(description && { description }),
      },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await logAudit({
      actorId: req.currentUser!.id,
      action: 'UPDATE',
      targetEntity: 'Ticket',
      targetId: id,
      before,
      after: ticket,
    });

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
}
