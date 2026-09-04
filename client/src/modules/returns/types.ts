export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  skuId: string;
  sku: { id: string; skuCode: string; quantity: number };
}

export interface Order {
  id: string;
  orderDate: string;
  totalAmount: number;
  customerId: string;
  customer: { id: string; name: string; email: string };
  items: OrderItem[];
}

export interface ReturnRequest {
  id: string;
  reason: string;
  status: string;
  reqDate: string;
  customerId: string;
  customer: { id: string; name: string };
  orderId: string;
  order: Order;
  orderItemId: string;
  orderItem: OrderItem;
  refundTransaction?: { id: string; amount: number; method: string; refundDate: string } | null;
  creditNote?: { id: string; amount: number; issueDate: string } | null;
}