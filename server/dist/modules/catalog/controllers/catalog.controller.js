"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBundle = exports.createBundle = exports.getBundles = exports.deletePrice = exports.createPrice = exports.deleteSku = exports.updateSku = exports.createSku = exports.deleteVariant = exports.createVariant = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = exports.deleteCategory = exports.addSubcategory = exports.createCategory = exports.getCategories = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ===================== CATEGORY =====================
const getCategories = async (req, res) => {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getCategories = getCategories;
const createCategory = async (req, res) => {
    try {
        const { name, description, parentId } = req.body;
        const category = await prisma.category.create({
            data: { name, description, parentId: parentId || null }
        });
        res.status(201).json(category);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createCategory = createCategory;
const addSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const subcategory = await prisma.category.create({
            data: { name, description, parentId: id }
        });
        res.status(201).json(subcategory);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.addSubcategory = addSubcategory;
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteCategory = deleteCategory;
// ===================== PRODUCT =====================
const getProducts = async (req, res) => {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    try {
        const { name, description, status, brand, categoryId } = req.body;
        const product = await prisma.product.create({
            data: { name, description, status: status || 'ACTIVE', brand, categoryId }
        });
        res.status(201).json(product);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status, brand, categoryId } = req.body;
        const product = await prisma.product.update({
            where: { id },
            data: { name, description, status, brand, categoryId }
        });
        res.json(product);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteProduct = deleteProduct;
// ===================== PRODUCT VARIANT =====================
const createVariant = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variantName, attributes } = req.body;
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createVariant = createVariant;
const deleteVariant = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.productVariant.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteVariant = deleteVariant;
// ===================== SKU =====================
const createSku = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { skuCode, quantity, status } = req.body;
        const sku = await prisma.sKU.create({
            data: {
                skuCode,
                quantity: quantity || 0,
                status: status || 'IN_STOCK',
                variantId
            }
        });
        res.status(201).json(sku);
    }
    catch (err) {
        if (err.code === 'P2002') {
            res.status(409).json({ error: 'SKU code already exists' });
            return;
        }
        res.status(500).json({ error: err.message });
    }
};
exports.createSku = createSku;
const updateSku = async (req, res) => {
    try {
        const { id } = req.params;
        const { skuCode, quantity, status } = req.body;
        const sku = await prisma.sKU.update({
            where: { id },
            data: { skuCode, quantity, status }
        });
        res.json(sku);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateSku = updateSku;
const deleteSku = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.sKU.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteSku = deleteSku;
// ===================== PRICE =====================
const createPrice = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { amount, currency, priceType, region, effectiveDate, expiryDate } = req.body;
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createPrice = createPrice;
const deletePrice = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.price.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deletePrice = deletePrice;
// ===================== PRODUCT BUNDLE =====================
const getBundles = async (req, res) => {
    try {
        const bundles = await prisma.productBundle.findMany({
            include: { products: { include: { product: true } } }
        });
        res.json(bundles);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getBundles = getBundles;
const createBundle = async (req, res) => {
    try {
        const { name, description, status, bundleDiscount, productIds } = req.body;
        const bundle = await prisma.productBundle.create({
            data: {
                name,
                description,
                status: status || 'ACTIVE',
                bundleDiscount,
                products: {
                    create: (productIds || []).map((productId) => ({ productId }))
                }
            },
            include: { products: { include: { product: true } } }
        });
        res.status(201).json(bundle);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createBundle = createBundle;
const deleteBundle = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.productBundle.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteBundle = deleteBundle;
//# sourceMappingURL=catalog.controller.js.map