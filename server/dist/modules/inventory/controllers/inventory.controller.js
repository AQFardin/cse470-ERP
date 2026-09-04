"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performStockTake = exports.transferStock = exports.getLowStockItems = exports.deleteStockAdjustment = exports.createStockAdjustment = exports.getStockAdjustments = exports.deleteStockMovement = exports.createStockMovement = exports.getStockMovements = exports.deleteInventoryItem = exports.createInventoryItem = exports.getInventoryItems = exports.createInventory = exports.getInventory = exports.deleteWarehouse = exports.createWarehouse = exports.getWarehouses = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/* =========================================================
   HELPERS
   ========================================================= */
const getInventoryStatus = (quantity, reorderLevel) => {
    if (quantity <= 0) {
        return "OUT_OF_STOCK";
    }
    if (quantity <= reorderLevel) {
        return "LOW_STOCK";
    }
    return "IN_STOCK";
};
const isPositiveNumber = (value) => {
    return (typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0);
};
const isNonNegativeNumber = (value) => {
    return (typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0);
};
/* =========================================================
   WAREHOUSE
   ========================================================= */
const getWarehouses = async (req, res) => {
    try {
        /*
         * IMPORTANT:
         * Warehouse does NOT expose an `inventory` relation in the
         * generated Prisma client, so do not include inventory here.
         */
        const warehouses = await prisma.warehouse.findMany({
            orderBy: {
                name: "asc",
            },
        });
        res.json(warehouses);
    }
    catch (err) {
        console.error("getWarehouses:", err);
        res.status(500).json({
            error: err.message || "Failed to fetch warehouses",
        });
    }
};
exports.getWarehouses = getWarehouses;
const createWarehouse = async (req, res) => {
    try {
        const { name, location, capacity, } = req.body;
        if (!name || !location || capacity === undefined) {
            return res.status(400).json({
                error: "name, location and capacity are required",
            });
        }
        if (typeof capacity !== "number" ||
            !Number.isFinite(capacity) ||
            capacity < 0) {
            return res.status(400).json({
                error: "Capacity cannot be negative",
            });
        }
        const warehouse = await prisma.warehouse.create({
            data: {
                name,
                location,
                capacity,
            },
        });
        res.status(201).json(warehouse);
    }
    catch (err) {
        console.error("createWarehouse:", err);
        res.status(500).json({
            error: err.message || "Failed to create warehouse",
        });
    }
};
exports.createWarehouse = createWarehouse;
const deleteWarehouse = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: "Warehouse id is required",
            });
        }
        /*
         * Inventory belongs to a warehouse, so delete the dependent
         * inventory records first if they exist.
         *
         * We do this manually because Warehouse does not expose an
         * `inventory` Prisma relation in this project's generated client.
         */
        const inventories = await prisma.inventory.findMany({
            where: {
                warehouseId: id,
            },
            select: {
                id: true,
            },
        });
        await prisma.$transaction(async (tx) => {
            for (const inventory of inventories) {
                const items = await tx.inventoryItem.findMany({
                    where: {
                        inventoryId: inventory.id,
                    },
                    select: {
                        id: true,
                    },
                });
                const itemIds = items.map((item) => item.id);
                if (itemIds.length > 0) {
                    await tx.stockMovement.deleteMany({
                        where: {
                            inventoryItemId: {
                                in: itemIds,
                            },
                        },
                    });
                    await tx.stockAdjustment.deleteMany({
                        where: {
                            inventoryItemId: {
                                in: itemIds,
                            },
                        },
                    });
                    await tx.inventoryItem.deleteMany({
                        where: {
                            id: {
                                in: itemIds,
                            },
                        },
                    });
                }
                await tx.inventory.delete({
                    where: {
                        id: inventory.id,
                    },
                });
            }
            await tx.warehouse.delete({
                where: {
                    id,
                },
            });
        });
        res.status(204).send();
    }
    catch (err) {
        console.error("deleteWarehouse:", err);
        res.status(500).json({
            error: err.message || "Failed to delete warehouse",
        });
    }
};
exports.deleteWarehouse = deleteWarehouse;
/* =========================================================
   INVENTORY
   ========================================================= */
