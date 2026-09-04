export type SalaryComponentCategory = 'ALLOWANCE' | 'DEDUCTION';
export type SalaryComponentCalcType = 'FIXED' | 'PERCENT_OF_BASIC';
export type PayrollPeriodStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED';
export type BonusType = 'PERFORMANCE' | 'FESTIVAL' | 'ANNUAL' | 'COMMISSION' | 'OTHER';
export type DeductionType = 'LOAN' | 'ADVANCE' | 'INSURANCE' | 'OTHER';
export type PayrollApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'MOBILE_PAYMENT' | 'OTHER';
export type PaymentRecordStatus = 'POSTED' | 'REVERSED';

export interface SalaryComponent {
  id: string;
  name: string;
  category: SalaryComponentCategory;
  calcType: SalaryComponentCalcType;
  isTaxable: boolean;
  isActive: boolean;
}

export interface EmployeeSalaryComponentValue {
  id: string;
  amount: string | number;
  salaryComponent: SalaryComponent;
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  basicSalary: string | number;
  currency: string;
  effectiveFrom: string;
  notes?: string | null;
  createdBy?: { id: string; name: string };
  components: EmployeeSalaryComponentValue[];
}

export interface TaxSlab {
  id: string;
  minAmount: string | number;
  maxAmount?: string | number | null;
  ratePercent: string | number;
}

export interface TaxRule {
  id: string;
  name: string;
  exemptionAmount: string | number;
  isActive: boolean;
  slabs: TaxSlab[];
}

export interface EmployeeRef {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}

export interface PayrollBonus {
  id: string;
  employeeId: string;
  employee?: EmployeeRef;
  payrollPeriodId: string;
  bonusType: BonusType;
  amount: string | number;
  description?: string | null;
  status: PayrollApprovalStatus;
}

export interface PayrollDeduction {
  id: string;
  employeeId: string;
  employee?: EmployeeRef;
  payrollPeriodId: string;
  deductionType: DeductionType;
  amount: string | number;
  description?: string | null;
  status: PayrollApprovalStatus;
}

export interface PayrollRecordLine {
  id: string;
  category: 'BASIC' | 'ALLOWANCE' | 'BONUS' | 'DEDUCTION' | 'TAX' | 'UNPAID_LEAVE';
  name: string;
  amount: string | number;
}

export interface PayrollRecord {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employee: EmployeeRef;
  departmentSnapshot: string;
  positionSnapshot: string;
  basicSalary: string | number;
  allowancesTotal: string | number;
  bonusTotal: string | number;
  grossEarnings: string | number;
  taxableIncome: string | number;
  taxAmount: string | number;
  unpaidLeaveDeduction: string | number;
  otherDeductionsTotal: string | number;
  totalDeductions: string | number;
  netSalary: string | number;
  workingDays: number;
  unpaidLeaveDays: number;
  lines?: PayrollRecordLine[];
  payrollPeriod?: { id: string; name: string; startDate: string; endDate: string; payDate: string; status: PayrollPeriodStatus };
}

export interface PayrollPayment {
  id: string;
  payrollPeriodId: string;
  payrollPeriod?: { id: string; name: string };
  amount: string | number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  status: PaymentRecordStatus;
  bankAccount?: { id: string; code: string; name: string };
  createdBy?: { id: string; name: string };
}

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
  workingDays: number;
  status: PayrollPeriodStatus;
  taxRuleId?: string | null;
  taxRule?: TaxRule | null;
  createdBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string } | null;
  approvedAt?: string | null;
  journalEntryId?: string | null;
  journalEntry?: { id: string; entryNumber: string; status: string } | null;
  payment?: PayrollPayment | null;
  records?: PayrollRecord[];
  _count?: { records: number };
}

export interface PayrollDashboard {
  currentPeriod: { id: string; name: string; status: PayrollPeriodStatus; employeesProcessed: number; totalGrossSalary: string | number; totalTax: string | number; totalDeductions: string | number; totalNetSalary: string | number } | null;
  pendingApprovalCount: number;
  paidPeriodsCount: number;
  totalPaidNetAllTime: string | number;
}
