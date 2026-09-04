export type BudgetStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type VarianceStatus = 'UNDER_BUDGET' | 'ON_BUDGET' | 'OVER_BUDGET' | 'NO_BUDGET';
export type Department = 'ENGINEERING' | 'HR' | 'FINANCE' | 'MARKETING' | 'SALES' | 'OPERATIONS';

export interface BudgetLineMonth {
  id: string;
  month: number;
  amount: string | number;
}

export interface BudgetLine {
  id: string;
  budgetId: string;
  department?: Department | null;
  accountId: string;
  account: { id: string; code: string; name: string; type: string };
  annualAmount: string | number;
  notes?: string | null;
  months: BudgetLineMonth[];
}

export interface Budget {
  id: string;
  name: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  description?: string | null;
  status: BudgetStatus;
  version: number;
  revisedFromId?: string | null;
  revisedFrom?: { id: string; name: string; version: number } | null;
  revisions?: { id: string; name: string; version: number; status: BudgetStatus }[];
  createdBy?: { id: string; name: string };
  submittedBy?: { id: string; name: string } | null;
  approvedBy?: { id: string; name: string } | null;
  activatedBy?: { id: string; name: string } | null;
  lines: BudgetLine[];
  _count?: { lines: number };
}

export interface VsActualRow {
  lineId: string;
  department: Department | null;
  account: { id: string; code: string; name: string; type: string };
  budget: string | number;
  actual: string | number;
  variance: string | number;
  variancePercent: number | null;
  utilizationPercent: number | null;
  status: VarianceStatus;
}

export interface VsActualResult {
  budget: { id: string; name: string; fiscalYear: number; status: BudgetStatus; startDate: string; endDate: string };
  asOf: string;
  rows: VsActualRow[];
  totals: { budget: string | number; actual: string | number; variance: string | number; variancePercent: number | null; utilizationPercent: number | null; status: VarianceStatus };
}

export interface DepartmentBreakdownRow {
  department: Department | null;
  budget: string | number;
  actual: string | number;
  variance: string | number;
  variancePercent: number | null;
  utilizationPercent: number | null;
  status: VarianceStatus;
}

export interface MonthlyPerformanceRow {
  month: number;
  year: number;
  label: string;
  budget: string | number;
  actual: string | number;
  variance: string | number;
  variancePercent: number | null;
  utilizationPercent: number | null;
  status: VarianceStatus;
  isFuture: boolean;
}

export interface BudgetingDashboard {
  activeBudgetCount: number;
  totalBudget: string | number;
  totalActual: string | number;
  remaining: string | number;
  utilizationPercent: number | null;
  departments: DepartmentBreakdownRow[];
  overBudgetDepartments: DepartmentBreakdownRow[];
}

export interface DepartmentDashboard {
  department: Department;
  budget: string | number;
  actual: string | number;
  variance: string | number;
  variancePercent: number | null;
  utilizationPercent: number | null;
  status: VarianceStatus;
  accounts: { account: { id: string; code: string; name: string }; budget: string | number; actual: string | number; variance: string | number; variancePercent: number | null; utilizationPercent: number | null; status: VarianceStatus }[];
}

export interface ForecastResult {
  method: 'RUN_RATE';
  budget: { id: string; name: string; fiscalYear: number };
  totalBudget: string | number;
  actualYtd: string | number;
  monthsElapsed: number;
  totalMonths: number;
  averageMonthlyActual: string | number;
  projectedAnnualActual: string | number;
  forecastVariance: string | number;
  forecastVariancePercent: number | null;
  status: 'EXPECTED_OVERRUN' | 'EXPECTED_WITHIN_BUDGET' | 'ON_TRACK' | 'NO_BUDGET';
  departments: { department: Department | null; budget: string | number; actualYtd: string | number; projectedAnnualActual: string | number; forecastVariance: string | number; forecastVariancePercent: number | null }[];
}