const getInventory = async (req, res) => {
    try {
        const inventory = await prisma.inventory.findMany({
            include: {
                warehouse: true,
                items: {
                    include: {
                        variant: true,
                    },
                },
            },
        });
        res.json(inventory);
    }
    catch (err) {
        console.error("getInventory:", err);
        res.status(500).json({
            error: err.message || "Failed to fetch inventory",
        });
    }
};
exports.getInventory = getInventory;
const createInventory = async (req, res) => {
    try {
        const { warehouseId } = req.body;
        if (!warehouseId) {
            return res.status(400).json({
                error: "warehouseId is required",
            });
        }
        const warehouse = await prisma.warehouse.findUnique({
            where: {
                id: warehouseId,
            },
        });
        if (!warehouse) {
            return res.status(404).json({
                error: "Warehouse not found",
            });
        }
        const existingInventory = await prisma.inventory.findFirst({
            where: {
                warehouseId,
            },
        });
        if (existingInventory) {
            return res.status(200).json(existingInventory);
        }
        const inventory = await prisma.inventory.create({
            data: {
                warehouseId,
            },
        });
        res.status(201).json(inventory);
    }
    catch (err) {
        console.error("createInventory:", err);
        res.status(500).json({
            error: err.message || "Failed to create inventory",
        });
    }
};
exports.createInventory = createInventory;
/* =========================================================
   INVENTORY ITEM
   ========================================================= */
const getInventoryItems = async (req, res) => {
    try {
        const items = await prisma.inventoryItem.findMany({
            include: {
                inventory: true,
                variant: true,
            },
            orderBy: {
                id: "asc",
            },
        });
        res.json(items);
    }
    catch (err) {
        console.error("getInventoryItems:", err);
        res.status(500).json({
            error: err.message || "Failed to fetch inventory items",
        });
    }
};
exports.getInventoryItems = getInventoryItems;
const createInventoryItem = async (req, res) => {
    try {
        const { inventoryId, variantId, quantity, reorderLevel, } = req.body;
        if (!inventoryId || !variantId) {
            return res.status(400).json({
                error: "inventoryId and variantId are required",
            });
        }
        if (!isNonNegativeNumber(quantity)) {
            return res.status(400).json({
                error: "Quantity cannot be negative",
            });
        }
        if (!isNonNegativeNumber(reorderLevel)) {
            return res.status(400).json({
                error: "Reorder level cannot be negative",
            });
        }
        const inventory = await prisma.inventory.findUnique({
            where: {
                id: inventoryId,
            },
        });
        if (!inventory) {
            return res.status(404).json({
                error: "Inventory not found",
            });
        }
        /*
         * Prevent the Prisma unique constraint error that you were
         * getting when trying to add the same product/variant to the
         * same inventory twice.
         */
        const existingItem = await prisma.inventoryItem.findFirst({
            where: {
                inventoryId,
                variantId,
            },
        });
        if (existingItem) {
            return res.status(409).json({
                error: "This product variant already exists in this warehouse.",
            });
        }
        const item = await prisma.inventoryItem.create({
            data: {
                inventoryId,
                variantId,
                quantity,
                reorderLevel,
                status: getInventoryStatus(quantity, reorderLevel),
            },
            include: {
                inventory: true,
                variant: true,
            },
        });
        res.status(201).json(item);
    }
    catch (err) {
        console.error("createInventoryItem:", err);
        /*
         * Prisma unique constraint fallback.
         */
        if (err?.code === "P2002") {
            return res.status(409).json({
                error: "This product variant already exists in this warehouse.",
            });
        }
        res.status(500).json({
            error: err.message || "Failed to create inventory item",
        });
    }
};
exports.createInventoryItem = createInventoryItem;
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: "Inventory item id is required",
            });
        }
        const item = await prisma.inventoryItem.findUnique({
            where: {
                id,
            },
        });
        if (!item) {
            return res.status(404).json({
                error: "Inventory item not found",
            });
        }
        /*
         * Delete dependent movement/adjustment records first.
         * This fixes the "Failed to delete inventory item" error
         * caused by foreign-key constraints.
         */
        await prisma.$transaction(async (tx) => {
            await tx.stockMovement.deleteMany({
                where: {
                    inventoryItemId: id,
                },
            });
            await tx.stockAdjustment.deleteMany({
                where: {
                    inventoryItemId: id,
                },
            });
            await tx.inventoryItem.delete({
                where: {
                    id,
                },
            });
        });
        res.status(204).send();
    }
    catch (err) {
        console.error("deleteInventoryItem:", err);
        if (err?.code === "P2025") {
            return res.status(404).json({
                error: "Inventory item not found",
            });
        }
        res.status(500).json({
            error: err.message || "Failed to delete inventory item",
        });
    }
};
exports.deleteInventoryItem = deleteInventoryItem;
/* =========================================================
   STOCK MOVEMENT
   ========================================================= */
