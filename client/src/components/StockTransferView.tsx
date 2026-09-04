import { useEffect, useState } from "react";
import {
  getInventoryItems,
  createStockTransfer,
} from "../modules/inventory/api";
import type { InventoryItem } from "../modules/inventory/types";

export default function StockTransferView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadItems() {
    try {
      setLoading(true);
      const data = await getInventoryItems();
      setItems(data);
    } catch (error: any) {
      setMessage(error.message || "Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleTransfer() {
    setMessage("");

    if (!sourceId || !destinationId) {
      setMessage("Select both source and destination.");
      return;
    }

    if (sourceId === destinationId) {
      setMessage("Source and destination must be different.");
      return;
    }

    if (quantity <= 0) {
      setMessage("Quantity must be greater than 0.");
      return;
    }

    const source = items.find((item) => item.id === sourceId);

    if (!source) {
      setMessage("Source inventory item not found.");
      return;
    }

    if (quantity > source.quantity) {
      setMessage(`Not enough stock. Available: ${source.quantity}`);
      return;
    }

    try {
      await createStockTransfer({
        sourceInventoryItemId: sourceId,
        destinationInventoryItemId: destinationId,
        quantity,
      });

      setMessage("Stock transferred successfully.");
      setQuantity(1);
      await loadItems();
    } catch (error: any) {
      setMessage(error.message || "Transfer failed.");
    }
  }

  if (loading) {
    return <div className="p-6">Loading inventory...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Stock Transfers</h1>

      <div className="border rounded-lg p-5 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">
          Transfer Stock
        </h2>

        <div className="space-y-4">
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full border rounded-md p-3"
          >
            <option value="">Select source inventory</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.variant?.variantName || item.variantId} —{" "}
                {item.inventory?.warehouseId || item.inventoryId} —{" "}
                Quantity: {item.quantity}
              </option>
            ))}
          </select>

          <select
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="w-full border rounded-md p-3"
          >
            <option value="">Select destination inventory</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.variant?.variantName || item.variantId} —{" "}
                {item.inventory?.warehouseId || item.inventoryId} —{" "}
                Quantity: {item.quantity}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full border rounded-md p-3"
            placeholder="Quantity"
          />

          <button
            onClick={handleTransfer}
            className="bg-black text-white px-5 py-3 rounded-md"
          >
            Transfer Stock
          </button>

          {message && (
            <div className="border rounded-md p-3">
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4"
          >
            <div className="font-semibold">
              {item.variant?.variantName || item.variantId}
            </div>

            <div className="text-gray-600">
              Warehouse:{" "}
              {item.inventory?.warehouseId || item.inventoryId}
            </div>

            <div>
              Quantity: {item.quantity}
            </div>

            <div>
              Reorder Level: {item.reorderLevel}
            </div>

            <div>
              Status: {item.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}