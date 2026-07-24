import { prisma } from './prisma';
import { AuditAction } from '@prisma/client';

interface AuditLogParams {
  actorId: string;
  action: AuditAction;
  targetEntity: string;
  targetId: string;
  before?: any;
  after?: any;
}

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
export async function logAudit({ actorId, action, targetEntity, targetId, before, after }: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetEntity,
        targetId,
        beforeSnapshot: before ? JSON.stringify(before) : null,
        afterSnapshot: after ? JSON.stringify(after) : null,
      },
    });
  } catch (error) {
    // Don't let audit log failures break the main operation
    console.error('Audit log write failed:', error);
  }
}
