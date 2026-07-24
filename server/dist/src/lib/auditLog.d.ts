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
export declare function logAudit({ actorId, action, targetEntity, targetId, before, after }: AuditLogParams): Promise<void>;
export {};
//# sourceMappingURL=auditLog.d.ts.map