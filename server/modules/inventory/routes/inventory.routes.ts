import { Router } from "express";

import {
  getWarehouses,
  createWarehouse,
  deleteWarehouse,
  getInventory,
  createInventory,
  getInventoryItems,
  createInventoryItem,
  deleteInventoryItem,
  getStockMovements,
  createStockMovement,
  deleteStockMovement,
  getStockAdjustments,
  createStockAdjustment,
  deleteStockAdjustment,
  getLowStockItems,
  transferStock,
  performStockTake,
} from "../controllers/inventory.controller";

const router = Router();

// ===================== WAREHOUSES =====================

router.get("/warehouses", getWarehouses);
router.post("/warehouses", createWarehouse);
router.delete("/warehouses/:id", deleteWarehouse);

// ===================== INVENTORY =====================

router.get("/", getInventory);
router.post("/", createInventory);

// ===================== INVENTORY ITEMS =====================

router.get("/inventory-items", getInventoryItems);
router.post("/inventory-items", createInventoryItem);
router.delete("/inventory-items/:id", deleteInventoryItem);

// ===================== STOCK MOVEMENTS =====================

router.get("/stock-movements", getStockMovements);
router.post("/stock-movements", createStockMovement);
router.delete("/stock-movements/:id", deleteStockMovement);
// ===================== LOW STOCK =====================

router.get("/low-stock", getLowStockItems);
// ===================== STOCK TRANSFER =====================

router.post("/stock-transfers", transferStock);

// ===================== STOCK TAKE =====================

router.post("/stock-take", performStockTake);
export default router;
// ===================== STOCK ADJUSTMENTS =====================

router.get("/stock-adjustments", getStockAdjustments);
router.post("/stock-adjustments", createStockAdjustment);
router.delete("/stock-adjustments/:id", deleteStockAdjustment);
