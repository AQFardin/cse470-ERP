import { Router } from "express";

import {
  getMeetings,
  createMeeting,
  deleteMeeting,
} from "../controllers/meeting.controller";

const router = Router();

router.get("/", getMeetings);
router.post("/", createMeeting);
router.delete("/:id", deleteMeeting);

export default router;
