"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const prisma_1 = require("./prisma");
/**
 * Write an audit log entry. Call from any controller on create/update/delete.
 * Snapshots are stored as JSON strings.
 *
 * Usage:
 *   await logAudit({
 *     actorId: req.currentUser!.id,
 *     action: 'CREATE',
 *     targetEntity: 'Employee',
 *     targetId: employee.id,
 *     after: employee,
 *   });
 */
async function logAudit({ actorId, action, targetEntity, targetId, before, after }) {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                actorId,
                action,
                targetEntity,
                targetId,
                beforeSnapshot: before ? JSON.stringify(before) : null,
                afterSnapshot: after ? JSON.stringify(after) : null,
            },
        });
    }
    catch (error) {
        // Don't let audit log failures break the main operation
        console.error('Audit log write failed:', error);
    }
}
//# sourceMappingURL=auditLog.js.map