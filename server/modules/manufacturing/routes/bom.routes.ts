import { Router } from "express";

import {
  getBOMs,
  createBOM,
  createBOMVersion,
} from "../controllers/bom.controller";

const router = Router();

router.get("/", getBOMs);
router.post("/", createBOM);
router.post("/:id/versions", createBOMVersion);

export default router;
