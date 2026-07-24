"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const prisma_1 = require("../lib/prisma");
/**
 * Authenticate middleware — reads x-current-user-id header,
 * loads User with their roles, attaches to req.currentUser.
 * No real auth — just user impersonation for development.
 */
async function authenticate(req, res, next) {
    // Skip health check
    if (req.path === '/api/health')
        return next();
    const userId = req.headers['x-current-user-id'];
    if (!userId) {
        res.status(401).json({ success: false, error: 'Missing x-current-user-id header' });
        return;
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
}
//# sourceMappingURL=authenticate.js.map