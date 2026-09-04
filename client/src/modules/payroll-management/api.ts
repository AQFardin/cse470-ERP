import { getCurrentUserId } from '../../lib/api';
import type {
  SalaryComponent, EmployeeSalary, TaxRule, PayrollBonus, PayrollDeduction, PayrollPeriod,
  PayrollPayment, PayrollRecord, PayrollDashboard,
  SalaryComponentCategory, BonusType, DeductionType, PayrollApprovalStatus, PayrollPeriodStatus,
  PaymentMethod, PaymentRecordStatus,
} from './types';

async function apiCall(url: string, options?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const userId = getCurrentUserId();
  if (userId) headers['x-current-user-id'] = userId;
  const res = await fetch(`/api/payroll${url}`, { headers, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}

// ─── Salary Components ────────────────────────────────────

export async function fetchSalaryComponents(filters?: { category?: SalaryComponentCategory; isActive?: boolean }): Promise<SalaryComponent[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/salary-components${qs}`);
  return res.data || [];
}

export async function createSalaryComponent(data: { name: string; category: SalaryComponentCategory; isTaxable?: boolean }): Promise<SalaryComponent> {
  const res = await apiCall('/salary-components', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

// ─── Employee Salary ──────────────────────────────────────

export async function fetchEmployeeSalaryHistory(employeeId: string): Promise<EmployeeSalary[]> {
  const res = await apiCall(`/employees/${employeeId}/salary`);
  return res.data || [];
}

export async function assignEmployeeSalary(employeeId: string, data: {
  basicSalary: number;
  effectiveFrom: string;
  notes?: string;
  components?: { salaryComponentId: string; amount: number }[];
}): Promise<EmployeeSalary> {
  const res = await apiCall(`/employees/${employeeId}/salary`, { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

// ─── Tax Rules ────────────────────────────────────────────

export async function fetchTaxRules(filters?: { isActive?: boolean }): Promise<TaxRule[]> {
  const qs = filters?.isActive !== undefined ? `?isActive=${filters.isActive}` : '';
  const res = await apiCall(`/tax-rules${qs}`);
  return res.data || [];
}

export async function createTaxRule(data: { name: string; exemptionAmount?: number; slabs: { minAmount: number; maxAmount?: number | null; ratePercent: number }[] }): Promise<TaxRule> {
  const res = await apiCall('/tax-rules', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

// ─── Bonuses ──────────────────────────────────────────────

export async function fetchBonuses(filters?: { payrollPeriodId?: string; employeeId?: string; status?: PayrollApprovalStatus | 'ALL' }): Promise<PayrollBonus[]> {
  const params = new URLSearchParams();
  if (filters?.payrollPeriodId) params.set('payrollPeriodId', filters.payrollPeriodId);
  if (filters?.employeeId) params.set('employeeId', filters.employeeId);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/bonuses${qs}`);
  return res.data || [];
}

export async function createBonus(data: { employeeId: string; payrollPeriodId: string; bonusType: BonusType; amount: number; description?: string }): Promise<PayrollBonus> {
  const res = await apiCall('/bonuses', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function deleteBonus(id: string): Promise<void> {
  await apiCall(`/bonuses/${id}`, { method: 'DELETE' });
}

export async function approveBonus(id: string): Promise<PayrollBonus> {
  const res = await apiCall(`/bonuses/${id}/approve`, { method: 'POST' });
  return res.data;
}

export async function rejectBonus(id: string): Promise<PayrollBonus> {
  const res = await apiCall(`/bonuses/${id}/reject`, { method: 'POST' });
  return res.data;
}

// ─── Deductions ───────────────────────────────────────────

export async function fetchDeductions(filters?: { payrollPeriodId?: string; employeeId?: string; status?: PayrollApprovalStatus | 'ALL' }): Promise<PayrollDeduction[]> {
  const params = new URLSearchParams();
  if (filters?.payrollPeriodId) params.set('payrollPeriodId', filters.payrollPeriodId);
  if (filters?.employeeId) params.set('employeeId', filters.employeeId);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/deductions${qs}`);
  return res.data || [];
}

export async function createDeduction(data: { employeeId: string; payrollPeriodId: string; deductionType: DeductionType; amount: number; description?: string }): Promise<PayrollDeduction> {
  const res = await apiCall('/deductions', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function deleteDeduction(id: string): Promise<void> {
  await apiCall(`/deductions/${id}`, { method: 'DELETE' });
}

export async function approveDeduction(id: string): Promise<PayrollDeduction> {
  const res = await apiCall(`/deductions/${id}/approve`, { method: 'POST' });
  return res.data;
}

export async function rejectDeduction(id: string): Promise<PayrollDeduction> {
  const res = await apiCall(`/deductions/${id}/reject`, { method: 'POST' });
  return res.data;
}

// ─── Payroll Periods ──────────────────────────────────────

export async function fetchPayrollPeriods(filters?: { status?: PayrollPeriodStatus | 'ALL'; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/periods${qs}`);
  return { periods: res.periods as PayrollPeriod[], total: res.total, page: res.page, totalPages: res.totalPages };
}

export async function fetchPayrollPeriod(id: string): Promise<PayrollPeriod> {
  const res = await apiCall(`/periods/${id}`);
  return res.data;
}

export async function createPayrollPeriod(data: { name: string; startDate: string; endDate: string; payDate: string; workingDays?: number; taxRuleId?: string }): Promise<PayrollPeriod> {
  const res = await apiCall('/periods', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function calculatePayrollPeriod(id: string): Promise<{ period: PayrollPeriod; processedCount: number; skippedCount: number }> {
  const res = await apiCall(`/periods/${id}/calculate`, { method: 'POST' });
  return { period: res.data, processedCount: res.processedCount, skippedCount: res.skippedCount };
}

export async function approvePayrollPeriod(id: string): Promise<PayrollPeriod> {
  const res = await apiCall(`/periods/${id}/approve`, { method: 'POST' });
  return res.data;
}

export async function cancelPayrollPeriod(id: string): Promise<PayrollPeriod> {
  const res = await apiCall(`/periods/${id}/cancel`, { method: 'POST' });
  return res.data;
}

// ─── Payroll Payments ─────────────────────────────────────

export async function fetchPayrollPayments(filters?: { payrollPeriodId?: string; status?: PaymentRecordStatus | 'ALL' }): Promise<PayrollPayment[]> {
  const params = new URLSearchParams();
  if (filters?.payrollPeriodId) params.set('payrollPeriodId', filters.payrollPeriodId);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/payments${qs}`);
  return res.data || [];
}

export async function createPayrollPayment(data: { payrollPeriodId: string; paymentDate: string; paymentMethod: PaymentMethod; bankAccountId: string; referenceNumber?: string }): Promise<PayrollPayment> {
  const res = await apiCall('/payments', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function reversePayrollPayment(id: string): Promise<PayrollPayment> {
  const res = await apiCall(`/payments/${id}/reverse`, { method: 'POST' });
  return res.data;
}

// ─── Dashboard & Reports ──────────────────────────────────

export async function fetchPayrollDashboard(): Promise<PayrollDashboard> {
  const res = await apiCall('/dashboard');
  return res.data;
}

export async function fetchPayrollSummaryReport(periodId: string): Promise<{ period: PayrollPeriod; records: PayrollRecord[]; totals: any }> {
  const res = await apiCall(`/reports/summary?periodId=${periodId}`);
  return { period: res.period, records: res.records, totals: res.totals };
}

export async function fetchTaxReport(periodId: string): Promise<{ records: PayrollRecord[]; totalTax: string | number }> {
  const res = await apiCall(`/reports/tax?periodId=${periodId}`);
  return { records: res.records, totalTax: res.totalTax };
}

export async function fetchSalaryExpenseReport(filters?: { dateFrom?: string; dateTo?: string }) {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/reports/salary-expense${qs}`);
  return res.rows as { periodId: string; periodName: string; grossSalary: string | number; bonus: string | number; otherCosts: string | number; total: string | number }[];
}

export async function fetchPayslip(employeeId: string, periodId: string): Promise<PayrollRecord> {
  const res = await apiCall(`/employees/${employeeId}/payslip?periodId=${periodId}`);
  return res.data;
}
