import { useEffect, useState } from "react";

const API_BASE = "http://localhost:3001/api/inventory";
const CATALOG_API = "http://localhost:3001/api/catalog";

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
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [
        itemsResponse,
        warehousesResponse,
        productsResponse,
        inventoriesResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/inventory-items`),
        fetch(`${API_BASE}/warehouses`),
        fetch(`${CATALOG_API}/products`),
        fetch(`${API_BASE}`), // Fixed route: GET /api/inventory
      ]);

      if (!itemsResponse.ok || !warehousesResponse.ok || !productsResponse.ok) {
        throw new Error("Failed to load inventory data");
      }

      const itemsData: InventoryItem[] = await itemsResponse.json();
      const warehousesData: Warehouse[] = await warehousesResponse.json();
      const productsData: Product[] = await productsResponse.json();
      
      let rawInventories = inventoriesResponse.ok
        ? await inventoriesResponse.json()
        : [];
      
      // Handle either array response or { data: [...] } format
      let currentInventories: InventoryRecord[] = Array.isArray(rawInventories)
        ? rawInventories
        : rawInventories.data || [];

      // Ensure every warehouse has an inventory record using the root POST /api/inventory
      for (const warehouse of warehousesData) {
        const exists = currentInventories.some(
          (inv) => inv.warehouseId === warehouse.id
        );
        if (!exists) {
          try {
            const res = await fetch(`${API_BASE}`, { // Fixed route: POST /api/inventory
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ warehouseId: warehouse.id }),
            });
            if (res.ok) {
              const newInvData = await res.json();
              const newInv = newInvData.data || newInvData;
              currentInventories.push(newInv);
            }
          } catch (e) {
            console.error("Could not auto-create inventory for", warehouse.name);
          }
        }
      }

      const allVariants = productsData.flatMap((product) =>
        product.variants.map((variant) => ({
          ...variant,
          productId: product.id,
          variantName: `${product.name} — ${variant.variantName}`,
        }))
      );

      setItems(itemsData);
      setWarehouses(warehousesData);
      setInventories(currentInventories);
      setVariants(allVariants);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createInventoryItem(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedWarehouseId || !variantId) {
      alert("Please select a warehouse and variant.");
      return;
    }

    try {
      setSaving(true);

      // Locate or auto-create the inventory record for this warehouse
      let targetInventory = inventories.find(
        (inv) => inv.warehouseId === selectedWarehouseId
      );

      if (!targetInventory) {
        const invRes = await fetch(`${API_BASE}`, { // Fixed route: POST /api/inventory
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ warehouseId: selectedWarehouseId }),
        });
        if (!invRes.ok) throw new Error("Failed to initialize warehouse inventory");
        const newInvData = await invRes.json();
        targetInventory = newInvData.data || newInvData;
      }

      const response = await fetch(`${API_BASE}/inventory-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventoryId: targetInventory?.id,
          variantId,
          quantity: Number(quantity),
          reorderLevel: Number(reorderLevel),
          status: "IN_STOCK",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.error || data?.message || "Failed to create inventory item.");
        return;
      }

      setSelectedWarehouseId("");
      setVariantId("");
      setQuantity("0");
      setReorderLevel("10");

      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create inventory item.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this inventory item?")) return;

    const response = await fetch(`${API_BASE}/inventory-items/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Failed to delete inventory item.");
      return;
    }

    await loadData();
  }

  function warehouseName(warehouseId?: string) {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    return warehouse?.name || "Unknown Warehouse";
  }

  if (loading) {
    return <div className="p-6">Loading inventory...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl">
            📦
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Inventory Items
            </h1>
            <p className="text-slate-500">
              Manage products across your warehouses.
            </p>
          </div>
        </div>
      </div>

      {/* ADD ITEM */}
      <form
        onSubmit={createInventoryItem}
        className="border border-purple-100 rounded-2xl p-6 mb-8 bg-white shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">
            ➕
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Add Inventory Item
            </h2>
            <p className="text-sm text-slate-500">
              Register a product in your warehouse.
            </p>
          </div>
        </div>

        {/* WAREHOUSE */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Warehouse
          </label>
          <select
            className="border border-slate-300 rounded-xl px-4 py-3 w-full bg-white"
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
          >
            <option value="">Select warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        {/* VARIANT */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Product / Variant
          </label>
          <select
            className="border border-slate-300 rounded-xl px-4 py-3 w-full bg-white"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            <option value="">Select product variant</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.variantName}
              </option>
            ))}
          </select>
        </div>

        {/* QUANTITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Quantity
            </label>
            <input
              className="border border-slate-300 rounded-xl px-4 py-3 w-full"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Reorder Level
            </label>
            <input
              className="border border-slate-300 rounded-xl px-4 py-3 w-full"
              type="number"
              min="0"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl px-6 py-3"
        >
          {saving ? "Adding..." : "➕ Add Inventory Item"}
        </button>
      </form>

      {/* CURRENT INVENTORY */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Current Inventory
          </h2>
          <p className="text-slate-500">
            {items.length} items being tracked
          </p>
        </div>
        <div className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-semibold">
          📦 {items.length}
        </div>
      </div>

      {/* ITEMS */}
      <div className="space-y-4">
        {items.length === 0 && (
          <div className="border rounded-2xl p-8 text-center text-slate-500">
            No inventory items yet.
          </div>
        )}

        {items.map((item) => {
          const isLow = item.quantity <= item.reorderLevel;
          const isOut = item.quantity === 0;

          return (
            <div
              key={item.id}
              className="border rounded-2xl p-5 bg-white shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-xl">
                  📦
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    {item.variant?.variantName || "Unknown Variant"}
                  </h3>
                  <p className="text-slate-500">
                    🏭 {warehouseName(item.inventory?.warehouseId)}
                  </p>
                  <p className="text-slate-500">
                    Quantity: <span className="font-semibold">{item.quantity}</span>
                    {" · "}
                    Reorder Level: {item.reorderLevel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    isOut
                      ? "bg-red-100 text-red-700"
                      : isLow
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {isOut
                    ? "❌ OUT OF STOCK"
                    : isLow
                    ? "⚠️ LOW STOCK"
                    : "✅ IN STOCK"}
                </span>

                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="text-red-600 hover:text-red-800 font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}