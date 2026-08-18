"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const router = (0, express_1.Router)();
router.get("/", notification_controller_1.getNotifications);
router.post("/", notification_controller_1.createNotification);
router.patch("/:id/read", notification_controller_1.markNotificationRead);
router.get("/preferences/:employeeId", notification_controller_1.getNotificationPreferences);
router.patch("/preferences/:employeeId", notification_controller_1.updateNotificationPreferences);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map