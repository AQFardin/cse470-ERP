import { Request, Response, NextFunction } from 'express';
/**
 * requirePermission(module, action) — Express middleware factory.
 *
 * Checks if the current user's roles grant the requested module.action permission.
 * Employee is a base role — every user inherits Employee permissions automatically
 * (this is handled by the UserRole table: every user has EMPLOYEE role assigned).
 *
 * Usage:
 *   router.post('/', requirePermission('employee_records', 'create'), createEmployee);
 */
export declare function requirePermission(module: string, action: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Helper: check if user has a specific permission (non-middleware, returns boolean).
 * Useful inside controllers for conditional logic.
 */
export declare function userHasPermission(userRoles: string[], module: string, action: string): Promise<boolean>;
//# sourceMappingURL=authorize.d.ts.map