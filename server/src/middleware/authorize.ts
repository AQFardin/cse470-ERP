import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

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
export function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { roles } = req.currentUser;

    try {
      // Check if ANY of the user's roles has the required permission
      const match = await prisma.rolePermission.findFirst({
        where: {
          role: { in: roles as any[] },
          permission: {
            module,
            action,
          },
        },
      });

      if (!match) {
        res.status(403).json({
          success: false,
          error: `Forbidden: you need '${module}.${action}' permission`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ success: false, error: 'Authorization check failed' });
    }
  };
}

/**
 * Helper: check if user has a specific permission (non-middleware, returns boolean).
 * Useful inside controllers for conditional logic.
 */
export async function userHasPermission(
  userRoles: string[],
  module: string,
  action: string
): Promise<boolean> {
  const match = await prisma.rolePermission.findFirst({
    where: {
      role: { in: userRoles as any[] },
      permission: { module, action },
    },
  });
  return !!match;
}
