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