const getStockMovements = async (req, res) => {
    try {
        /*
         * StockMovement does NOT expose an inventoryItem relation
         * in this project's generated Prisma client.
         *
         * Therefore we fetch the movement rows directly.
         */
        const movements = await prisma.stockMovement.findMany({
            orderBy: {
                date: "desc",
            },
        });
        res.json(movements);
    }
    catch (err) {
        console.error("getStockMovements:", err);
        res.status(500).json({
            error: err.message || "Failed to fetch stock movements",
        });
    }
};
exports.getStockMovements = getStockMovements;
const createStockMovement = async (req, res) => {
    try {
        const { inventoryItemId, type, quantity, } = req.body;
        if (!inventoryItemId || !type || quantity === undefined) {
            return res.status(400).json({
                error: "inventoryItemId, type and quantity are required",
            });
        }
        if (!isPositiveNumber(quantity)) {
            return res.status(400).json({
                error: "Quantity must be greater than 0.",
            });
        }
        const normalizedType = String(type).toUpperCase();
        if (normalizedType !== "IN" &&
            normalizedType !== "OUT") {
            return res.status(400).json({
                error: 'Movement type must be "IN" or "OUT".',
            });
        }
        const item = await prisma.inventoryItem.findUnique({
            where: {
                id: inventoryItemId,
            },
        });
        if (!item) {
            return res.status(404).json({
                error: "Inventory item not found",
            });
        }
        if (normalizedType === "OUT" &&
            item.quantity < quantity) {
            return res.status(400).json({
                error: `Not enough stock. Available: ${item.quantity}`,
            });
        }
        const change = normalizedType === "IN"
            ? quantity
            : -quantity;
        const newQuantity = item.quantity + change;
        const result = await prisma.$transaction(async (tx) => {
            const movement = await tx.stockMovement.create({
                data: {
                    inventoryItemId,
                    type: normalizedType,
                    quantity,
                },
            });
            const updatedItem = await tx.inventoryItem.update({
                where: {
                    id: inventoryItemId,
                },
                data: {
                    quantity: newQuantity,
                    status: getInventoryStatus(newQuantity, item.reorderLevel),
                },
            });
            return {
                movement,
                item: updatedItem,
            };
        });
        res.status(201).json(result);
    }
    catch (err) {
        console.error("createStockMovement:", err);
        res.status(500).json({
            error: err.message || "Failed to create stock movement",
        });
    }
};
exports.createStockMovement = createStockMovement;
const deleteStockMovement = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: "Stock movement id is required",
            });
        }
        const movement = await prisma.stockMovement.findUnique({
            where: {
                id,
            },
        });
        if (!movement) {
            return res.status(404).json({
                error: "Stock movement not found",
            });
        }
        /*
         * Reversing a movement when deleting it keeps inventory
         * consistent.
         */
        const item = await prisma.inventoryItem.findUnique({
            where: {
                id: movement.inventoryItemId,
            },
        });
        if (!item) {
            return res.status(404).json({
                error: "Related inventory item not found",
            });
        }
        const type = String(movement.type).toUpperCase();
        let restoredQuantity;
        if (type === "IN") {
            restoredQuantity =
                item.quantity - movement.quantity;
        }
        else if (type === "OUT") {
            restoredQuantity =
                item.quantity + movement.quantity;
        }
        else {
            return res.status(400).json({
                error: "Invalid stock movement type",
            });
        }
        if (restoredQuantity < 0) {
            return res.status(400).json({
                error: "Cannot delete this movement because reversing it would make inventory negative.",
            });
        }
        await prisma.$transaction(async (tx) => {
            await tx.inventoryItem.update({
                where: {
                    id: item.id,
                },
                data: {
                    quantity: restoredQuantity,
                    status: getInventoryStatus(restoredQuantity, item.reorderLevel),
                },
            });
            await tx.stockMovement.delete({
                where: {
                    id,
                },
            });
        });
        res.status(204).send();
    }
    catch (err) {
        console.error("deleteStockMovement:", err);
        res.status(500).json({
            error: err.message || "Failed to delete stock movement",
        });
    }
};
exports.deleteStockMovement = deleteStockMovement;
/* =========================================================
   STOCK ADJUSTMENT
   ========================================================= */
