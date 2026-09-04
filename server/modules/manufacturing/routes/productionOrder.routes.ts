import { Router } from "express";

import {
  getProductionOrders,
  createProductionOrder,
  startProductionOrder,
  completeProductionOrder,
  cancelProductionOrder,
} from "../controllers/productionOrder.controller";

const router = Router();

router.get("/", getProductionOrders);
router.post("/", createProductionOrder);
router.post("/:id/start", startProductionOrder);
router.post("/:id/complete", completeProductionOrder);
router.post("/:id/cancel", cancelProductionOrder);

export default router;