import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../src/lib/prisma';
import * as ledgerService from '../../general-ledger/services/ledger.service';
import * as budgetService from './budget.service';
import * as analysisService from './budgetAnalysis.service';
import * as forecastService from './forecast.service';
import { BudgetError } from '../shared/budgeting.util';

/**
 * Runs against the real dev SQLite database — same constraint as the GL,
 * AP/AR, and Payroll suites. Fixtures use a "TST-" account-code prefix and
 * a dedicated far-future fiscal year (2099) so budgets never overlap
 * anything real, and are deleted in afterAll. Requires `npm run db:seed`
 * to have been run at least once.
 */

let actorId: string;
let expenseAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let bankAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let inactiveAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;

const createdAccountIds: string[] = [];
const createdBudgetIds: string[] = [];
const createdJournalEntryIds: string[] = [];

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No seeded user found — run `npm run db:seed` before running tests');
  actorId = user.id;

  expenseAccount = await ledgerService.createAccount({ code: 'TST-BUD-5600', name: 'Test Budget Expense', type: 'EXPENSE' }, actorId);
  bankAccount = await ledgerService.createAccount({ code: 'TST-BUD-1200', name: 'Test Budget Bank', type: 'ASSET' }, actorId);
  inactiveAccount = await ledgerService.createAccount({ code: 'TST-BUD-5601', name: 'Test Inactive Expense', type: 'EXPENSE' }, actorId);
  await ledgerService.updateAccount(inactiveAccount.id, { isActive: false }, actorId);
  createdAccountIds.push(expenseAccount.id, bankAccount.id, inactiveAccount.id);
});

afterAll(async () => {
  const lineIds = (await prisma.budgetLine.findMany({ where: { budgetId: { in: createdBudgetIds } }, select: { id: true } })).map((l) => l.id);
  await prisma.budgetLineMonth.deleteMany({ where: { budgetLineId: { in: lineIds } } });
  await prisma.budgetLine.deleteMany({ where: { budgetId: { in: createdBudgetIds } } });
  await prisma.budget.deleteMany({ where: { id: { in: createdBudgetIds } } });

  const entries = await prisma.journalEntry.findMany({
    where: { OR: [{ id: { in: createdJournalEntryIds } }, { reversalOfId: { in: createdJournalEntryIds } }, { lines: { some: { accountId: { in: createdAccountIds } } } }] },
  });
  const entryIds = entries.map((e) => e.id);
  await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
  await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
  await prisma.account.deleteMany({ where: { id: { in: createdAccountIds } } });

  await prisma.$disconnect();
});

let fyCounter = 2099;
function nextFiscalYear() {
  fyCounter++;
  return fyCounter;
}

async function postActual(amount: number, transactionDate: string) {
  const entry = await ledgerService.createJournalEntry(
    { transactionDate, description: 'Test actual spend', lines: [{ accountId: expenseAccount.id, debit: amount }, { accountId: bankAccount.id, credit: amount }] },
    actorId
  );
  await ledgerService.postJournalEntry(entry.id, actorId);
  createdJournalEntryIds.push(entry.id);
}

async function makeDraftBudget(fiscalYear: number, annualAmount: number, accountId = expenseAccount.id) {
  const budget = await budgetService.createBudget(
    { name: `TST Budget FY${fiscalYear}`, fiscalYear, startDate: `${fiscalYear}-01-01`, endDate: `${fiscalYear}-12-31`, lines: [{ accountId, annualAmount }] },
    actorId
  );
  createdBudgetIds.push(budget.id);
  return budget;
}

async function makeActiveBudget(fiscalYear: number, annualAmount: number) {
  const budget = await makeDraftBudget(fiscalYear, annualAmount);
  await budgetService.submitBudget(budget.id, actorId);
  await budgetService.approveBudget(budget.id, actorId);
  return budgetService.activateBudget(budget.id, actorId);
}

// ─── Budget Lifecycle ───────────────────────────────────

