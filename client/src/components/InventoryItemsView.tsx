import { useEffect, useState } from "react";
import { getCurrentUserId } from "../lib/api";

const API_BASE = "http://localhost:3001/api/inventory";
const CATALOG_API = "http://localhost:3001/api/catalog";

const getAuthHeaders = () => {
  const uid = getCurrentUserId() || "52e97f56-d1f1-4dc7-afa2-34f9f7958c92";
  return {
    "Content-Type": "application/json",
    "x-current-user-id": uid,
  };
};

type InventoryItem = {
  id: string;
  inventoryId: string;
  variantId: string;
  quantity: number;
  reorderLevel: number;
  status: string;
  inventory?: {
    warehouseId: string;
  };
  variant?: {
    variantName: string;
    productId: string;
  };
};

type Warehouse = {
  id: string;
  name: string;
};

type ProductVariant = {
  id: string;
  variantName: string;
  productId: string;
};

type Product = {
  id: string;
  name: string;
  variants: ProductVariant[];
};

type InventoryRecord = {
  id: string;
  warehouseId: string;
};

export default function InventoryItemsView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventories, setInventories] = useState<InventoryRecord[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("10");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        itemsResponse,
        warehousesResponse,
        productsResponse,
        inventoriesResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/inventory-items`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/warehouses`, { headers: getAuthHeaders() }),
        fetch(`${CATALOG_API}/products`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}`, { headers: getAuthHeaders() }),
      ]);

      if (!itemsResponse.ok || !warehousesResponse.ok || !productsResponse.ok) {
        throw new Error("Failed to load inventory data");
      }

      const itemsData = await itemsResponse.json();
      const warehousesData = await warehousesResponse.json();
      const productsData = await productsResponse.json();
      const inventoriesData = inventoriesResponse.ok ? await inventoriesResponse.json() : [];

      const rawItems = Array.isArray(itemsData) ? itemsData : itemsData.data || [];
      const rawWarehouses = Array.isArray(warehousesData) ? warehousesData : warehousesData.data || [];
      const rawProducts = Array.isArray(productsData) ? productsData : productsData.data || [];
      const rawInventories = Array.isArray(inventoriesData) ? inventoriesData : inventoriesData.data || [];

      setItems(rawItems);
      setWarehouses(rawWarehouses);
      setInventories(rawInventories);

      const allVariants: ProductVariant[] = rawProducts.flatMap((p: Product) =>
        Array.isArray(p.variants) ? p.variants : []
      );
      setVariants(allVariants);

      if (rawWarehouses.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(rawWarehouses[0].id);
      }
      if (allVariants.length > 0 && !variantId) {
        setVariantId(allVariants[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch inventory items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId || !variantId) return;

    try {
      setSubmitting(true);
      let targetInv = inventories.find((inv) => inv.warehouseId === selectedWarehouseId);

      if (!targetInv) {
        const invRes = await fetch(`${API_BASE}`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ warehouseId: selectedWarehouseId }),
        });
        if (!invRes.ok) throw new Error("Failed to initialize inventory for warehouse");
        const newInv = await invRes.json();
        targetInv = newInv.data || newInv;
      }

      const response = await fetch(`${API_BASE}/inventory-items`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          inventoryId: targetInv.id,
          variantId,
          quantity: parseInt(quantity, 10),
          reorderLevel: parseInt(reorderLevel, 10),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create item");
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "Error creating inventory item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      const res = await fetch(`${API_BASE}/inventory-items/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete item");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Loading inventory items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
        <h3 className="text-lg font-bold text-red-700 mb-2">Something went wrong</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Items</h1>
      </div>

      <form onSubmit={handleAddItem} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Warehouse</label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full border p-2 rounded text-sm"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Variant</label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="w-full border p-2 rounded text-sm"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.variantName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full border p-2 rounded text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm font-semibold transition"
        >
          {submitting ? "Adding..." : "Add Stock"}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Item ID</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Warehouse</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Variant</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Quantity</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No inventory items found. Add some stock above.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const inv = inventories.find((i) => i.id === item.inventoryId);
                const wh = warehouses.find((w) => w.id === inv?.warehouseId);
                const vr = variants.find((v) => v.id === item.variantId);

                return (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{item.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{wh?.name || "DC Warehouse"}</td>
                    <td className="px-6 py-4 text-gray-700">{vr?.variantName || "Standard Unit"}</td>
                    <td className="px-6 py-4 font-semibold">{item.quantity}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        {item.status || "IN_STOCK"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
