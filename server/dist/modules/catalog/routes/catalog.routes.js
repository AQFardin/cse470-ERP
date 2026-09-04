"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catalog_controller_1 = require("../controllers/catalog.controller");
const router = (0, express_1.Router)();
// Categories
router.get('/categories', catalog_controller_1.getCategories);
router.post('/categories', catalog_controller_1.createCategory);
router.post('/categories/:id/subcategory', catalog_controller_1.addSubcategory);
router.delete('/categories/:id', catalog_controller_1.deleteCategory);
// Products
router.get('/products', catalog_controller_1.getProducts);
router.get('/products/:id', catalog_controller_1.getProductById);
router.post('/products', catalog_controller_1.createProduct);
router.put('/products/:id', catalog_controller_1.updateProduct);
router.delete('/products/:id', catalog_controller_1.deleteProduct);
// Variants
router.post('/products/:productId/variants', catalog_controller_1.createVariant);
router.delete('/variants/:id', catalog_controller_1.deleteVariant);
// SKUs
router.post('/variants/:variantId/skus', catalog_controller_1.createSku);
router.put('/skus/:id', catalog_controller_1.updateSku);
router.delete('/skus/:id', catalog_controller_1.deleteSku);
// Prices
router.post('/variants/:variantId/prices', catalog_controller_1.createPrice);
router.delete('/prices/:id', catalog_controller_1.deletePrice);
// Bundles
router.get('/bundles', catalog_controller_1.getBundles);
router.post('/bundles', catalog_controller_1.createBundle);
router.delete('/bundles/:id', catalog_controller_1.deleteBundle);
exports.default = router;
//# sourceMappingURL=catalog.routes.js.map