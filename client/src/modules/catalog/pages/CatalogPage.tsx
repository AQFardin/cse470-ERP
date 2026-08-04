import { useState, useMemo } from 'react';
import { useCatalog } from '../context/CatalogContext';

interface CatalogPageProps {
  onNavigate: (path: string) => void;
}

function getStartingPrice(product: ReturnType<typeof useCatalog>['products'][number]) {
  const retailPrices = product.variants
    .flatMap((v) => v.prices)
    .filter((p) => p.priceType === 'RETAIL');
  if (retailPrices.length === 0) return null;
  return Math.min(...retailPrices.map((p) => p.amount));
}

export default function CatalogPage({ onNavigate }: CatalogPageProps) {
  const { products, categories, isLoading } = useCatalog();
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, categoryFilter, search]);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-1">Product Catalog</h1>
      <p className="text-gray-500 mb-6">Browse our full range of products.</p>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="ALL">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading products...</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-gray-400 text-sm">No products found.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((product) => {
          const price = getStartingPrice(product);
          return (
            <button
              key={product.id}
              onClick={() => onNavigate(`/catalog/${product.id}`)}
              className="text-left border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <p className="text-xs text-gray-400 uppercase mb-1">{product.brand}</p>
              <h2 className="font-medium mb-1">{product.name}</h2>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
              <p className="font-semibold">
                {price !== null ? `From $${price.toFixed(2)}` : 'Price unavailable'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}