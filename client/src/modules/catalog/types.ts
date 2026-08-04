export interface Category {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  subcategories?: Category[];
}

export interface Price {
  id: string;
  amount: number;
  currency: string;
  priceType: 'RETAIL' | 'WHOLESALE' | 'REGIONAL';
  region?: string | null;
  effectiveDate: string;
  expiryDate?: string | null;
}

export interface SKU {
  id: string;
  skuCode: string;
  quantity: number;
  status: string;
}

export interface VariantAttribute {
  id: string;
  attributeName: string;
  attributeValue: string;
}

export interface ProductVariant {
  id: string;
  variantName: string;
  attributes: VariantAttribute[];
  skus: SKU[];
  prices: Price[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  status: string;
  brand: string;
  categoryId: string;
  category?: Category;
  variants: ProductVariant[];
}

export interface ProductBundle {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  bundleDiscount: number;
  products: { product: Product }[];
}