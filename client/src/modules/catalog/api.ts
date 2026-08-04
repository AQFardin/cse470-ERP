import type { Category, Product, ProductBundle } from './types';

const API_BASE = '/api/catalog';

async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null; // no content, e.g. after delete
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return body;
}

// ─── Categories ──────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  return apiCall('/categories');
}

export async function createCategory(data: { name: string; description?: string; parentId?: string }): Promise<Category> {
  return apiCall('/categories', { method: 'POST', body: JSON.stringify(data) });
}

export async function addSubcategory(parentId: string, data: { name: string; description?: string }): Promise<Category> {
  return apiCall(`/categories/${parentId}/subcategory`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiCall(`/categories/${id}`, { method: 'DELETE' });
}

// ─── Products ────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  return apiCall('/products');
}

export async function fetchProductById(id: string): Promise<Product> {
  return apiCall(`/products/${id}`);
}

export async function createProduct(data: {
  name: string;
  description: string;
  status?: string;
  brand: string;
  categoryId: string;
}): Promise<Product> {
  return apiCall('/products', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateProduct(id: string, data: Partial<{
  name: string;
  description: string;
  status: string;
  brand: string;
  categoryId: string;
}>): Promise<Product> {
  return apiCall(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteProduct(id: string): Promise<void> {
  await apiCall(`/products/${id}`, { method: 'DELETE' });
}

// ─── Variants ────────────────────────────────────────────

export async function createVariant(productId: string, data: {
  variantName: string;
  attributes?: { attributeName: string; attributeValue: string }[];
}) {
  return apiCall(`/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteVariant(id: string): Promise<void> {
  await apiCall(`/variants/${id}`, { method: 'DELETE' });
}

// ─── SKUs ────────────────────────────────────────────────

export async function createSku(variantId: string, data: { skuCode: string; quantity?: number; status?: string }) {
  return apiCall(`/variants/${variantId}/skus`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSku(id: string, data: Partial<{ skuCode: string; quantity: number; status: string }>) {
  return apiCall(`/skus/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteSku(id: string): Promise<void> {
  await apiCall(`/skus/${id}`, { method: 'DELETE' });
}

// ─── Prices ──────────────────────────────────────────────

export async function createPrice(variantId: string, data: {
  amount: number;
  currency?: string;
  priceType: 'RETAIL' | 'WHOLESALE' | 'REGIONAL';
  region?: string;
  effectiveDate: string;
  expiryDate?: string;
}) {
  return apiCall(`/variants/${variantId}/prices`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deletePrice(id: string): Promise<void> {
  await apiCall(`/prices/${id}`, { method: 'DELETE' });
}

// ─── Bundles ─────────────────────────────────────────────

export async function fetchBundles(): Promise<ProductBundle[]> {
  return apiCall('/bundles');
}

export async function createBundle(data: {
  name: string;
  description?: string;
  status?: string;
  bundleDiscount: number;
  productIds?: string[];
}): Promise<ProductBundle> {
  return apiCall('/bundles', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteBundle(id: string): Promise<void> {
  await apiCall(`/bundles/${id}`, { method: 'DELETE' });
}