const getStockAdjustments = async (req, res) => {
    try {
        /*
         * StockAdjustment does NOT expose an inventoryItem
         * relation in the generated Prisma client.
         *
         * Employee relation is available, so keep that one.
         */
        const adjustments = await prisma.stockAdjustment.findMany({
            include: {
                employee: true,
            },
            orderBy: {
                adjustmentDate: "desc",
            },
        });
        res.json(adjustments);
    }
    catch (err) {
        console.error("getStockAdjustments:", err);
        res.status(500).json({
            error: err.message || "Failed to fetch stock adjustments",
        });
    }
};
exports.getStockAdjustments = getStockAdjustments;
const createStockAdjustment = async (req, res) => {
    try {
        const { inventoryItemId, employeeId, reason, changedQuantity, } = req.body;
        if (!inventoryItemId ||
            !employeeId ||
            changedQuantity === undefined) {
            return res.status(400).json({
                error: "inventoryItemId, employeeId and changedQuantity are required",
            });
        }
        if (typeof changedQuantity !== "number" ||
            !Number.isFinite(changedQuantity)) {
            return res.status(400).json({
                error: "changedQuantity must be a valid number",
            });
        }
        const item = await prisma.inventoryItem.findUnique({
            where: {
                id: inventoryItemId,
            },
        });
        if (!item) {
            return res.status(404).json({
                error: "Inventory item not found",
            });
        }
        const newQuantity = item.quantity + changedQuantity;
        if (newQuantity < 0) {
            return res.status(400).json({
                error: "Quantity cannot be negative.",
            });
        }
        const result = await prisma.$transaction(async (tx) => {
            const adjustment = await tx.stockAdjustment.create({
                data: {
                    inventoryItemId,
                    employeeId,
                    reason: reason || "Stock adjustment",
                    changedQuantity,
                },
            });
            const updatedItem = await tx.inventoryItem.update({
                where: {
                    id: inventoryItemId,
                },
                data: {
                    quantity: newQuantity,
                    status: getInventoryStatus(newQuantity, item.reorderLevel),
                },
            });
            return {
                adjustment,
                item: updatedItem,
            };
        });
        res.status(201).json(result);
    }
    catch (err) {
        console.error("createStockAdjustment:", err);
        res.status(500).json({
            error: err.message || "Failed to create stock adjustment",
        });
    }
};
exports.createStockAdjustment = createStockAdjustment;
const deleteStockAdjustment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: "Stock adjustment id is required",
            });
        }
        const adjustment = await prisma.stockAdjustment.findUnique({
            where: {
                id,
            },
        });
        if (!adjustment) {
            return res.status(404).json({
                error: "Stock adjustment not found",
            });
        }
        const item = await prisma.inventoryItem.findUnique({
            where: {
                id: adjustment.inventoryItemId,
            },
        });
        if (!item) {
            return res.status(404).json({
                error: "Related inventory item not found",
            });
        }
        const restoredQuantity = item.quantity - adjustment.changedQuantity;
        if (restoredQuantity < 0) {
            return res.status(400).json({
                error: "Cannot delete this adjustment because reversing it would make inventory negative.",
            });
        }
        await prisma.$transaction(async (tx) => {
            await tx.inventoryItem.update({
                where: {
                    id: item.id,
                },
                data: {
                    quantity: restoredQuantity,
                    status: getInventoryStatus(restoredQuantity, item.reorderLevel),
                },
            });
            await tx.stockAdjustment.delete({
                where: {
                    id,
                },
            });
        });
        res.status(204).send();
    }
    catch (err) {
        console.error("deleteStockAdjustment:", err);
        res.status(500).json({
            error: err.message || "Failed to delete stock adjustment",
        });
    }
};
exports.deleteStockAdjustment = deleteStockAdjustment;
/* =========================================================
   LOW STOCK
   ========================================================= */
const getLowStockItems = async (req, res) => {
    try {
        const items = await prisma.inventoryItem.findMany({
            include: {
                inventory: true,
                variant: true,
            },
        });
        const lowStockItems = items.filter((item) => item.quantity <= item.reorderLevel);
        res.json(lowStockItems);
    }
    catch (err) {
        console.error("getLowStockItems:", err);
        res.status(500).json({
            error: err.message || "Failed to fetch low stock items",
        });
    }
};
exports.getLowStockItems = getLowStockItems;
/* =========================================================
   STOCK TRANSFER
   ========================================================= */
