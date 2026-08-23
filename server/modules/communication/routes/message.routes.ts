import { Router } from "express";

import {
  getMessages,
  sendMessage,
  markMessageRead,
} from "../controllers/message.controller";

const router = Router();

router.get("/", getMessages);
router.post("/", sendMessage);
router.patch("/:id/read", markMessageRead);

export default router;
