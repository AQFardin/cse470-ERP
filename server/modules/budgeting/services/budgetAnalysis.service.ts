import { Prisma, BudgetStatus, Department, AccountType, JournalStatus } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { BudgetError, signedActual, computeVariance, startOfDay, endOfDay } from '../shared/budgeting.util';

/**
 * Aggregates posted/locked GL activity for a set of accounts in one date
 * range, using database-side SUM (Prisma groupBy) rather than pulling every
 * journal line into Node — see spec's performance requirements.
 */
async function aggregateActuals(accountIds: string[], dateFrom: Date, dateTo: Date) {
  if (accountIds.length === 0) return new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();

  const grouped = await prisma.journalLine.groupBy({
    by: ['accountId'],
    where: {
      accountId: { in: accountIds },
      journalEntry: { status: { in: [JournalStatus.POSTED, JournalStatus.LOCKED] }, transactionDate: { gte: dateFrom, lte: dateTo } },
    },
    _sum: { debit: true, credit: true },
  });

  const map = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();
  for (const g of grouped) {
    map.set(g.accountId, { debit: new Prisma.Decimal(g._sum.debit || 0), credit: new Prisma.Decimal(g._sum.credit || 0) });
  }
  return map;
}

/** Actual spend never includes future months — clamp the analysis window at "now" (or an explicit as-of date). */
function clampActualEnd(periodEnd: Date, asOf?: Date): Date {
  const now = asOf ? endOfDay(asOf) : endOfDay(new Date());
  return periodEnd < now ? periodEnd : now;
}

export async function getBudgetVsActual(budgetId: string, filters: { department?: Department; asOfDate?: string } = {}) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: { lines: { include: { account: true }, where: filters.department ? { department: filters.department } : undefined } },
  });
  if (!budget) throw new BudgetError('Budget not found', 404);

  const asOf = filters.asOfDate ? new Date(filters.asOfDate) : undefined;
  const dateFrom = startOfDay(budget.startDate);
  const dateTo = clampActualEnd(endOfDay(budget.endDate), asOf);

  const accountIds = budget.lines.map((l) => l.accountId);
  const actuals = await aggregateActuals(accountIds, dateFrom, dateTo);

  const rows = budget.lines.map((line) => {
    const sums = actuals.get(line.accountId) || { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
    const actual = signedActual(line.account.type, sums.debit, sums.credit);
    const { variance, variancePercent, utilizationPercent, status } = computeVariance(line.annualAmount, actual);
    return {
      lineId: line.id,
      department: line.department,
      account: { id: line.account.id, code: line.account.code, name: line.account.name, type: line.account.type },
      budget: line.annualAmount,
      actual,
      variance,
      variancePercent,
      utilizationPercent,
      status,
    };
  });

  const totalBudget = rows.reduce((s, r) => s.plus(r.budget), new Prisma.Decimal(0));
  const totalActual = rows.reduce((s, r) => s.plus(r.actual), new Prisma.Decimal(0));
  const totals = computeVariance(totalBudget, totalActual);

  return {
    budget: { id: budget.id, name: budget.name, fiscalYear: budget.fiscalYear, status: budget.status, startDate: budget.startDate, endDate: budget.endDate },
    asOf: dateTo,
    rows,
    totals: { budget: totalBudget, actual: totalActual, ...totals },
  };
}

export async function getDepartmentBreakdown(budgetId: string, asOfDate?: string) {
  const vsActual = await getBudgetVsActual(budgetId, { asOfDate });

  const byDept = new Map<string, { department: Department | null; budget: Prisma.Decimal; actual: Prisma.Decimal }>();
  for (const row of vsActual.rows) {
    const key = row.department || '__none__';
    const bucket = byDept.get(key) || { department: row.department, budget: new Prisma.Decimal(0), actual: new Prisma.Decimal(0) };
    bucket.budget = bucket.budget.plus(row.budget);
    bucket.actual = bucket.actual.plus(row.actual);
    byDept.set(key, bucket);
  }

  const rows = Array.from(byDept.values()).map((b) => ({ department: b.department, budget: b.budget, actual: b.actual, ...computeVariance(b.budget, b.actual) }));
  return { budget: vsActual.budget, rows };
}

