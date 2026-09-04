import { Router } from 'express';
import { getAllUsers, getCurrentUser, getAuditLogs } from '../controllers/authController';
import { requirePermission } from '../middleware/authorize';

const router = Router();

// Public (no permission needed — used for impersonation dropdown)
router.get('/users', getAllUsers);

// Needs authentication (applied globally, so it's always there)
router.get('/me', getCurrentUser);

// Admin only
router.get('/audit-logs', requirePermission('audit', 'view'), getAuditLogs);

export default router;
