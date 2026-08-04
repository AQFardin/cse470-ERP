import { Router } from 'express';
import {
  getCategories,
  createCategory,
  addSubcategory,
  deleteCategory,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  deleteVariant,
  createSku,
  updateSku,
  deleteSku,
  createPrice,
  deletePrice,
  getBundles,
  createBundle,
  deleteBundle
} from '../controllers/catalog.controller';

const router = Router();

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.post('/categories/:id/subcategory', addSubcategory);
router.delete('/categories/:id', deleteCategory);

// Products
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Variants
router.post('/products/:productId/variants', createVariant);
router.delete('/variants/:id', deleteVariant);

// SKUs
router.post('/variants/:variantId/skus', createSku);
router.put('/skus/:id', updateSku);
router.delete('/skus/:id', deleteSku);

// Prices
router.post('/variants/:variantId/prices', createPrice);
router.delete('/prices/:id', deletePrice);

// Bundles
router.get('/bundles', getBundles);
router.post('/bundles', createBundle);
router.delete('/bundles/:id', deleteBundle);

export default router;