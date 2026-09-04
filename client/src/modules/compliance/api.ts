import { getCurrentUserId } from '../../lib/api';
import type {
  TaxCode,
  TaxRate,
  TaxType,
  TaxCategory,
  TaxCalculationResult,
  TaxPeriod,
  TaxPeriodStatus,
  TaxTransaction,
  TaxPayment,
  PaymentMethod,
  ComplianceDashboard,
  TaxSummaryReport,
  TaxLiabilityReport,
  StatutoryFilingReport,
} from './types';

async function apiCall(url: string, options?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const userId = getCurrentUserId();
  if (userId) headers['x-current-user-id'] = userId;
  const res = await fetch(`/api/compliance${url}`, { headers, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}

// ─── Dashboard & Reports ────────────────────────────────────

export async function fetchDashboard(): Promise<ComplianceDashboard> {
  return (await apiCall('/dashboard')).data;
}

export async function fetchSalesTaxReport(from?: string, to?: string): Promise<TaxSummaryReport> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return (await apiCall(`/reports/sales-tax${qs}`)).data;
}

export async function fetchPurchaseTaxReport(from?: string, to?: string): Promise<TaxSummaryReport> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return (await apiCall(`/reports/purchase-tax${qs}`)).data;
}

export async function fetchTaxLiabilityReport(): Promise<TaxLiabilityReport> {
  return (await apiCall('/reports/liability')).data;
}

export async function fetchTaxPaymentsReport(): Promise<{ payments: TaxPayment[]; totalPaid: string | number }> {
  return (await apiCall('/reports/payments')).data;
}

// ─── Tax Codes & Rates ───────────────────────────────────────

export async function fetchTaxCodes(filters?: { type?: TaxType; category?: TaxCategory; isActive?: boolean }): Promise<TaxCode[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return (await apiCall(`/tax-codes${qs}`)).data;
}

export async function createTaxCode(data: { name: string; code: string; type: TaxType; region?: string; category?: TaxCategory }): Promise<TaxCode> {
  return (await apiCall('/tax-codes', { method: 'POST', body: JSON.stringify(data) })).data;
}

export async function updateTaxCode(id: string, data: { name?: string; region?: string; category?: TaxCategory; isActive?: boolean }): Promise<TaxCode> {
  return (await apiCall(`/tax-codes/${id}`, { method: 'PUT', body: JSON.stringify(data) })).data;
}

export async function createTaxRate(taxCodeId: string, data: { ratePercent: number; effectiveFrom: string; effectiveTo?: string | null }): Promise<TaxRate> {
  return (await apiCall(`/tax-codes/${taxCodeId}/rates`, { method: 'POST', body: JSON.stringify(data) })).data;
}

export async function updateTaxRate(rateId: string, data: { effectiveTo?: string | null; isActive?: boolean }): Promise<TaxRate> {
  return (await apiCall(`/tax-rates/${rateId}`, { method: 'PUT', body: JSON.stringify(data) })).data;
}

// ─── Calculation preview ─────────────────────────────────────

export async function previewTax(taxCodeId: string, amount: number, amountType: 'EXCLUSIVE' | 'INCLUSIVE', asOf?: string): Promise<TaxCalculationResult> {
  return (await apiCall('/calculate', { method: 'POST', body: JSON.stringify({ taxCodeId, amount, amountType, asOf }) })).data;
}

// ─── Tax Periods ─────────────────────────────────────────────

export async function fetchTaxPeriods(status?: TaxPeriodStatus): Promise<TaxPeriod[]> {
  const qs = status ? `?status=${status}` : '';
  return (await apiCall(`/periods${qs}`)).data;
}

export async function fetchTaxPeriod(id: string): Promise<TaxPeriod> {
  return (await apiCall(`/periods/${id}`)).data;
}

export async function fetchTaxPeriodTransactions(id: string): Promise<TaxTransaction[]> {
  return (await apiCall(`/periods/${id}/transactions`)).data;
}

export async function fetchStatutoryFilingReport(id: string): Promise<StatutoryFilingReport> {
  return (await apiCall(`/periods/${id}/filing-report`)).data;
}

export async function createTaxPeriod(data: { name: string; startDate: string; endDate: string; dueDate: string }): Promise<TaxPeriod> {
  return (await apiCall('/periods', { method: 'POST', body: JSON.stringify(data) })).data;
}

export async function calculateTaxPeriod(id: string): Promise<TaxPeriod> {
  return (await apiCall(`/periods/${id}/calculate`, { method: 'POST' })).data;
}

export async function reviewTaxPeriod(id: string): Promise<TaxPeriod> {
  return (await apiCall(`/periods/${id}/review`, { method: 'POST' })).data;
}

export async function finalizeTaxPeriod(id: string): Promise<TaxPeriod> {
  return (await apiCall(`/periods/${id}/finalize`, { method: 'POST' })).data;
}

export async function fileTaxPeriod(id: string): Promise<TaxPeriod> {
  return (await apiCall(`/periods/${id}/file`, { method: 'POST' })).data;
}

export async function closeTaxPeriod(id: string): Promise<TaxPeriod> {
  return (await apiCall(`/periods/${id}/close`, { method: 'POST' })).data;
}

// ─── Tax Payments ─────────────────────────────────────────────

export async function fetchTaxPayments(): Promise<TaxPayment[]> {
  return (await apiCall('/payments')).data;
}

export async function createTaxPayment(data: { taxPeriodId: string; amount: number; paymentDate: string; paymentMethod: PaymentMethod; bankAccountId: string; referenceNumber?: string }): Promise<TaxPayment> {
  return (await apiCall('/payments', { method: 'POST', body: JSON.stringify(data) })).data;
}

export async function reverseTaxPayment(id: string): Promise<TaxPayment> {
  return (await apiCall(`/payments/${id}/reverse`, { method: 'POST' })).data;
}
