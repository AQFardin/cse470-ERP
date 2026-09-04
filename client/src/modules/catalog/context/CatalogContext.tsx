import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import type { Category, Product, ProductBundle } from '../types';
import * as catalogApi from '../api';

interface CatalogContextType {
  categories: Category[];
  products: Product[];
  bundles: ProductBundle[];
  isLoading: boolean;

  refreshAll: () => Promise<void>;
  addCategory: (data: { name: string; description?: string; parentId?: string }) => Promise<void>;
  addProduct: (data: { name: string; description: string; brand: string; categoryId: string }) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addVariant: (productId: string, data: { variantName: string; attributes?: { attributeName: string; attributeValue: string }[] }) => Promise<void>;
  addSku: (variantId: string, data: { skuCode: string; quantity?: number }) => Promise<void>;
  addPrice: (variantId: string, data: { amount: number; priceType: 'RETAIL' | 'WHOLESALE' | 'REGIONAL'; region?: string; effectiveDate: string; currency?: string }) => Promise<void>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useApp();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAll = async () => {
    try {
      setIsLoading(true);
      const [cats, prods, bnds] = await Promise.all([
        catalogApi.fetchCategories(),
        catalogApi.fetchProducts(),
        catalogApi.fetchBundles(),
      ]);
      setCategories(cats);
      setProducts(prods);
      setBundles(bnds);
    } catch (err: any) {
      showToast(err.message || 'Failed to load catalog data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const addCategory: CatalogContextType['addCategory'] = async (data) => {
    try {
      await catalogApi.createCategory(data);
      await refreshAll();
      showToast(`Category "${data.name}" created`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const addProduct: CatalogContextType['addProduct'] = async (data) => {
    try {
      await catalogApi.createProduct(data);
      await refreshAll();
      showToast(`Product "${data.name}" created`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const removeProduct = async (id: string) => {
    try {
      await catalogApi.deleteProduct(id);
      await refreshAll();
      showToast('Product removed', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const addVariant: CatalogContextType['addVariant'] = async (productId, data) => {
    try {
      await catalogApi.createVariant(productId, data);
      await refreshAll();
      showToast(`Variant "${data.variantName}" added`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const addSku: CatalogContextType['addSku'] = async (variantId, data) => {
    try {
      await catalogApi.createSku(variantId, data);
      await refreshAll();
      showToast(`SKU "${data.skuCode}" added`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const addPrice: CatalogContextType['addPrice'] = async (variantId, data) => {
    try {
      await catalogApi.createPrice(variantId, data);
      await refreshAll();
      showToast(`Price added`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  return (
    <CatalogContext.Provider
      value={{ categories, products, bundles, isLoading, refreshAll, addCategory, addProduct, removeProduct, addVariant, addSku, addPrice }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};