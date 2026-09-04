export type ApBillStatus = 'DRAFT' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type ArInvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'MOBILE_PAYMENT' | 'OTHER';
export type PaymentRecordStatus = 'POSTED' | 'REVERSED';

export interface Vendor {
  id: string;
  vendorId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface LineItemDraft {
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string | null;
}

export interface LineItem extends LineItemDraft {
  id: string;
  amount: string | number;
}

export interface VendorBill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendor: Vendor;
  billDate: string;
  dueDate: string;
  referenceNumber?: string | null;
  currency: string;
  subtotal: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  paidAmount: string | number;
  status: ApBillStatus;
  isOverdue?: boolean;
  notes?: string | null;
  expenseAccountId: string;
  expenseAccount?: { id: string; code: string; name: string };
  payableAccountId: string;
  payableAccount?: { id: string; code: string; name: string };
  createdBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string } | null;
  approvedAt?: string | null;
  journalEntryId?: string | null;
  journalEntry?: { id: string; entryNumber: string; status: string } | null;
  items: LineItem[];
  payments?: VendorPayment[];
}

export interface VendorPayment {
  id: string;
  paymentNumber: string;
  vendorBillId: string;
  vendorBill?: VendorBill;
  amount: string | number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  status: PaymentRecordStatus;
  bankAccount?: { id: string; code: string; name: string };
  journalEntryId?: string | null;
  createdBy?: { id: string; name: string };
  reversedAt?: string | null;
}

export interface CustomerRef {
  id: string;
  customerId: string;
  name: string;
  email?: string;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: CustomerRef;
  invoiceDate: string;
  dueDate: string;
  referenceNumber?: string | null;
  currency: string;
  subtotal: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  paidAmount: string | number;
  status: ArInvoiceStatus;
  isOverdue?: boolean;
  notes?: string | null;
  revenueAccountId: string;
  revenueAccount?: { id: string; code: string; name: string };
  receivableAccountId: string;
  receivableAccount?: { id: string; code: string; name: string };
  createdBy?: { id: string; name: string };
  issuedBy?: { id: string; name: string } | null;
  issuedAt?: string | null;
  journalEntryId?: string | null;
  journalEntry?: { id: string; entryNumber: string; status: string } | null;
  items: LineItem[];
  payments?: CustomerPayment[];
}

export interface CustomerPayment {
  id: string;
  paymentNumber: string;
  customerInvoiceId: string;
  customerInvoice?: CustomerInvoice;
  amount: string | number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  status: PaymentRecordStatus;
  bankAccount?: { id: string; code: string; name: string };
  journalEntryId?: string | null;
  createdBy?: { id: string; name: string };
  reversedAt?: string | null;
}

export interface AgingBuckets {
  current: string | number;
  d1_30: string | number;
  d31_60: string | number;
  d61_90: string | number;
  d90plus: string | number;
}

export interface DashboardSummary {
  totalOutstanding: string | number;
  dueToday: string | number;
  dueThisWeek: string | number;
  overdue: string | number;
  partiallyPaid: { count: number; amount: string | number };
  paid: { count: number; amount: string | number };
}

export interface StatementRow {
  date: string;
  reference: string;
  description: string;
  debit: string | number;
  credit: string | number;
  balance: string | number;
}
