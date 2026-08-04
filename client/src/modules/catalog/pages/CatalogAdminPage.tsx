import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useCatalog } from '../context/CatalogContext';

export default function CatalogAdminPage() {
  const { currentUserRole } = useApp();
  const { categories, products, addCategory, addProduct, addVariant, addSku, addPrice, removeProduct, isLoading } = useCatalog();

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', brand: '', categoryId: '' });
  const [variantForms, setVariantForms] = useState<Record<string, string>>({});
  const [skuForms, setSkuForms] = useState<Record<string, { skuCode: string; quantity: string }>>({});
  const [priceForms, setPriceForms] = useState<Record<string, { amount: string; priceType: string }>>({});

  if (currentUserRole !== 'manager') {
    return <div className="p-8 text-center text-gray-500">You don't have access to manage the catalog.</div>;
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    await addCategory(categoryForm);
    setCategoryForm({ name: '', description: '' });
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productForm.categoryId) return;
    await addProduct(productForm);
    setProductForm({ name: '', description: '', brand: '', categoryId: '' });
  }

  async function handleAddVariant(productId: string) {
    const variantName = variantForms[productId];
    if (!variantName) return;
    await addVariant(productId, { variantName });
    setVariantForms({ ...variantForms, [productId]: '' });
  }

  async function handleAddSku(variantId: string) {
    const form = skuForms[variantId];
    if (!form?.skuCode) return;
    await addSku(variantId, { skuCode: form.skuCode, quantity: Number(form.quantity) || 0 });
    setSkuForms({ ...skuForms, [variantId]: { skuCode: '', quantity: '' } });
  }

  async function handleAddPrice(variantId: string) {
    const form = priceForms[variantId];
    if (!form?.amount) return;
    await addPrice(variantId, {
      amount: Number(form.amount),
      priceType: (form.priceType || 'RETAIL') as 'RETAIL' | 'WHOLESALE' | 'REGIONAL',
      effectiveDate: new Date().toISOString(),
    });
    setPriceForms({ ...priceForms, [variantId]: { amount: '', priceType: 'RETAIL' } });
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-10">
      <h1 className="text-xl font-semibold">Manage Catalog</h1>

      {/* Categories */}
      <section>
        <h2 className="font-medium text-sm text-gray-600 mb-3">Categories</h2>
        <form onSubmit={handleAddCategory} className="flex gap-2 mb-3">
          <input
            type="text" placeholder="Category name" value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            required className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text" placeholder="Description (optional)" value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium">Add</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <span key={c.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">{c.name}</span>
          ))}
        </div>
      </section>

      {/* Products */}
      <section>
        <h2 className="font-medium text-sm text-gray-600 mb-3">Add a product</h2>
        <form onSubmit={handleAddProduct} className="border border-gray-200 rounded-lg p-4 space-y-3 mb-6">
          <input
            type="text" placeholder="Product name" value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text" placeholder="Brand" value={productForm.brand}
              onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
              required className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <select
              value={productForm.categoryId}
              onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
              required className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <textarea
            placeholder="Description" value={productForm.description}
            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
            required rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium">Add product</button>
        </form>

        <h2 className="font-medium text-sm text-gray-600 mb-3">All products</h2>
        {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.brand} · {product.category?.name}</p>
                </div>
                <button onClick={() => removeProduct(product.id)} className="text-sm text-red-500 underline">Delete</button>
              </div>

              {/* Variants list */}
              <div className="space-y-2 mb-3">
                {product.variants.map((variant) => (
                  <div key={variant.id} className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm font-medium mb-2">{variant.variantName}</p>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="text" placeholder="SKU code"
                        value={skuForms[variant.id]?.skuCode || ''}
                        onChange={(e) => setSkuForms({ ...skuForms, [variant.id]: { ...skuForms[variant.id], skuCode: e.target.value, quantity: skuForms[variant.id]?.quantity || '' } })}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs flex-1"
                      />
                      <input
                        type="number" placeholder="Qty"
                        value={skuForms[variant.id]?.quantity || ''}
                        onChange={(e) => setSkuForms({ ...skuForms, [variant.id]: { skuCode: skuForms[variant.id]?.skuCode || '', quantity: e.target.value } })}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs w-20"
                      />
                      <button onClick={() => handleAddSku(variant.id)} className="text-xs bg-gray-900 text-white px-3 rounded-md">+ SKU</button>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="number" step="0.01" placeholder="Price amount"
                        value={priceForms[variant.id]?.amount || ''}
                        onChange={(e) => setPriceForms({ ...priceForms, [variant.id]: { amount: e.target.value, priceType: priceForms[variant.id]?.priceType || 'RETAIL' } })}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs flex-1"
                      />
                      <select
                        value={priceForms[variant.id]?.priceType || 'RETAIL'}
                        onChange={(e) => setPriceForms({ ...priceForms, [variant.id]: { amount: priceForms[variant.id]?.amount || '', priceType: e.target.value } })}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                      >
                        <option value="RETAIL">Retail</option>
                        <option value="WHOLESALE">Wholesale</option>
                        <option value="REGIONAL">Regional</option>
                      </select>
                      <button onClick={() => handleAddPrice(variant.id)} className="text-xs bg-gray-900 text-white px-3 rounded-md">+ Price</button>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {variant.skus.map((s) => <span key={s.id} className="text-xs border rounded-full px-2 py-0.5">{s.skuCode}</span>)}
                      {variant.prices.map((p) => <span key={p.id} className="text-xs border rounded-full px-2 py-0.5">${p.amount} {p.priceType}</span>)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add variant */}
              <div className="flex gap-2">
                <input
                  type="text" placeholder="New variant name (e.g. Red / Large)"
                  value={variantForms[product.id] || ''}
                  onChange={(e) => setVariantForms({ ...variantForms, [product.id]: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                <button onClick={() => handleAddVariant(product.id)} className="text-sm bg-gray-100 px-3 rounded-md">+ Variant</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>
  );
}