"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventory_controller_1 = require("../controllers/inventory.controller");
const router = (0, express_1.Router)();
// ===================== WAREHOUSES =====================
router.get("/warehouses", inventory_controller_1.getWarehouses);
router.post("/warehouses", inventory_controller_1.createWarehouse);
router.delete("/warehouses/:id", inventory_controller_1.deleteWarehouse);
// ===================== INVENTORY =====================
router.get("/inventory", inventory_controller_1.getInventory);
router.post("/inventory", inventory_controller_1.createInventory);
// ===================== INVENTORY ITEMS =====================
router.get("/inventory-items", inventory_controller_1.getInventoryItems);
router.post("/inventory-items", inventory_controller_1.createInventoryItem);
router.delete("/inventory-items/:id", inventory_controller_1.deleteInventoryItem);
// ===================== STOCK MOVEMENTS =====================
router.get("/stock-movements", inventory_controller_1.getStockMovements);
router.post("/stock-movements", inventory_controller_1.createStockMovement);
router.delete("/stock-movements/:id", inventory_controller_1.deleteStockMovement);
// ===================== LOW STOCK =====================
router.get("/low-stock", inventory_controller_1.getLowStockItems);
// ===================== STOCK TRANSFER =====================
router.post("/stock-transfers", inventory_controller_1.transferStock);
// ===================== STOCK TAKE =====================
router.post("/stock-take", inventory_controller_1.performStockTake);
exports.default = router;
// ===================== STOCK ADJUSTMENTS =====================
router.get("/stock-adjustments", inventory_controller_1.getStockAdjustments);
router.post("/stock-adjustments", inventory_controller_1.createStockAdjustment);
router.delete("/stock-adjustments/:id", inventory_controller_1.deleteStockAdjustment);
//# sourceMappingURL=inventory.routes.js.map