import { getCurrentUserId } from '../../lib/api';
import type { Budget, BudgetStatus, VsActualResult, DepartmentBreakdownRow, MonthlyPerformanceRow, BudgetingDashboard, DepartmentDashboard, ForecastResult, Department } from './types';

async function apiCall(url: string, options?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const userId = getCurrentUserId();
  if (userId) headers['x-current-user-id'] = userId;
  const res = await fetch(`/api/budgeting${url}`, { headers, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}

// ─── Budgets ──────────────────────────────────────────────

export interface BudgetLineInput {
  department?: Department | null;
  accountId: string;
  annualAmount: number;
  notes?: string;
  months?: { month: number; amount: number }[];
}

export interface BudgetInput {
  name: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  description?: string;
  lines: BudgetLineInput[];
}

export async function fetchBudgets(filters?: { fiscalYear?: number; status?: BudgetStatus | 'ALL'; search?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (filters?.fiscalYear) params.set('fiscalYear', String(filters.fiscalYear));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/budgets${qs}`);
  return { budgets: res.budgets as Budget[], total: res.total, page: res.page, totalPages: res.totalPages };
}

export async function fetchBudget(id: string): Promise<Budget> {
  const res = await apiCall(`/budgets/${id}`);
  return res.data;
}

export async function createBudget(data: BudgetInput): Promise<Budget> {
  const res = await apiCall('/budgets', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function updateBudget(id: string, data: Partial<BudgetInput>): Promise<Budget> {
  const res = await apiCall(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

export async function deleteBudget(id: string): Promise<void> {
  await apiCall(`/budgets/${id}`, { method: 'DELETE' });
}

export async function submitBudget(id: string): Promise<Budget> {
  const res = await apiCall(`/budgets/${id}/submit`, { method: 'POST' });
  return res.data;
}
export async function approveBudget(id: string): Promise<Budget> {
  const res = await apiCall(`/budgets/${id}/approve`, { method: 'POST' });
  return res.data;
}
export async function activateBudget(id: string): Promise<Budget> {
  const res = await apiCall(`/budgets/${id}/activate`, { method: 'POST' });
  return res.data;
}
export async function closeBudget(id: string): Promise<Budget> {
  const res = await apiCall(`/budgets/${id}/close`, { method: 'POST' });
  return res.data;
}
export async function cancelBudget(id: string): Promise<Budget> {
  const res = await apiCall(`/budgets/${id}/cancel`, { method: 'POST' });
  return res.data;
}
export async function reviseBudget(id: string): Promise<Budget> {
  const res = await apiCall(`/budgets/${id}/revise`, { method: 'POST' });
  return res.data;
}

// ─── Analysis ─────────────────────────────────────────────

export async function fetchVsActual(budgetId: string, filters?: { department?: Department; asOfDate?: string }): Promise<VsActualResult> {
  const params = new URLSearchParams();
  if (filters?.department) params.set('department', filters.department);
  if (filters?.asOfDate) params.set('asOfDate', filters.asOfDate);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/budgets/${budgetId}/vs-actual${qs}`);
  return res as VsActualResult & { success: boolean };
}

export async function fetchDepartmentBreakdown(budgetId: string, asOfDate?: string): Promise<{ budget: any; rows: DepartmentBreakdownRow[] }> {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : '';
  const res = await apiCall(`/budgets/${budgetId}/departments${qs}`);
  return { budget: res.budget, rows: res.rows };
}

export async function fetchMonthlyPerformance(budgetId: string, asOfDate?: string): Promise<{ budget: any; months: MonthlyPerformanceRow[] }> {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : '';
  const res = await apiCall(`/budgets/${budgetId}/monthly-performance${qs}`);
  return { budget: res.budget, months: res.months };
}

// ─── Dashboards ───────────────────────────────────────────

export async function fetchBudgetingDashboard(fiscalYear?: number): Promise<BudgetingDashboard> {
  const qs = fiscalYear ? `?fiscalYear=${fiscalYear}` : '';
  const res = await apiCall(`/dashboard${qs}`);
  return res.data;
}

export async function fetchDepartmentDashboard(department: Department, fiscalYear?: number): Promise<DepartmentDashboard> {
  const qs = fiscalYear ? `?fiscalYear=${fiscalYear}` : '';
  const res = await apiCall(`/department/${department}${qs}`);
  return res.data;
}

// ─── Forecast ─────────────────────────────────────────────

export async function fetchForecast(budgetId: string, asOfDate?: string): Promise<ForecastResult> {
  const params = new URLSearchParams({ budgetId });
  if (asOfDate) params.set('asOfDate', asOfDate);
  const res = await apiCall(`/forecast?${params.toString()}`);
  return res.data;
}

export async function calculateForecast(budgetId: string, asOfDate?: string): Promise<ForecastResult> {
  const res = await apiCall('/forecast/calculate', { method: 'POST', body: JSON.stringify({ budgetId, asOfDate }) });
  return res.data;
}
