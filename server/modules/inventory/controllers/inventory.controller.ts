import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const getInventoryStatus = (quantity: number, reorderLevel: number) => {
  if (quantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (quantity <= reorderLevel) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
};

// ===================== WAREHOUSE =====================

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventory: true
      }
    });

    res.json(warehouses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const { name, location, capacity } = req.body as {
      name: string;
      location: string;
      capacity: number;
    };

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        location,
        capacity
      }
    });

    res.status(201).json(warehouse);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    await prisma.warehouse.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== INVENTORY =====================

export const getInventory = async (req: Request, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        warehouse: true,
        items: {
          include: {
            variant: true
          }
        }
      }
    });

    res.json(inventory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createInventory = async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.body;

    const inventory = await prisma.inventory.create({
      data: {
        warehouseId
      }
    });

    res.status(201).json(inventory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== INVENTORY ITEM =====================

export const getInventoryItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      include: {
        inventory: true,
        variant: true
      }
    });

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const {
      inventoryId,
      variantId,
      quantity,
      reorderLevel,
      status
    } = req.body;

    const item = await prisma.inventoryItem.create({
  data: {
    inventoryId,
    variantId,
    quantity,
    reorderLevel,
    status: getInventoryStatus(quantity, reorderLevel)
  }
});

    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    await prisma.inventoryItem.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
// ===================== STOCK MOVEMENT =====================

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        inventoryItem: true
      }
    });

    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteStockMovement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    await prisma.stockMovement.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
// ===================== STOCK ADJUSTMENT =====================

export const getStockAdjustments = async (req: Request, res: Response) => {
  try {
    const adjustments = await prisma.stockAdjustment.findMany({
      include: {
        inventoryItem: true,
        employee: true
      }
    });

    res.json(adjustments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
export const createStockAdjustment = async (req: Request, res: Response) => {
  try {
    const {
      inventoryItemId,
      employeeId,
      reason,
      changedQuantity
    } = req.body;

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        inventoryItemId,
        employeeId,
        reason,
        changedQuantity
      }
    });

    // Apply the adjustment to the inventory quantity
    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        quantity: {
          increment: changedQuantity
        }
      }
    });

    res.status(201).json(adjustment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
  
export const createStockMovement = async (req: Request, res: Response) => {
  try {
    const {
      inventoryItemId,
      type,
      quantity,
    } = req.body;

    const movement = await prisma.stockMovement.create({
      data: {
        inventoryItemId,
        type,
        quantity
      }
    });

    // Update inventory quantity
    const change = type === "IN" ? quantity : -quantity;

    const item = await prisma.inventoryItem.findUnique({
  where: { id: inventoryItemId }
});

if (!item) {
  return res.status(404).json({
    error: "Inventory item not found"
  });
}

const newQuantity = item.quantity + change;

if (newQuantity < 0) {
  return res.status(400).json({
    error: "Insufficient stock"
  });
}

await prisma.inventoryItem.update({
  where: { id: inventoryItemId },
  data: {
    quantity: newQuantity,
    status: getInventoryStatus(
      newQuantity,
      item.reorderLevel
    )
  }
});

    res.status(201).json(movement);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteStockAdjustment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    await prisma.stockAdjustment.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
// ===================== LOW STOCK =====================

export const getLowStockItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      include: {
        inventory: true,
        variant: true
      }
    });

    const lowStockItems = items.filter(
      item => item.quantity <= item.reorderLevel
    );

    res.json(lowStockItems);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
// ===================== STOCK TRANSFER =====================

export const transferStock = async (req: Request, res: Response) => {
  try {
    const {
      sourceInventoryItemId,
      destinationInventoryItemId,
      quantity
    } = req.body;

    if (!sourceInventoryItemId || !destinationInventoryItemId || !quantity) {
      return res.status(400).json({
        error: "sourceInventoryItemId, destinationInventoryItemId and quantity are required"
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: "Quantity must be greater than 0"
      });
    }

    const sourceItem = await prisma.inventoryItem.findUnique({
      where: { id: sourceInventoryItemId },
      include: {
        inventory: true,
        variant: true
      }
    });

    const destinationItem = await prisma.inventoryItem.findUnique({
      where: { id: destinationInventoryItemId },
      include: {
        inventory: true,
        variant: true
      }
    });

    if (!sourceItem || !destinationItem) {
      return res.status(404).json({
        error: "Source or destination inventory item not found"
      });
    }

    if (sourceItem.quantity < quantity) {
      return res.status(400).json({
        error: "Insufficient stock"
      });
    }

    if (sourceItem.variantId !== destinationItem.variantId) {
      return res.status(400).json({
        error: "Source and destination items must use the same product variant"
      });
    }

    if (sourceItem.inventoryId === destinationItem.inventoryId) {
      return res.status(400).json({
        error: "Source and destination must be different warehouses"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedSourceQuantity = sourceItem.quantity - quantity;

const updatedSource = await tx.inventoryItem.update({
  where: { id: sourceInventoryItemId },
  data: {
    quantity: updatedSourceQuantity,
    status: getInventoryStatus(
      updatedSourceQuantity,
      sourceItem.reorderLevel
    )
  }
});

      const updatedDestinationQuantity = destinationItem.quantity + quantity;

const updatedDestination = await tx.inventoryItem.update({
  where: { id: destinationInventoryItemId },
  data: {
    quantity: updatedDestinationQuantity,
    status: getInventoryStatus(
      updatedDestinationQuantity,
      destinationItem.reorderLevel
    )
  }
});

      await tx.stockMovement.create({
        data: {
          inventoryItemId: sourceInventoryItemId,
          type: "OUT",
          quantity
        }
      });

      await tx.stockMovement.create({
        data: {
          inventoryItemId: destinationInventoryItemId,
          type: "IN",
          quantity
        }
      });

      return {
        source: updatedSource,
        destination: updatedDestination
      };
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
// ===================== STOCK TAKE =====================

export const performStockTake = async (req: Request, res: Response) => {
  try {
    const {
      inventoryItemId,
      countedQuantity,
      employeeId,
      reason
    } = req.body;

    if (
      !inventoryItemId ||
      countedQuantity === undefined ||
      !employeeId
    ) {
      return res.status(400).json({
        error: "inventoryItemId, countedQuantity and employeeId are required"
      });
    }

    if (countedQuantity < 0) {
      return res.status(400).json({
        error: "Counted quantity cannot be negative"
      });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId }
    });

    if (!item) {
      return res.status(404).json({
        error: "Inventory item not found"
      });
    }

    const changedQuantity = countedQuantity - item.quantity;

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
  where: { id: inventoryItemId },
  data: {
    quantity: countedQuantity,
    status: getInventoryStatus(
      countedQuantity,
      item.reorderLevel
    )
  }
});

      const adjustment = await tx.stockAdjustment.create({
        data: {
          inventoryItemId,
          employeeId,
          reason: reason || "Stock take",
          changedQuantity
        }
      });

      return {
        item: updatedItem,
        adjustment
      };
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};