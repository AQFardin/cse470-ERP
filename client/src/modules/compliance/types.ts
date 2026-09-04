export type TaxType = 'VAT' | 'GST' | 'SALES_TAX' | 'SERVICE_TAX' | 'OTHER';
export type TaxCategory = 'STANDARD' | 'REDUCED' | 'ZERO_RATED' | 'EXEMPT' | 'OUT_OF_SCOPE';
export type TaxDirection = 'INPUT' | 'OUTPUT';
export type TaxSourceType = 'AR_INVOICE' | 'AP_BILL';
export type TaxTransactionStatus = 'ACTIVE' | 'REVERSED';
export type TaxPeriodStatus = 'OPEN' | 'REVIEW' | 'FINALIZED' | 'FILED' | 'CLOSED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'MOBILE_PAYMENT' | 'OTHER';
export type PaymentRecordStatus = 'POSTED' | 'REVERSED';

export interface TaxRate {
  id: string;
  taxCodeId: string;
  ratePercent: string | number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TaxCode {
  id: string;
  name: string;
  code: string;
  type: TaxType;
  region: string | null;
  category: TaxCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rates: TaxRate[];
}

export interface TaxCalculationResult {
  taxCodeId: string;
  taxRateId: string | null;
  category: TaxCategory;
  ratePercent: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
  total: string | number;
}

export interface TaxTransaction {
  id: string;
  sourceType: TaxSourceType;
  sourceId: string;
  transactionDate: string;
  direction: TaxDirection;
  taxCodeId: string;
  taxCode?: TaxCode;
  taxRateId: string | null;
  category: TaxCategory;
  ratePercent: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
  status: TaxTransactionStatus;
  taxPeriodId: string | null;
  createdAt: string;
}

export interface TaxPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: TaxPeriodStatus;
  outputTax: string | number | null;
  inputTax: string | number | null;
  adjustments: string | number;
  netPayable: string | number | null;
  calculatedAt: string | null;
  createdById: string;
  createdBy?: { id: string; name: string };
  reviewedBy?: { id: string; name: string } | null;
  finalizedBy?: { id: string; name: string } | null;
  filedBy?: { id: string; name: string } | null;
  closedAt: string | null;
  payment?: TaxPayment | null;
}

export interface TaxPayment {
  id: string;
  taxPeriodId: string;
  taxPeriod?: { id: string; name: string };
  amount: string | number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  status: PaymentRecordStatus;
  bankAccountId: string;
  bankAccount?: { id: string; code: string; name: string };
  journalEntryId: string | null;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface ComplianceDashboard {
  openPeriods: number;
  activeTaxCodes: number;
  latestPeriod: TaxPeriod | null;
  outstandingLiability: string | number;
  unpaidFinalizedPeriods: { id: string; name: string; netPayable: string | number | null; dueDate: string }[];
  totalOutputTax: string | number;
  totalInputTax: string | number;
}

export interface TaxSummaryLine {
  taxCode: TaxCode | null;
  taxableAmount: string | number;
  taxAmount: string | number;
  transactionCount: number;
}

export interface TaxSummaryReport {
  lines: TaxSummaryLine[];
  totals: { taxableAmount: string | number; taxAmount: string | number };
}

export interface TaxLiabilityReport {
  periods: (TaxPeriod & { payment: { amount: string | number; status: PaymentRecordStatus } | null })[];
  totalLiability: string | number;
  totalPaid: string | number;
  totalOutstanding: string | number;
}

export interface StatutoryFilingLine {
  taxCode: string;
  category: TaxCategory;
  ratePercent: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
  count: number;
}

export interface StatutoryFilingReport {
  period: { id: string; name: string; startDate: string; endDate: string; dueDate: string; status: TaxPeriodStatus };
  filing: {
    finalizedBy: { id: string; name: string } | null;
    finalizedAt: string | null;
    filedBy: { id: string; name: string } | null;
    filedAt: string | null;
  };
  outputTax: { lines: StatutoryFilingLine[]; total: string | number };
  inputTax: { lines: StatutoryFilingLine[]; total: string | number };
  adjustments: string | number;
  netPayable: string | number;
  payment: { amount: string | number; paymentDate: string; status: PaymentRecordStatus; referenceNumber: string | null } | null;
  generatedAt: string;
}
