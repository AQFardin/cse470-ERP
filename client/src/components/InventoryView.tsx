import { useEffect, useState } from "react";
import { getInventoryItems, getLowStockItems } from "../modules/inventory/api";
import type { InventoryItem } from "../modules/inventory/types";

export default function InventoryView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const [inventoryItems, lowStockItems] = await Promise.all([
        getInventoryItems(),
        getLowStockItems(),
      ]);

      setItems(inventoryItems);
      setLowStock(lowStockItems);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const totalQuantity = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-48 rounded-xl bg-slate-200" />

          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-36 rounded-2xl bg-slate-200" />
            <div className="h-36 rounded-2xl bg-slate-200" />
            <div className="h-36 rounded-2xl bg-slate-200" />
          </div>

          <div className="h-80 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <div className="text-5xl">⚠️</div>

          <h2 className="mt-4 text-2xl font-bold text-red-700">
            Something went wrong
          </h2>

          <p className="mt-2 text-red-600">{error}</p>

          <button
            onClick={loadInventory}
            className="mt-6 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Inventory 📦
        </h1>

        <p className="mt-1 text-slate-500">
          Keep track of your stock at a glance.
        </p>
      </div>

      {/* STAT CARDS */}
      <div className="grid gap-5 md:grid-cols-3">

        {/* TOTAL ITEMS */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-2xl text-white">
                📦
              </div>

              <p className="text-sm font-medium text-slate-500">
                Total Items
              </p>

              <p className="mt-1 text-4xl font-bold text-slate-800">
                {items.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Items being tracked
              </p>
            </div>

            <div className="text-7xl opacity-10">📦</div>
          </div>
        </div>

        {/* LOW STOCK */}
        <div className="relative overflow-hidden rounded-2xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500 text-2xl text-white">
                ⚠️
              </div>

              <p className="text-sm font-medium text-slate-500">
                Low Stock
              </p>

              <p className="mt-1 text-4xl font-bold text-slate-800">
                {lowStock.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Need attention
              </p>
            </div>

            <div className="text-7xl opacity-10">📉</div>
          </div>
        </div>

        {/* TOTAL QUANTITY */}
        <div className="relative overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-2xl text-white">
                🛒
              </div>

              <p className="text-sm font-medium text-slate-500">
                Total Quantity
              </p>

              <p className="mt-1 text-4xl font-bold text-slate-800">
                {totalQuantity}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Units available
              </p>
            </div>

            <div className="text-7xl opacity-10">🛒</div>
          </div>
        </div>
      </div>

      {/* LOW STOCK ALERT */}
      {lowStock.length > 0 && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>

            <div>
              <h2 className="text-xl font-bold text-yellow-800">
                Low Stock Alert
              </h2>

              <p className="mt-1 text-sm text-yellow-700">
                These items are getting close to their reorder level.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {lowStock.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-yellow-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">
                      {item.variant?.variantName || "Unknown Item"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Reorder level: {item.reorderLevel}
                    </p>
                  </div>

                  <div className="text-2xl font-bold text-yellow-600">
                    {item.quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INVENTORY TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-xl">
              📋
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Inventory Items
              </h2>

              <p className="text-sm text-slate-500">
                Current stock levels
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-500">
                <th className="px-6 py-4 font-semibold">Item</th>
                <th className="px-6 py-4 font-semibold">Quantity</th>
                <th className="px-6 py-4 font-semibold">Reorder Level</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const isLow = item.status === "LOW_STOCK";
                const isOut = item.status === "OUT_OF_STOCK";

                return (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 transition hover:bg-purple-50/40"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-xl">
                          📦
                        </div>

                        <div>
                          <p className="font-bold text-slate-800">
                            {item.variant?.variantName ||
                              "Unknown Item"}
                          </p>

                          <p className="text-sm text-slate-500">
                            Inventory item
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="text-2xl font-bold text-slate-800">
                        {item.quantity}
                      </span>

                      <span className="ml-1 text-sm text-slate-500">
                        units
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span className="font-semibold text-purple-600">
                        {item.reorderLevel}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                          isOut
                            ? "border-red-200 bg-red-50 text-red-700"
                            : isLow
                            ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                            : "border-green-200 bg-green-50 text-green-700"
                        }`}
                      >
                        {isOut
                          ? "❌ OUT OF STOCK"
                          : isLow
                          ? "⚠️ LOW STOCK"
                          : "✅ IN STOCK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER MESSAGE */}
      <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-white p-7">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm">
            🎉
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Inventory overview complete
            </h2>

            <p className="mt-1 text-slate-500">
              {lowStock.length === 0
                ? "Everything is nicely stocked right now."
                : `${lowStock.length} item${
                    lowStock.length === 1 ? "" : "s"
                  } need your attention.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}