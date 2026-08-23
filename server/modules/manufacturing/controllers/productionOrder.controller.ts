import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getProductionOrders(
  _req: Request,
  res: Response
) {
  try {
    const orders =
      await prisma.productionOrder.findMany({
        include: {
          warehouse: true,
          finishedVariant: {
            include: {
              product: true,
            },
          },
          bomVersion: {
            include: {
              bom: true,
              items: {
                include: {
                  componentVariant: {
                    include: {
                      product: true,
                    },
                  },
                },
              },
            },
          },
          items: {
            include: {
              componentVariant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json(orders);
  } catch (error) {
    console.error(
      "Get production orders error:",
      error
    );

    return res.status(500).json({
      error: "Failed to fetch production orders",
    });
  }
}

export async function createProductionOrder(
  req: Request,
  res: Response
) {
  try {
    const {
      orderNumber,
      bomVersionId,
      warehouseId,
      quantity,
    } = req.body;

    const productionQuantity = Number(quantity);

    if (
      !bomVersionId ||
      !warehouseId ||
      !Number.isInteger(productionQuantity) ||
      productionQuantity <= 0
    ) {
      return res.status(400).json({
        error:
          "bomVersionId, warehouseId and a positive integer quantity are required",
      });
    }

    const bomVersion =
      await prisma.bOMVersion.findUnique({
        where: {
          id: bomVersionId,
        },
        include: {
          bom: true,
          items: true,
        },
      });

    if (!bomVersion) {
      return res.status(404).json({
        error: "BOM version not found",
      });
    }

    const warehouse =
      await prisma.warehouse.findUnique({
        where: {
          id: warehouseId,
        },
      });

    if (!warehouse) {
      return res.status(404).json({
        error: "Warehouse not found",
      });
    }

    const finishedVariant =
      await prisma.productVariant.findUnique({
        where: {
          id: bomVersion.bom.finishedVariantId,
        },
      });

    if (!finishedVariant) {
      return res.status(404).json({
        error: "Finished product variant not found",
      });
    }

    const generatedOrderNumber =
      orderNumber?.trim() ||
      `PO-${Date.now()}`;

    const existingOrder =
      await prisma.productionOrder.findUnique({
        where: {
          orderNumber: generatedOrderNumber,
        },
      });

    if (existingOrder) {
      return res.status(409).json({
        error: "Production order number already exists",
      });
    }

    const order =
      await prisma.productionOrder.create({
        data: {
          orderNumber: generatedOrderNumber,
          bomVersionId,
          finishedVariantId:
            bomVersion.bom.finishedVariantId,
          warehouseId,
          quantity: productionQuantity,
          status: "PLANNED",

          items: {
            create: bomVersion.items.map(
              (bomItem) => ({
                componentVariantId:
                  bomItem.componentVariantId,
                requiredQuantity:
                  bomItem.quantity *
                  productionQuantity,
                consumedQuantity: 0,
              })
            ),
          },
        },

        include: {
          warehouse: true,
          finishedVariant: {
            include: {
              product: true,
            },
          },
          bomVersion: {
            include: {
              bom: true,
            },
          },
          items: {
            include: {
              componentVariant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

    return res.status(201).json(order);
  } catch (error) {
    console.error(
      "Create production order error:",
      error
    );

    return res.status(500).json({
      error: "Failed to create production order",
    });
  }
}

export async function startProductionOrder(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    const order =
      await prisma.productionOrder.findUnique({
        where: { id },
      });

    if (!order) {
      return res.status(404).json({
        error: "Production order not found",
      });
    }

    if (order.status !== "PLANNED") {
      return res.status(400).json({
        error:
          "Only planned production orders can be started",
      });
    }

    const updated =
      await prisma.productionOrder.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
        },
      });

    return res.json(updated);
  } catch (error) {
    console.error(
      "Start production order error:",
      error
    );

    return res.status(500).json({
      error: "Failed to start production order",
    });
  }
}

export async function completeProductionOrder(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    const order =
      await prisma.productionOrder.findUnique({
        where: { id },
        include: {
          warehouse: true,
          finishedVariant: true,
          items: true,
        },
      });

    if (!order) {
      return res.status(404).json({
        error: "Production order not found",
      });
    }

    if (order.status !== "IN_PROGRESS") {
      return res.status(400).json({
        error:
          "Only in-progress production orders can be completed",
      });
    }

    const result =
      await prisma.$transaction(async (tx) => {
        /*
         * Find every component in the production
         * warehouse and verify enough stock exists.
         */
        const inventoryItems = [];

        for (const orderItem of order.items) {
          const inventoryItem =
            await tx.inventoryItem.findFirst({
              where: {
                inventory: {
                  warehouseId:
                    order.warehouseId,
                },
                variantId:
                  orderItem.componentVariantId,
              },
            });

          if (!inventoryItem) {
            throw new Error(
              `No inventory item found for component ${orderItem.componentVariantId}`
            );
          }

          if (
            inventoryItem.quantity <
            orderItem.requiredQuantity
          ) {
            throw new Error(
              `Not enough stock for component ${orderItem.componentVariantId}. Available: ${inventoryItem.quantity}, required: ${orderItem.requiredQuantity}`
            );
          }

          inventoryItems.push({
            orderItem,
            inventoryItem,
          });
        }

        /*
         * Consume all components.
         */
        for (const {
          orderItem,
          inventoryItem,
        } of inventoryItems) {
          const newQuantity =
            inventoryItem.quantity -
            orderItem.requiredQuantity;

          await tx.inventoryItem.update({
            where: {
              id: inventoryItem.id,
            },
            data: {
              quantity: newQuantity,
              status:
                newQuantity <=
                inventoryItem.reorderLevel
                  ? "LOW_STOCK"
                  : "IN_STOCK",
            },
          });

          await tx.stockMovement.create({
            data: {
              inventoryItemId:
                inventoryItem.id,
              type: "OUT",
              quantity:
                orderItem.requiredQuantity,
            },
          });

          await tx.productionOrderItem.update({
            where: {
              id: orderItem.id,
            },
            data: {
              consumedQuantity:
                orderItem.requiredQuantity,
            },
          });
        }

        /*
         * Add the finished product to the
         * same warehouse.
         */
        let finishedInventory =
          await tx.inventoryItem.findFirst({
            where: {
              inventory: {
                warehouseId:
                  order.warehouseId,
              },
              variantId:
                order.finishedVariantId,
            },
          });

        if (!finishedInventory) {
          const inventory =
            await tx.inventory.findUnique({
              where: {
                warehouseId:
                  order.warehouseId,
              },
            });

          if (!inventory) {
            throw new Error(
              "No inventory record exists for the production warehouse"
            );
          }

          finishedInventory =
            await tx.inventoryItem.create({
              data: {
                inventoryId: inventory.id,
                variantId:
                  order.finishedVariantId,
                quantity: 0,
                reorderLevel: 10,
                status: "OUT_OF_STOCK",
              },
            });
        }

        const finishedQuantity =
          finishedInventory.quantity +
          order.quantity;

        await tx.inventoryItem.update({
          where: {
            id: finishedInventory.id,
          },
          data: {
            quantity: finishedQuantity,
            status: "IN_STOCK",
          },
        });

        await tx.stockMovement.create({
          data: {
            inventoryItemId:
              finishedInventory.id,
            type: "IN",
            quantity: order.quantity,
          },
        });

        const completed =
          await tx.productionOrder.update({
            where: {
              id,
            },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
            include: {
              warehouse: true,
              finishedVariant: {
                include: {
                  product: true,
                },
              },
              items: {
                include: {
                  componentVariant: {
                    include: {
                      product: true,
                    },
                  },
                },
              },
            },
          });

        return completed;
      });

    return res.json(result);
  } catch (error) {
    console.error(
      "Complete production order error:",
      error
    );

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to complete production order",
    });
  }
}
  export async function cancelProductionOrder(
  req: Request,
  res: Response
) {
  try {
    const id = String(req.params.id);

    const order = await prisma.productionOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        error: "Production order not found",
      });
    }

    if (order.status === "COMPLETED") {
      return res.status(400).json({
        error: "Completed production orders cannot be cancelled",
      });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({
        error: "Production order is already cancelled",
      });
    }

    const cancelled = await prisma.productionOrder.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    return res.json(cancelled);
  } catch (error) {
    console.error("Cancel production order error:", error);

    return res.status(500).json({
      error: "Failed to cancel production order",
    });
  }
}

