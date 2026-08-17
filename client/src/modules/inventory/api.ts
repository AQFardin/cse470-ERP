const API_BASE = "http://localhost:3001/api/inventory";

export async function getInventoryItems() {
  const response = await fetch(`${API_BASE}/inventory-items`);

  if (!response.ok) {
    throw new Error("Failed to fetch inventory items");
  }

  return response.json();
}

export async function getLowStockItems() {
  const response = await fetch(`${API_BASE}/low-stock`);

  if (!response.ok) {
    throw new Error("Failed to fetch low stock items");
  }

  return response.json();
}
export async function createStockTransfer(data: {
  sourceInventoryItemId: string;
  destinationInventoryItemId: string;
  quantity: number;
}) {
  const response = await fetch(`${API_BASE}/stock-transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to transfer stock");
  }

  return response.json();
}
export async function createStockTake(data: {
  inventoryItemId: string;
  countedQuantity: number;
  employeeId: string;
  reason: string;
}) {
  const response = await fetch(`${API_BASE}/stock-take`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to complete stock take");
  }

  return response.json();
}