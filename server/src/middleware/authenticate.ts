import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// Extend Express Request to carry user info
declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        name: string;
        email: string;
        employeeId: string | null;
        roles: string[]; // SystemRole values
      };
    }
  }
}

/**
 * Authenticate middleware — reads x-current-user-id header,
 * loads User with their roles, attaches to req.currentUser.
 * No real auth — just user impersonation for development.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  // Skip health check
  if (req.path === '/api/health') return next();

  const userId = (req.headers['x-current-user-id'] as string) || '52e97f56-d1f1-4dc7-afa2-34f9f7958c92';

  // Fallback applied for dev environment

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { select: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'User not found or inactive' });
      return;
    }

    req.currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      roles: user.roles.map((r) => r.role),
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
}