describe('Budget Lifecycle', () => {
  it('creates a budget', async () => {
    const budget = await makeDraftBudget(nextFiscalYear(), 100000);
    expect(budget.status).toBe('DRAFT');
  });

  it('rejects an invalid budget where the end date precedes the start date', async () => {
    await expect(
      budgetService.createBudget({ name: 'Bad', fiscalYear: nextFiscalYear(), startDate: '2099-06-01', endDate: '2099-01-01', lines: [{ accountId: expenseAccount.id, annualAmount: 100 }] }, actorId)
    ).rejects.toThrow(/cannot be before/);
  });

  it('edits a draft budget', async () => {
    const budget = await makeDraftBudget(nextFiscalYear(), 100000);
    const updated = await budgetService.updateBudget(budget.id, { name: 'Renamed Budget' }, actorId);
    expect(updated.name).toBe('Renamed Budget');
  });

  it('runs the full Draft → Submit → Approve → Activate → Close lifecycle', async () => {
    const budget = await makeDraftBudget(nextFiscalYear(), 100000);
    const submitted = await budgetService.submitBudget(budget.id, actorId);
    expect(submitted.status).toBe('PENDING_APPROVAL');
    const approved = await budgetService.approveBudget(budget.id, actorId);
    expect(approved.status).toBe('APPROVED');
    const activated = await budgetService.activateBudget(budget.id, actorId);
    expect(activated.status).toBe('ACTIVE');
    const closed = await budgetService.closeBudget(budget.id, actorId);
    expect(closed.status).toBe('CLOSED');

    await expect(budgetService.updateBudget(budget.id, { name: 'x' }, actorId)).rejects.toThrow(/Only draft budgets/);
  });

  it('cancels a budget', async () => {
    const budget = await makeDraftBudget(nextFiscalYear(), 100000);
    const cancelled = await budgetService.cancelBudget(budget.id, actorId);
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('prevents submitting a budget with no lines', async () => {
    const fiscalYear = nextFiscalYear();
    // Build directly via prisma to bypass the service's "at least one line" guard on create.
    const budget = await prisma.budget.create({ data: { name: 'Empty', fiscalYear, startDate: new Date(`${fiscalYear}-01-01`), endDate: new Date(`${fiscalYear}-12-31`), createdById: actorId } });
    createdBudgetIds.push(budget.id);
    await expect(budgetService.submitBudget(budget.id, actorId)).rejects.toThrow(/no budget lines/);
  });

  it('prevents activating two budgets that cover the same fiscal year, department, and account', async () => {
    const fiscalYear = nextFiscalYear();
    const first = await makeDraftBudget(fiscalYear, 100000);
    await budgetService.submitBudget(first.id, actorId);
    await budgetService.approveBudget(first.id, actorId);
    await budgetService.activateBudget(first.id, actorId);

    const second = await makeDraftBudget(fiscalYear, 50000);
    await budgetService.submitBudget(second.id, actorId);
    await budgetService.approveBudget(second.id, actorId);
    await expect(budgetService.activateBudget(second.id, actorId)).rejects.toThrow(/already covers fiscal year/);
  });

  it('creates a numbered revision of an approved budget without touching the original', async () => {
    const budget = await makeDraftBudget(nextFiscalYear(), 100000);
    await budgetService.submitBudget(budget.id, actorId);
    const approved = await budgetService.approveBudget(budget.id, actorId);

    const revision = await budgetService.reviseBudget(budget.id, actorId);
    expect(revision.version).toBe(2);
    expect(revision.status).toBe('DRAFT');
    expect(Number(revision.lines[0].annualAmount)).toBe(100000);

    const originalAfter = await budgetService.getBudgetById(budget.id);
    expect(originalAfter.status).toBe('APPROVED');
    expect(originalAfter.name).toBe(approved.name);
    createdBudgetIds.push(revision.id);
  });
});

// ─── Budget Lines ───────────────────────────────────────

describe('Budget Lines', () => {
  it('rejects a negative line amount', async () => {
    await expect(budgetService.createBudget({ name: 'Neg', fiscalYear: nextFiscalYear(), startDate: '2099-01-01', endDate: '2099-12-31', lines: [{ accountId: expenseAccount.id, annualAmount: -100 }] }, actorId)).rejects.toThrow(/cannot be negative/);
  });

  it('rejects budgeting against an inactive account', async () => {
    await expect(budgetService.createBudget({ name: 'Inactive', fiscalYear: nextFiscalYear(), startDate: '2099-01-01', endDate: '2099-12-31', lines: [{ accountId: inactiveAccount.id, annualAmount: 100 }] }, actorId)).rejects.toThrow(/inactive account/);
  });

  it('validates monthly allocations sum to the annual amount', async () => {
    const fiscalYear = nextFiscalYear();
    await expect(
      budgetService.createBudget(
        { name: 'Bad Months', fiscalYear, startDate: `${fiscalYear}-01-01`, endDate: `${fiscalYear}-12-31`, lines: [{ accountId: expenseAccount.id, annualAmount: 1200, months: [{ month: 1, amount: 100 }, { month: 2, amount: 100 }] }] },
        actorId
      )
    ).rejects.toThrow(/must sum to the annual amount/);

    const ok = await budgetService.createBudget(
      { name: 'Good Months', fiscalYear, startDate: `${fiscalYear}-01-01`, endDate: `${fiscalYear}-12-31`, lines: [{ accountId: expenseAccount.id, annualAmount: 1200, months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 100 })) }] },
      actorId
    );
    createdBudgetIds.push(ok.id);
    expect(ok.lines[0].months).toHaveLength(12);
  });
});

// ─── Budget vs Actual ────────────────────────────────────

