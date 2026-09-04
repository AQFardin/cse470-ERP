import { getCurrentUserId } from '../../lib/api';
import type {
  Vendor, VendorBill, VendorPayment, CustomerInvoice, CustomerPayment,
  ApBillStatus, ArInvoiceStatus, PaymentMethod, PaymentRecordStatus,
  AgingBuckets, DashboardSummary, StatementRow, LineItemDraft, CustomerRef,
} from './types';

async function apiCall(base: string, url: string, options?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const userId = getCurrentUserId();
  if (userId) headers['x-current-user-id'] = userId;
  const res = await fetch(`${base}${url}`, { headers, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}

const apCall = (url: string, options?: RequestInit) => apiCall('/api/ap', url, options);
const arCall = (url: string, options?: RequestInit) => apiCall('/api/ar', url, options);

// ─── Vendors (AP) ────────────────────────────────────────

export async function fetchVendors(filters?: { isActive?: boolean; search?: string }): Promise<Vendor[]> {
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apCall(`/vendors${qs}`);
  return res.data || [];
}

export async function createVendor(data: { name: string; email?: string; phone?: string; address?: string }): Promise<Vendor> {
  const res = await apCall('/vendors', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function updateVendor(id: string, data: Partial<{ name: string; email: string | null; phone: string | null; address: string | null; isActive: boolean }>): Promise<Vendor> {
  const res = await apCall(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

// ─── Customers (AR — reuses the existing CRM module) ──────

export async function fetchCustomers(): Promise<CustomerRef[]> {
  const res = await fetch('/api/crm/customers', { headers: { 'x-current-user-id': getCurrentUserId() || '' } });
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

// ─── Vendor Bills ─────────────────────────────────────────

export interface BillInput {
  vendorId: string;
  billDate: string;
  dueDate: string;
  referenceNumber?: string;
  expenseAccountId: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
  items: LineItemDraft[];
}

export async function fetchVendorBills(filters?: { status?: ApBillStatus | 'ALL'; vendorId?: string; search?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.vendorId) params.set('vendorId', filters.vendorId);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apCall(`/bills${qs}`);
  return { bills: res.bills as VendorBill[], total: res.total, page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
}

export async function fetchVendorBill(id: string): Promise<VendorBill> {
  const res = await apCall(`/bills/${id}`);
  return res.data;
}

export async function createVendorBill(data: BillInput): Promise<VendorBill> {
  const res = await apCall('/bills', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function updateVendorBill(id: string, data: Partial<BillInput>): Promise<VendorBill> {
  const res = await apCall(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

export async function deleteVendorBill(id: string): Promise<void> {
  await apCall(`/bills/${id}`, { method: 'DELETE' });
}

export async function approveVendorBill(id: string): Promise<VendorBill> {
  const res = await apCall(`/bills/${id}/approve`, { method: 'POST' });
  return res.data;
}

export async function cancelVendorBill(id: string): Promise<VendorBill> {
  const res = await apCall(`/bills/${id}/cancel`, { method: 'POST' });
  return res.data;
}

// ─── Vendor Payments ──────────────────────────────────────

export interface VendorPaymentInput {
  vendorBillId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankAccountId: string;
  referenceNumber?: string;
  notes?: string;
}

export async function fetchVendorPayments(filters?: { vendorBillId?: string; status?: PaymentRecordStatus | 'ALL'; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (filters?.vendorBillId) params.set('vendorBillId', filters.vendorBillId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apCall(`/payments${qs}`);
  return { payments: res.payments as VendorPayment[], total: res.total, page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
}

export async function createVendorPayment(data: VendorPaymentInput): Promise<VendorPayment> {
  const res = await apCall('/payments', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function reverseVendorPayment(id: string): Promise<VendorPayment> {
  const res = await apCall(`/payments/${id}/reverse`, { method: 'POST' });
  return res.data;
}

export async function fetchVendorStatement(vendorId: string, filters?: { dateFrom?: string; dateTo?: string }) {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apCall(`/vendors/${vendorId}/statement${qs}`);
  return { vendor: res.vendor as Vendor, rows: res.rows as StatementRow[], closingBalance: res.closingBalance };
}

export async function fetchApAging(asOf?: string) {
  const qs = asOf ? `?asOf=${asOf}` : '';
  const res = await apCall(`/aging${qs}`);
  return { asOf: res.asOf, rows: res.rows as { vendor: Vendor; buckets: AgingBuckets }[] };
}

export async function fetchApDashboard(asOf?: string): Promise<DashboardSummary> {
  const qs = asOf ? `?asOf=${asOf}` : '';
  const res = await apCall(`/dashboard${qs}`);
  return res.data;
}

// ─── Customer Invoices ────────────────────────────────────

export interface InvoiceInput {
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  referenceNumber?: string;
  revenueAccountId: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
  items: LineItemDraft[];
}

export async function fetchCustomerInvoices(filters?: { status?: ArInvoiceStatus | 'ALL'; customerId?: string; search?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.customerId) params.set('customerId', filters.customerId);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await arCall(`/invoices${qs}`);
  return { invoices: res.invoices as CustomerInvoice[], total: res.total, page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
}

export async function fetchCustomerInvoice(id: string): Promise<CustomerInvoice> {
  const res = await arCall(`/invoices/${id}`);
  return res.data;
}

export async function createCustomerInvoice(data: InvoiceInput): Promise<CustomerInvoice> {
  const res = await arCall('/invoices', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function updateCustomerInvoice(id: string, data: Partial<InvoiceInput>): Promise<CustomerInvoice> {
  const res = await arCall(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

export async function deleteCustomerInvoice(id: string): Promise<void> {
  await arCall(`/invoices/${id}`, { method: 'DELETE' });
}

export async function issueCustomerInvoice(id: string): Promise<CustomerInvoice> {
  const res = await arCall(`/invoices/${id}/issue`, { method: 'POST' });
  return res.data;
}

export async function cancelCustomerInvoice(id: string): Promise<CustomerInvoice> {
  const res = await arCall(`/invoices/${id}/cancel`, { method: 'POST' });
  return res.data;
}

// ─── Customer Payments ────────────────────────────────────

export interface CustomerPaymentInput {
  customerInvoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankAccountId: string;
  referenceNumber?: string;
  notes?: string;
}

export async function fetchCustomerPayments(filters?: { customerInvoiceId?: string; status?: PaymentRecordStatus | 'ALL'; page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (filters?.customerInvoiceId) params.set('customerInvoiceId', filters.customerInvoiceId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await arCall(`/payments${qs}`);
  return { payments: res.payments as CustomerPayment[], total: res.total, page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
}

export async function createCustomerPayment(data: CustomerPaymentInput): Promise<CustomerPayment> {
  const res = await arCall('/payments', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

export async function reverseCustomerPayment(id: string): Promise<CustomerPayment> {
  const res = await arCall(`/payments/${id}/reverse`, { method: 'POST' });
  return res.data;
}

export async function fetchCustomerStatement(customerId: string, filters?: { dateFrom?: string; dateTo?: string }) {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await arCall(`/customers/${customerId}/statement${qs}`);
  return { customer: res.customer as CustomerRef, rows: res.rows as StatementRow[], closingBalance: res.closingBalance };
}

export async function fetchArAging(asOf?: string) {
  const qs = asOf ? `?asOf=${asOf}` : '';
  const res = await arCall(`/aging${qs}`);
  return { asOf: res.asOf, rows: res.rows as { customer: CustomerRef; buckets: AgingBuckets }[] };
}

export async function fetchArDashboard(asOf?: string): Promise<DashboardSummary> {
  const qs = asOf ? `?asOf=${asOf}` : '';
  const res = await arCall(`/dashboard${qs}`);
  return res.data;
}
