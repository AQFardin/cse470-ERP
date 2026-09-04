import { getCurrentUserId } from '../../lib/api';
import type { Account, AccountType, JournalEntry, JournalStatus, AccountLedgerResult, TrialBalanceResult, BalanceSheetResult, IncomeStatementResult, CashFlowStatementResult, FiscalPeriod } from './types';

const API_BASE = '/api/general-ledger';

async function apiCall(url: string, options?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const userId = getCurrentUserId();
  if (userId) headers['x-current-user-id'] = userId;

  const res = await fetch(`${API_BASE}${url}`, { headers, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return body;
}

// ─── Chart of Accounts ───────────────────────────────────

export async function fetchAccounts(filters?: { type?: AccountType; isActive?: boolean; search?: string }): Promise<Account[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/accounts${qs}`);
  return res.data || [];
}

export async function fetchAccount(id: string): Promise<Account> {
  const res = await apiCall(`/accounts/${id}`);
  return res.data;
}

export async function createAccount(data: {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string | null;
  description?: string;
}): Promise<Account> {
  const res = await apiCall('/accounts', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function updateAccount(id: string, data: Partial<{
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
}>): Promise<Account> {
  const res = await apiCall(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

// ─── Journal Entries ──────────────────────────────────────

export interface JournalListFilters {
  status?: JournalStatus | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  accountId?: string;
  page?: number;
  pageSize?: number;
}

export interface JournalListResult {
  entries: JournalEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchJournalEntries(filters?: JournalListFilters): Promise<JournalListResult> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.accountId) params.set('accountId', filters.accountId);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/journals${qs}`);
  return { entries: res.entries || [], total: res.total, page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
}

export async function fetchJournalEntry(id: string): Promise<JournalEntry> {
  const res = await apiCall(`/journals/${id}`);
  return res.data;
}

export interface JournalLineDraft {
  accountId: string;
  description?: string;
  debit?: number;
  credit?: number;
}

export async function createJournalEntry(data: {
  transactionDate: string;
  description: string;
  currency?: string;
  lines: JournalLineDraft[];
}): Promise<JournalEntry> {
  const res = await apiCall('/journals', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function updateJournalEntry(id: string, data: Partial<{
  transactionDate: string;
  description: string;
  currency: string;
  lines: JournalLineDraft[];
}>): Promise<JournalEntry> {
  const res = await apiCall(`/journals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await apiCall(`/journals/${id}`, { method: 'DELETE' });
}

export async function postJournalEntry(id: string): Promise<JournalEntry> {
  const res = await apiCall(`/journals/${id}/post`, { method: 'POST' });
  return res.data;
}

export async function lockJournalEntry(id: string): Promise<JournalEntry> {
  const res = await apiCall(`/journals/${id}/lock`, { method: 'POST' });
  return res.data;
}

export async function reverseJournalEntry(id: string, data?: { transactionDate?: string; description?: string }): Promise<JournalEntry> {
  const res = await apiCall(`/journals/${id}/reverse`, { method: 'POST', body: JSON.stringify(data || {}) });
  return res.data;
}

// ─── Reports ──────────────────────────────────────────────

export async function fetchAccountLedger(accountId: string, filters?: {
  dateFrom?: string;
  dateTo?: string;
  reference?: string;
  page?: number;
  pageSize?: number;
}): Promise<AccountLedgerResult> {
  const params = new URLSearchParams({ accountId });
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.reference) params.set('reference', filters.reference);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const res = await apiCall(`/ledger?${params.toString()}`);
  return res as AccountLedgerResult & { success: boolean };
}

export async function fetchTrialBalance(filters?: { dateFrom?: string; dateTo?: string; accountId?: string }): Promise<TrialBalanceResult> {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.accountId) params.set('accountId', filters.accountId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiCall(`/trial-balance${qs}`);
  return res as TrialBalanceResult & { success: boolean };
}

// ─── Financial Statements ─────────────────────────────────

export async function fetchBalanceSheet(asOfDate?: string): Promise<BalanceSheetResult> {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : '';
  const res = await apiCall(`/balance-sheet${qs}`);
  return res.data;
}

export async function fetchIncomeStatement(startDate: string, endDate: string): Promise<IncomeStatementResult> {
  const res = await apiCall(`/income-statement?startDate=${startDate}&endDate=${endDate}`);
  return res.data;
}

export async function fetchCashFlowStatement(startDate: string, endDate: string): Promise<CashFlowStatementResult> {
  const res = await apiCall(`/cash-flow-statement?startDate=${startDate}&endDate=${endDate}`);
  return res.data;
}

// ─── Fiscal Periods ───────────────────────────────────────

export async function fetchFiscalPeriods(): Promise<FiscalPeriod[]> {
  const res = await apiCall('/fiscal-periods');
  return res.data;
}

export async function createFiscalPeriod(data: { name: string; startDate: string; endDate: string }): Promise<FiscalPeriod> {
  const res = await apiCall('/fiscal-periods', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function closeFiscalPeriod(id: string): Promise<FiscalPeriod> {
  const res = await apiCall(`/fiscal-periods/${id}/close`, { method: 'POST' });
  return res.data;
}

export async function reopenFiscalPeriod(id: string): Promise<FiscalPeriod> {
  const res = await apiCall(`/fiscal-periods/${id}/reopen`, { method: 'POST' });
  return res.data;
}
