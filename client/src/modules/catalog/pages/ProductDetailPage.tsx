import { useCatalog } from '../context/CatalogContext';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (path: string) => void;
}

export default function ProductDetailPage({ productId, onNavigate }: ProductDetailPageProps) {
  const { products, isLoading } = useCatalog();
  const product = products.find((p) => p.id === productId);

  if (isLoading) return <p className="p-8 text-gray-400 text-sm">Loading...</p>;
  if (!product) return <p className="p-8 text-gray-400 text-sm">Product not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <button onClick={() => onNavigate('/catalog')} className="text-sm text-gray-500 underline mb-4">
        ← Back to catalog
      </button>

      <p className="text-xs text-gray-400 uppercase mb-1">{product.brand}</p>
      <h1 className="text-2xl font-semibold mb-2">{product.name}</h1>
      <p className="text-gray-600 mb-6">{product.description}</p>

      <div className="space-y-4">
        {product.variants.map((variant) => (
          <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
            <h2 className="font-medium mb-2">{variant.variantName}</h2>

            {variant.attributes.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {variant.attributes.map((attr) => (
                  <span key={attr.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {attr.attributeName}: {attr.attributeValue}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-1 mb-3">
              {variant.prices.map((price) => (
                <p key={price.id} className="text-sm">
                  <span className="font-medium">{price.priceType}</span>
                  {price.region ? ` (${price.region})` : ''}: ${price.amount.toFixed(2)} {price.currency}
                </p>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              {variant.skus.map((sku) => (
                <span key={sku.id} className="text-xs border border-gray-200 rounded-full px-2 py-1">
                  {sku.skuCode} · {sku.status} · Qty: {sku.quantity}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}