const transferStock = async (req, res) => {
    try {
        const { sourceInventoryItemId, destinationInventoryItemId, quantity, } = req.body;
        if (!sourceInventoryItemId ||
            !destinationInventoryItemId ||
            quantity === undefined) {
            return res.status(400).json({
                error: "sourceInventoryItemId, destinationInventoryItemId and quantity are required",
            });
        }
        if (!isPositiveNumber(quantity)) {
            return res.status(400).json({
                error: "Quantity must be greater than 0.",
            });
        }
        if (sourceInventoryItemId ===
            destinationInventoryItemId) {
            return res.status(400).json({
                error: "Source and destination must be different inventory items.",
            });
        }
        const sourceItem = await prisma.inventoryItem.findUnique({
            where: {
                id: sourceInventoryItemId,
            },
            include: {
                inventory: true,
                variant: true,
            },
        });
        const destinationItem = await prisma.inventoryItem.findUnique({
            where: {
                id: destinationInventoryItemId,
            },
            include: {
                inventory: true,
                variant: true,
            },
        });
        if (!sourceItem || !destinationItem) {
            return res.status(404).json({
                error: "Source or destination inventory item not found",
            });
        }
        if (sourceItem.quantity < quantity) {
            return res.status(400).json({
                error: `Not enough stock. Available: ${sourceItem.quantity}`,
            });
        }
        if (sourceItem.variantId !==
            destinationItem.variantId) {
            return res.status(400).json({
                error: "Source and destination items must use the same product variant",
            });
        }
        if (sourceItem.inventoryId ===
            destinationItem.inventoryId) {
            return res.status(400).json({
                error: "Source and destination must be different warehouses",
            });
        }
        const result = await prisma.$transaction(async (tx) => {
            const updatedSourceQuantity = sourceItem.quantity - quantity;
            const updatedDestinationQuantity = destinationItem.quantity + quantity;
            const updatedSource = await tx.inventoryItem.update({
                where: {
                    id: sourceInventoryItemId,
                },
                data: {
                    quantity: updatedSourceQuantity,
                    status: getInventoryStatus(updatedSourceQuantity, sourceItem.reorderLevel),
                },
            });
            const updatedDestination = await tx.inventoryItem.update({
                where: {
                    id: destinationInventoryItemId,
                },
                data: {
                    quantity: updatedDestinationQuantity,
                    status: getInventoryStatus(updatedDestinationQuantity, destinationItem.reorderLevel),
                },
            });
            await tx.stockMovement.create({
                data: {
                    inventoryItemId: sourceInventoryItemId,
                    type: "OUT",
                    quantity,
                },
            });
            await tx.stockMovement.create({
                data: {
                    inventoryItemId: destinationInventoryItemId,
                    type: "IN",
                    quantity,
                },
            });
            return {
                source: updatedSource,
                destination: updatedDestination,
            };
        });
        res.status(201).json(result);
    }
    catch (err) {
        console.error("transferStock:", err);
        res.status(500).json({
            error: err.message || "Failed to transfer stock",
        });
    }
};
exports.transferStock = transferStock;
/* =========================================================
   STOCK TAKE
   ========================================================= */
const performStockTake = async (req, res) => {
    try {
        const { inventoryItemId, countedQuantity, employeeId, reason, } = req.body;
        if (!inventoryItemId ||
            countedQuantity === undefined ||
            !employeeId) {
            return res.status(400).json({
                error: "inventoryItemId, countedQuantity and employeeId are required",
            });
        }
        if (!isNonNegativeNumber(countedQuantity)) {
            return res.status(400).json({
                error: "Counted quantity cannot be negative.",
            });
        }
        const item = await prisma.inventoryItem.findUnique({
            where: {
                id: inventoryItemId,
            },
        });
        if (!item) {
            return res.status(404).json({
                error: "Inventory item not found",
            });
        }
        const changedQuantity = countedQuantity - item.quantity;
        const result = await prisma.$transaction(async (tx) => {
            const updatedItem = await tx.inventoryItem.update({
                where: {
                    id: inventoryItemId,
                },
                data: {
                    quantity: countedQuantity,
                    status: getInventoryStatus(countedQuantity, item.reorderLevel),
                },
            });
            const adjustment = await tx.stockAdjustment.create({
                data: {
                    inventoryItemId,
                    employeeId,
                    reason: reason || "Stock take",
                    changedQuantity,
                },
            });
            return {
                item: updatedItem,
                adjustment,
            };
        });
        res.status(201).json(result);
    }
    catch (err) {
        console.error("performStockTake:", err);
        res.status(500).json({
            error: err.message || "Failed to perform stock take",
        });
    }
};
exports.performStockTake = performStockTake;
//# sourceMappingURL=inventory.controller.js.map