import { Router } from "express";

import {
  getNotifications,
  createNotification,
  markNotificationRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../controllers/notification.controller";

const router = Router();

router.get("/", getNotifications);
router.post("/", createNotification);
router.patch("/:id/read", markNotificationRead);

router.get("/preferences/:employeeId", getNotificationPreferences);
router.patch(
  "/preferences/:employeeId",
  updateNotificationPreferences
);

export default router;
