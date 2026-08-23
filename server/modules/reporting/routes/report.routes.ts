import { Router } from "express";
import {
  getReport,
  exportReport,
} from "../controllers/report.controller";

const router = Router();

router.get("/:module", getReport);
router.get("/:module/export", exportReport);

export default router;