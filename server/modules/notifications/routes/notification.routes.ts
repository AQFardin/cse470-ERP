import { Router } from "express";

import {
  getNotifications,
  createNotification,
  markNotificationRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  savePushSubscription,
  getPushPublicKey,
} from "../controllers/notification.controller";

const router = Router();

router.get("/", getNotifications);
router.post("/", createNotification);
router.patch("/:id/read", markNotificationRead);

router.get(
  "/preferences/:employeeId",
  getNotificationPreferences
);

router.patch(
  "/preferences/:employeeId",
  updateNotificationPreferences
);
router.get("/push/public-key", getPushPublicKey);
router.post("/push/subscribe", savePushSubscription);

export default router;