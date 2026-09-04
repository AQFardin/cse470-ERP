export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'LOCKED';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string | null;
  isActive: boolean;
  parentId?: string | null;
  parent?: { id: string; code: string; name: string } | null;
  children?: { id: string; code: string; name: string; isActive: boolean }[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  id: string;
  description?: string | null;
  debit: string | number;
  credit: string | number;
  accountId: string;
  account?: { id: string; code: string; name: string };
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  transactionDate: string;
  description: string;
  currency: string;
  status: JournalStatus;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
  postedById?: string | null;
  postedBy?: { id: string; name: string } | null;
  postedAt?: string | null;
  lockedAt?: string | null;
  reversalOfId?: string | null;
  reversalOf?: { id: string; entryNumber: string; description: string } | null;
  reversedBy?: { id: string; entryNumber: string; description: string } | null;
  lines: JournalLine[];
}

export interface LedgerRow {
  date: string;
  reference: string;
  journalEntryId: string;
  description: string;
  debit: string | number;
  credit: string | number;
  balance: string | number;
  status: JournalStatus;
}

export interface AccountLedgerResult {
  account: { id: string; code: string; name: string; type: AccountType };
  openingBalance: string | number;
  rows: LedgerRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TrialBalanceRow {
  account: { id: string; code: string; name: string; type: AccountType };
  debit: string | number;
  credit: string | number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebit: string | number;
  totalCredit: string | number;
  difference: string | number;
  isBalanced: boolean;
}

export interface StatementLine {
  account: { id: string; code: string; name: string; type: AccountType };
  amount: string | number;
}

export interface BalanceSheetResult {
  asOfDate: string;
  assets: StatementLine[];
  liabilities: StatementLine[];
  equity: StatementLine[];
  totalAssets: string | number;
  totalLiabilities: string | number;
  totalEquity: string | number;
  isBalanced: boolean;
}

export interface IncomeStatementResult {
  startDate: string;
  endDate: string;
  revenue: StatementLine[];
  expense: StatementLine[];
  totalRevenue: string | number;
  totalExpense: string | number;
  netIncome: string | number;
}

export interface CashFlowMovement {
  date: string;
  reference: string;
  description: string;
  account: string;
  amount: string | number;
  category: 'OPERATING' | 'INVESTING' | 'FINANCING';
}

export interface CashFlowStatementResult {
  startDate: string;
  endDate: string;
  operating: string | number;
  investing: string | number;
  financing: string | number;
  netCashChange: string | number;
  openingCash: string | number;
  closingCash: string | number;
  movements: CashFlowMovement[];
}

export type FiscalPeriodStatus = 'OPEN' | 'CLOSED';

export interface FiscalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  createdBy?: { id: string; name: string };
  closedBy?: { id: string; name: string } | null;
  closedAt?: string | null;
  reopenedBy?: { id: string; name: string } | null;
  reopenedAt?: string | null;
}
