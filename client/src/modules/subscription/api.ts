import type { MembershipPlan, Subscription } from './types';

const API_BASE = '/api/subscriptions';

async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return body;
}

// ─── Plans ───────────────────────────────────────────────

export async function fetchPlans(): Promise<MembershipPlan[]> {
  return apiCall('/plans');
}

export async function createPlan(data: {
  name: string;
  tier: string;
  price: number;
  billingIntervalDays?: number;
}): Promise<MembershipPlan> {
  return apiCall('/plans', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Subscriptions ───────────────────────────────────────

export async function fetchSubscriptions(): Promise<Subscription[]> {
  return apiCall('/subscriptions');
}

export async function createSubscription(data: {
  customerId: string;
  planId: string;
  startDate?: string;
}): Promise<Subscription> {
  return apiCall('/subscriptions', { method: 'POST', body: JSON.stringify(data) });
}

export async function cancelSubscription(id: string): Promise<Subscription> {
  return apiCall(`/subscriptions/${id}/cancel`, { method: 'PATCH' });
}

export async function changePlan(id: string, newPlanId: string): Promise<{ proratedAmount: number }> {
  return apiCall(`/subscriptions/${id}/change-plan`, {
    method: 'PATCH',
    body: JSON.stringify({ newPlanId }),
  });
}

// ─── Billing & Notices ───────────────────────────────────

export async function recordBillingCycle(subscriptionId: string, data: {
  amount: number;
  status?: string;
}) {
  return apiCall(`/subscriptions/${subscriptionId}/billing`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createRenewalNotice(subscriptionId: string, data: {
  noticeType: string;
  renewalDate: string;
}) {
  return apiCall(`/subscriptions/${subscriptionId}/notices`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