describe('Budget vs Actual', () => {
  it('computes actual from posted GL data, variance, variance %, and utilization', async () => {
    const fiscalYear = nextFiscalYear();
    await postActual(80000, `${fiscalYear}-03-15`);
    const budget = await makeActiveBudget(fiscalYear, 100000);

    const result = await analysisService.getBudgetVsActual(budget.id, { asOfDate: `${fiscalYear}-12-31` });
    const row = result.rows[0];
    expect(Number(row.actual)).toBe(80000);
    expect(Number(row.variance)).toBe(20000);
    expect(row.variancePercent).toBeCloseTo(20, 5);
    expect(row.utilizationPercent).toBeCloseTo(80, 5);
    expect(row.status).toBe('UNDER_BUDGET');
  });

  it('flags an over-budget account with a negative variance', async () => {
    const fiscalYear = nextFiscalYear();
    await postActual(120000, `${fiscalYear}-04-01`);
    const budget = await makeActiveBudget(fiscalYear, 100000);

    const result = await analysisService.getBudgetVsActual(budget.id, { asOfDate: `${fiscalYear}-12-31` });
    const row = result.rows[0];
    expect(Number(row.variance)).toBe(-20000);
    expect(row.status).toBe('OVER_BUDGET');
  });

  it('handles a zero budget without producing NaN or Infinity', async () => {
    const fiscalYear = nextFiscalYear();
    await postActual(5000, `${fiscalYear}-02-01`);
    const budget = await makeActiveBudget(fiscalYear, 0);

    const result = await analysisService.getBudgetVsActual(budget.id, { asOfDate: `${fiscalYear}-12-31` });
    const row = result.rows[0];
    expect(row.variancePercent).toBeNull();
    expect(row.utilizationPercent).toBeNull();
    expect(row.status).toBe('NO_BUDGET');
    expect(Number.isFinite(Number(row.variance))).toBe(true);
  });

  it('shows 0% utilization when there is no actual spend at all', async () => {
    const fiscalYear = nextFiscalYear();
    const budget = await makeActiveBudget(fiscalYear, 1000000);
    const result = await analysisService.getBudgetVsActual(budget.id, { asOfDate: `${fiscalYear}-12-31` });
    expect(result.rows[0].utilizationPercent).toBe(0);
  });

  it('never counts a future month as actual spending', async () => {
    const fiscalYear = nextFiscalYear();
    const budget = await makeActiveBudget(fiscalYear, 100000);
    // asOfDate mid-year — any GL activity dated after it must not appear, even if posted.
    await postActual(9999, `${fiscalYear}-11-01`);
    const result = await analysisService.getBudgetVsActual(budget.id, { asOfDate: `${fiscalYear}-06-30` });
    expect(Number(result.rows[0].actual)).toBe(0);
  });
});

// ─── Forecast ────────────────────────────────────────────

describe('Forecast (RUN_RATE)', () => {
  it('matches the spec example exactly: 2,700,000 actual over 6 months → 5,400,000 projected on a 5,000,000 budget', async () => {
    const fiscalYear = nextFiscalYear();
    // Spread across Jan–Jun so "6 months elapsed" is unambiguous.
    await postActual(450000, `${fiscalYear}-01-15`);
    await postActual(450000, `${fiscalYear}-02-15`);
    await postActual(450000, `${fiscalYear}-03-15`);
    await postActual(450000, `${fiscalYear}-04-15`);
    await postActual(450000, `${fiscalYear}-05-15`);
    await postActual(450000, `${fiscalYear}-06-15`);
    const budget = await makeActiveBudget(fiscalYear, 5000000);

    const forecast = await forecastService.calculateForecast(budget.id, { asOfDate: `${fiscalYear}-06-30` });
    expect(forecast.method).toBe('RUN_RATE');
    expect(Number(forecast.actualYtd)).toBe(2700000);
    expect(forecast.monthsElapsed).toBe(6);
    expect(Number(forecast.averageMonthlyActual)).toBe(450000);
    expect(Number(forecast.projectedAnnualActual)).toBe(5400000);
    expect(Number(forecast.forecastVariance)).toBe(-400000);
    expect(forecast.status).toBe('EXPECTED_OVERRUN');
  });

  it('handles an as-of date before the budget period starts without NaN/Infinity (insufficient data)', async () => {
    const fiscalYear = nextFiscalYear();
    const budget = await makeActiveBudget(fiscalYear, 1000000);
    const forecast = await forecastService.calculateForecast(budget.id, { asOfDate: `${fiscalYear - 1}-06-01` });
    expect(forecast.monthsElapsed).toBe(1); // clamped to at least 1 to avoid divide-by-zero
    expect(Number.isFinite(Number(forecast.averageMonthlyActual))).toBe(true);
    expect(Number.isFinite(Number(forecast.projectedAnnualActual))).toBe(true);
    expect(Number(forecast.actualYtd)).toBe(0);
  });

  it('clamps months elapsed to the total period length for an as-of date after the period ends', async () => {
    const fiscalYear = nextFiscalYear();
    await postActual(1200000, `${fiscalYear}-06-01`);
    const budget = await makeActiveBudget(fiscalYear, 1000000);
    const forecast = await forecastService.calculateForecast(budget.id, { asOfDate: `${fiscalYear + 1}-03-01` });
    expect(forecast.monthsElapsed).toBe(12);
    expect(Number(forecast.projectedAnnualActual)).toBe(1200000);
  });
});

describe('Cross-cutting: BudgetError is the same class as LedgerError', () => {
  it('is exported consistently for uniform controller error handling', () => {
    expect(BudgetError).toBe(ledgerService.LedgerError);
  });
});
