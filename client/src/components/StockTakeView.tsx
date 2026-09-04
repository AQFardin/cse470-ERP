import { useEffect, useState } from "react";
import { getInventoryItems, createStockTake } from "../modules/inventory/api";
import type { InventoryItem } from "../modules/inventory/types";

export default function StockTakeView() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemId, setItemId] = useState("");
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [reason, setReason] = useState("Periodic stock take");
  const [message, setMessage] = useState("");

  async function loadItems() {
    try {
      const data = await getInventoryItems();
      setItems(data);
    } catch (error: any) {
      setMessage(error.message || "Failed to load inventory");
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleStockTake() {
    setMessage("");

    if (!itemId) {
      setMessage("Select an inventory item.");
      return;
    }

    if (countedQuantity < 0) {
      setMessage("Quantity cannot be negative.");
      return;
    }

    try {
      await createStockTake({
        inventoryItemId: itemId,
        countedQuantity,
        employeeId: "346c3869-51a5-4255-a777-d944f19ea7de",
        reason,
      });

      setMessage("Stock take completed successfully.");
      await loadItems();
    } catch (error: any) {
      setMessage(error.message || "Stock take failed.");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Stock Take</h1>

      <div className="border rounded-lg p-5 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">
          Adjust Inventory Count
        </h2>

        <div className="space-y-4">
          <select
            value={itemId}
            onChange={(e) => {
              const id = e.target.value;
              setItemId(id);

              const item = items.find((x) => x.id === id);

              if (item) {
                setCountedQuantity(item.quantity);
              }
            }}
            className="w-full border rounded-md p-3"
          >
            <option value="">Select inventory item</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.variant?.variantName || item.variantId} — Current:{" "}
                {item.quantity}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            value={countedQuantity}
            onChange={(e) => setCountedQuantity(Number(e.target.value))}
            className="w-full border rounded-md p-3"
            placeholder="Counted quantity"
          />

          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded-md p-3"
            placeholder="Reason"
          />

          <button
            onClick={handleStockTake}
            className="bg-black text-white px-5 py-3 rounded-md"
          >
            Complete Stock Take
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
          <div key={item.id} className="border rounded-lg p-4">
            <div className="font-semibold">
              {item.variant?.variantName || item.variantId}
            </div>

            <div>Current Quantity: {item.quantity}</div>

            <div>Reorder Level: {item.reorderLevel}</div>

            <div>Status: {item.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}