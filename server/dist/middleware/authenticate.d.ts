import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            currentUser?: {
                id: string;
                name: string;
                email: string;
                employeeId: string | null;
                roles: string[];
            };
        }
    }
}
/**
 * Authenticate middleware — reads x-current-user-id header,
 * loads User with their roles, attaches to req.currentUser.
 * No real auth — just user impersonation for development.
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=authenticate.d.ts.map