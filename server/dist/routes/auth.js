"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
// Public (no permission needed — used for impersonation dropdown)
router.get('/users', authController_1.getAllUsers);
// Needs authentication (applied globally, so it's always there)
router.get('/me', authController_1.getCurrentUser);
// Admin only
router.get('/audit-logs', (0, authorize_1.requirePermission)('audit', 'view'), authController_1.getAuditLogs);
exports.default = router;
//# sourceMappingURL=auth.js.map