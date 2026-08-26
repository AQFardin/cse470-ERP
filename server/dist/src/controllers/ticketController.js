"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.getAllTickets = getAllTickets;
exports.getTicket = getTicket;
exports.updateTicket = updateTicket;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const auditLog_1 = require("../lib/auditLog");
const authorize_1 = require("../middleware/authorize");
// ─── CREATE Ticket ──────────────────────────────────────
async function createTicket(req, res) {
    try {
        const { title, description, category, priority, assignedToId } = req.body;
        if (!title || !description || !category) {
            res.status(400).json({ success: false, error: 'Title, description, and category are required' });
            return;
        }
        const raisedById = req.currentUser.id;
        // Auto-assignment routing by category if assignedToId is not provided
        let targetAssigneeId = assignedToId || null;
        if (!targetAssigneeId) {
            if (category === 'CUSTOMER_SUPPORT') {
                const supportUser = await prisma_1.prisma.user.findFirst({
                    where: { roles: { some: { role: 'SUPPORT' } }, isActive: true },
                });
                targetAssigneeId = supportUser?.id || null;
            }
            else if (category === 'INTERNAL_IT' || category === 'MANAGER_ASSIST') {
                const adminUser = await prisma_1.prisma.user.findFirst({
                    where: { roles: { some: { role: 'ADMIN' } }, isActive: true },
                });
                targetAssigneeId = adminUser?.id || null;
            }
        }
        const ticket = await prisma_1.prisma.ticket.create({
            data: {
                title,
                description,
                category: category,
                priority: priority || client_1.TicketPriority.MEDIUM,
                raisedById,
                assignedToId: targetAssigneeId,
            },
            include: {
                raisedBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: raisedById,
            action: 'CREATE',
            targetEntity: 'Ticket',
            targetId: ticket.id,
            after: ticket,
        });
        res.status(201).json({ success: true, data: ticket });
    }
    catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to create ticket' });
    }
}
// ─── GET ALL Tickets (Role-Scoped & Category Lanes) ─────
async function getAllTickets(req, res) {
    try {
        const { category, status, priority } = req.query;
        const userRoles = req.currentUser.roles;
        const currentUserId = req.currentUser.id;
        const where = {};
        if (category && category !== 'ALL')
            where.category = category;
        if (status && status !== 'ALL')
            where.status = status;
        if (priority && priority !== 'ALL')
            where.priority = priority;
        const canViewAll = await (0, authorize_1.userHasPermission)(userRoles, 'ticket', 'view_all');
        if (!canViewAll) {
            // Base Employee: view tickets raised by them or assigned to them
            where.OR = [
                { raisedById: currentUserId },
                { assignedToId: currentUserId },
            ];
        }
        else {
            // Support role views Customer Support lane; Admin/Manager views IT/Internal lane
            const isSupportOnly = userRoles.includes('SUPPORT') && !userRoles.includes('ADMIN') && !userRoles.includes('MANAGER');
            if (isSupportOnly && !category) {
                where.category = client_1.TicketCategory.CUSTOMER_SUPPORT;
            }
        }
        const tickets = await prisma_1.prisma.ticket.findMany({
            where,
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            include: {
                raisedBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
            },
        });
        res.json({ success: true, data: tickets, count: tickets.length });
    }
    catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
    }
}
// ─── GET Single Ticket ──────────────────────────────────
async function getTicket(req, res) {
    try {
        const id = req.params.id;
        const ticket = await prisma_1.prisma.ticket.findUnique({
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
    }
    catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
    }
}
// ─── UPDATE Ticket (Status / Assignee / Priority) ───────
async function updateTicket(req, res) {
    try {
        const id = req.params.id;
        const { status, assignedToId, priority, title, description } = req.body;
        const before = await prisma_1.prisma.ticket.findUnique({ where: { id } });
        if (!before) {
            res.status(404).json({ success: false, error: 'Ticket not found' });
            return;
        }
        const ticket = await prisma_1.prisma.ticket.update({
            where: { id },
            data: {
                ...(status && { status: status }),
                ...(assignedToId !== undefined && { assignedToId }),
                ...(priority && { priority: priority }),
                ...(title && { title }),
                ...(description && { description }),
            },
            include: {
                raisedBy: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
            },
        });
        await (0, auditLog_1.logAudit)({
            actorId: req.currentUser.id,
            action: 'UPDATE',
            targetEntity: 'Ticket',
            targetId: id,
            before,
            after: ticket,
        });
        res.json({ success: true, data: ticket });
    }
    catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to update ticket' });
    }
}
//# sourceMappingURL=ticketController.js.map