import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===================== CATEGORY =====================

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        subcategories: {
          include: { subcategories: true }
        }
      }
    });
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, parentId } = req.body as {
      name: string;
      description?: string;
      parentId?: string;
    };
    const category = await prisma.category.create({
      data: { name, description, parentId: parentId || null }
    });
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const addSubcategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, description } = req.body as { name: string; description?: string };
    const subcategory = await prisma.category.create({
      data: { name, description, parentId: id }
    });
    res.status(201).json(subcategory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== PRODUCT =====================

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: { attributes: true, skus: true, prices: true }
        }
      }
    });
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          include: { attributes: true, skus: true, prices: true }
        }
      }
    });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, status, brand, categoryId } = req.body as {
      name: string;
      description: string;
      status?: string;
      brand: string;
      categoryId: string;
    };
    const product = await prisma.product.create({
      data: { name, description, status: status || 'ACTIVE', brand, categoryId }
    });
    res.status(201).json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, description, status, brand, categoryId } = req.body as {
      name?: string;
      description?: string;
      status?: string;
      brand?: string;
      categoryId?: string;
    };
    const product = await prisma.product.update({
      where: { id },
      data: { name, description, status, brand, categoryId }
    });
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== PRODUCT VARIANT =====================

export const createVariant = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params as { productId: string };
    const { variantName, attributes } = req.body as {
      variantName: string;
      attributes?: { attributeName: string; attributeValue: string }[];
    };

    const variant = await prisma.productVariant.create({
      data: {
        variantName,
        productId,
        attributes: {
          create: attributes || []
        }
      },
      include: { attributes: true }
    });
    res.status(201).json(variant);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteVariant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.productVariant.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== SKU =====================

export const createSku = async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params as { variantId: string };
    const { skuCode, quantity, status } = req.body as {
      skuCode: string;
      quantity?: number;
      status?: string;
    };
    const sku = await prisma.sKU.create({
      data: {
        skuCode,
        quantity: quantity || 0,
        status: status || 'IN_STOCK',
        variantId
      }
    });
    res.status(201).json(sku);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'SKU code already exists' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateSku = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { skuCode, quantity, status } = req.body as {
      skuCode?: string;
      quantity?: number;
      status?: string;
    };
    const sku = await prisma.sKU.update({
      where: { id },
      data: { skuCode, quantity, status }
    });
    res.json(sku);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSku = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.sKU.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== PRICE =====================

export const createPrice = async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params as { variantId: string };
    const { amount, currency, priceType, region, effectiveDate, expiryDate } = req.body as {
      amount: number;
      currency?: string;
      priceType: string;
      region?: string;
      effectiveDate: string;
      expiryDate?: string;
    };
    const price = await prisma.price.create({
      data: {
        amount,
        currency: currency || 'USD',
        priceType,
        region: priceType === 'REGIONAL' ? region : null,
        effectiveDate: new Date(effectiveDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        variantId
      }
    });
    res.status(201).json(price);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePrice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.price.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== PRODUCT BUNDLE =====================

export const getBundles = async (req: Request, res: Response) => {
  try {
    const bundles = await prisma.productBundle.findMany({
      include: { products: { include: { product: true } } }
    });
    res.json(bundles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createBundle = async (req: Request, res: Response) => {
  try {
    const { name, description, status, bundleDiscount, productIds } = req.body as {
      name: string;
      description?: string;
      status?: string;
      bundleDiscount: number;
      productIds?: string[];
    };
    const bundle = await prisma.productBundle.create({
      data: {
        name,
        description,
        status: status || 'ACTIVE',
        bundleDiscount,
        products: {
          create: (productIds || []).map((productId: string) => ({ productId }))
        }
      },
      include: { products: { include: { product: true } } }
    });
    res.status(201).json(bundle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteBundle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.productBundle.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};