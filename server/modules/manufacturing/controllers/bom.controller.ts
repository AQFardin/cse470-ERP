import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get all BOMs
export async function getBOMs(
  _req: Request,
  res: Response
) {
  try {
    const boms = await prisma.billOfMaterial.findMany({
      include: {
        finishedVariant: {
          include: {
            product: true,
          },
        },
        versions: {
          orderBy: {
            version: "desc",
          },
          include: {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(boms);
  } catch (error) {
    console.error("Get BOMs error:", error);

    return res.status(500).json({
      error: "Failed to fetch BOMs",
    });
  }
}

// Create a new BOM with its first version
export async function createBOM(
  req: Request,
  res: Response
) {
  try {
    const {
      name,
      description,
      finishedVariantId,
      items,
    } = req.body;

    if (!name || !finishedVariantId) {
      return res.status(400).json({
        error:
          "name and finishedVariantId are required",
      });
    }

    const finishedVariant =
      await prisma.productVariant.findUnique({
        where: {
          id: finishedVariantId,
        },
      });

    if (!finishedVariant) {
      return res.status(404).json({
        error: "Finished product variant not found",
      });
    }

    const components = Array.isArray(items)
      ? items
      : [];

    const bom = await prisma.billOfMaterial.create({
      data: {
        name,
        description: description || null,
        finishedVariantId,

        versions: {
          create: {
            version: 1,
            isActive: true,

            items: {
              create: components.map(
                (item: {
                  componentVariantId: string;
                  quantity: number;
                }) => ({
                  componentVariantId:
                    item.componentVariantId,
                  quantity: Number(item.quantity),
                })
              ),
            },
          },
        },
      },

      include: {
        finishedVariant: {
          include: {
            product: true,
          },
        },
        versions: {
          include: {
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
      },
    });

    return res.status(201).json(bom);
  } catch (error) {
    console.error("Create BOM error:", error);

    return res.status(500).json({
      error: "Failed to create BOM",
    });
  }
}

// Create a new version of an existing BOM
export async function createBOMVersion(
  req: Request,
  res: Response
) {
  try {
    const bomId = String(req.params.id);

    const { items } = req.body;

    const bom = await prisma.billOfMaterial.findUnique({
      where: {
        id: bomId,
      },
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
        },
      },
    });

    if (!bom) {
      return res.status(404).json({
        error: "BOM not found",
      });
    }

    const nextVersion =
      bom.versions.length > 0
        ? bom.versions[0].version + 1
        : 1;

    const components = Array.isArray(items)
      ? items
      : [];

    await prisma.bOMVersion.updateMany({
      where: {
        bomId,
      },
      data: {
        isActive: false,
      },
    });

    const version =
      await prisma.bOMVersion.create({
        data: {
          bomId,
          version: nextVersion,
          isActive: true,

          items: {
            create: components.map(
              (item: {
                componentVariantId: string;
                quantity: number;
              }) => ({
                componentVariantId:
                  item.componentVariantId,
                quantity: Number(item.quantity),
              })
            ),
          },
        },

        include: {
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

    return res.status(201).json(version);
  } catch (error) {
    console.error(
      "Create BOM version error:",
      error
    );

    return res.status(500).json({
      error: "Failed to create BOM version",
    });
  }
}
