import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        status
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

    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        quantity: {
          increment: change
        }
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