import type { Order, ReturnRequest } from './types';

const API_BASE = '/api/returns';

async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}

export async function fetchOrders(): Promise<Order[]> {
  return apiCall('/orders');
}

export async function createOrder(data: {
  customerId: string;
  items: { skuId: string; quantity: number; price: number }[];
}): Promise<Order> {
  return apiCall('/orders', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchReturnRequests(): Promise<ReturnRequest[]> {
  return apiCall('/requests');
}

export async function createReturnRequest(data: {
  customerId: string;
  orderId: string;
  orderItemId: string;
  reason: string;
}): Promise<ReturnRequest> {
  return apiCall('/requests', { method: 'POST', body: JSON.stringify(data) });
}

export async function approveReturnRequest(id: string) {
  return apiCall(`/requests/${id}/approve`, { method: 'PATCH' });
}

export async function rejectReturnRequest(id: string) {
  return apiCall(`/requests/${id}/reject`, { method: 'PATCH' });
}

export async function createRefundTransaction(returnRequestId: string, data: { amount: number; method?: string }) {
  return apiCall(`/requests/${returnRequestId}/refund`, { method: 'POST', body: JSON.stringify(data) });
}