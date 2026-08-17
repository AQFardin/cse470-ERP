export interface InventoryItem {
  id: string;
  inventoryId: string;
  variantId: string;
  quantity: number;
  reorderLevel: number;
  status: string;

  inventory?: {
    id: string;
    warehouseId: string;
  };

  variant?: {
    id: string;
    variantName: string;
    productId: string;
  };
}