export async function getMonthlyPerformance(budgetId: string, asOfDate?: string) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId }, include: { lines: { include: { account: true, months: true } } } });
  if (!budget) throw new BudgetError('Budget not found', 404);

  const asOf = asOfDate ? new Date(asOfDate) : new Date();
  const months: { month: number; year: number; label: string; budget: Prisma.Decimal; actual: Prisma.Decimal; isFuture: boolean }[] = [];

  const cursor = new Date(budget.startDate.getFullYear(), budget.startDate.getMonth(), 1);
  const end = new Date(budget.endDate.getFullYear(), budget.endDate.getMonth(), 1);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const monthStart = startOfDay(new Date(year, month - 1, 1));
    const monthEnd = endOfDay(new Date(year, month, 0));
    const isFuture = monthStart > endOfDay(asOf);

    let monthBudget = new Prisma.Decimal(0);
    for (const line of budget.lines) {
      const monthAlloc = line.months.find((m) => m.month === month);
      // Fall back to an even 1/12 split when no explicit monthly allocation was set for this line.
      monthBudget = monthBudget.plus(monthAlloc ? monthAlloc.amount : line.annualAmount.dividedBy(12));
    }

    let monthActual = new Prisma.Decimal(0);
    if (!isFuture) {
      const accountIds = budget.lines.map((l) => l.accountId);
      const actuals = await aggregateActuals(accountIds, monthStart, monthEnd < endOfDay(asOf) ? monthEnd : endOfDay(asOf));
      for (const line of budget.lines) {
        const sums = actuals.get(line.accountId) || { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
        monthActual = monthActual.plus(signedActual(line.account.type, sums.debit, sums.credit));
      }
    }

    months.push({ month, year, label: monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric' }), budget: monthBudget, actual: monthActual, isFuture });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return { budget: { id: budget.id, name: budget.name }, months: months.map((m) => ({ ...m, ...computeVariance(m.budget, m.actual) })) };
}

// ─── Dashboards ───────────────────────────────────────────

export async function getBudgetingDashboard(fiscalYear?: number) {
  const where: Prisma.BudgetWhereInput = { status: BudgetStatus.ACTIVE, ...(fiscalYear ? { fiscalYear } : {}) };
  const activeBudgets = await prisma.budget.findMany({ where, include: { lines: { include: { account: true } } } });

  let totalBudget = new Prisma.Decimal(0);
  let totalActual = new Prisma.Decimal(0);
  const byDept = new Map<string, { department: Department | null; budget: Prisma.Decimal; actual: Prisma.Decimal }>();

  for (const budget of activeBudgets) {
    const dateFrom = startOfDay(budget.startDate);
    const dateTo = clampActualEnd(endOfDay(budget.endDate));
    const accountIds = budget.lines.map((l) => l.accountId);
    const actuals = await aggregateActuals(accountIds, dateFrom, dateTo);

    for (const line of budget.lines) {
      const sums = actuals.get(line.accountId) || { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
      const actual = signedActual(line.account.type, sums.debit, sums.credit);
      totalBudget = totalBudget.plus(line.annualAmount);
      totalActual = totalActual.plus(actual);

      const key = line.department || '__none__';
      const bucket = byDept.get(key) || { department: line.department, budget: new Prisma.Decimal(0), actual: new Prisma.Decimal(0) };
      bucket.budget = bucket.budget.plus(line.annualAmount);
      bucket.actual = bucket.actual.plus(actual);
      byDept.set(key, bucket);
    }
  }

  const departments = Array.from(byDept.values()).map((b) => ({ department: b.department, budget: b.budget, actual: b.actual, ...computeVariance(b.budget, b.actual) }));
  const overBudgetDepartments = departments.filter((d) => d.status === 'OVER_BUDGET');
  const totals = computeVariance(totalBudget, totalActual);

  return {
    activeBudgetCount: activeBudgets.length,
    totalBudget,
    totalActual,
    remaining: totals.variance,
    utilizationPercent: totals.utilizationPercent,
    departments: departments.sort((a, b) => (a.department || '').localeCompare(b.department || '')),
    overBudgetDepartments,
  };
}

export async function getDepartmentDashboard(department: Department, fiscalYear?: number) {
  const where: Prisma.BudgetWhereInput = { status: BudgetStatus.ACTIVE, ...(fiscalYear ? { fiscalYear } : {}) };
  const activeBudgets = await prisma.budget.findMany({ where, include: { lines: { where: { department }, include: { account: true } } } });

  const lines = activeBudgets.flatMap((b) => b.lines.map((l) => ({ ...l, budgetName: b.name, budgetStartDate: b.startDate, budgetEndDate: b.endDate })));
  if (lines.length === 0) {
    return { department, budget: new Prisma.Decimal(0), actual: new Prisma.Decimal(0), variance: new Prisma.Decimal(0), variancePercent: null, utilizationPercent: null, status: 'NO_BUDGET' as const, accounts: [] };
  }

  const accountIds = lines.map((l) => l.accountId);
  // Use the tightest common window across this department's active budget lines' periods.
  const dateFrom = startOfDay(lines.reduce((min, l) => (l.budgetStartDate < min ? l.budgetStartDate : min), lines[0].budgetStartDate));
  const dateTo = clampActualEnd(endOfDay(lines.reduce((max, l) => (l.budgetEndDate > max ? l.budgetEndDate : max), lines[0].budgetEndDate)));
  const actuals = await aggregateActuals(accountIds, dateFrom, dateTo);

  const accounts = lines.map((line) => {
    const sums = actuals.get(line.accountId) || { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
    const actual = signedActual(line.account.type, sums.debit, sums.credit);
    return { account: { id: line.account.id, code: line.account.code, name: line.account.name }, budget: line.annualAmount, actual, ...computeVariance(line.annualAmount, actual) };
  });

  const totalBudget = accounts.reduce((s, a) => s.plus(a.budget), new Prisma.Decimal(0));
  const totalActual = accounts.reduce((s, a) => s.plus(a.actual), new Prisma.Decimal(0));

  return { department, budget: totalBudget, actual: totalActual, ...computeVariance(totalBudget, totalActual), accounts };
}
