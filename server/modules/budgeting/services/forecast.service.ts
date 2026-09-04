import { Prisma, Department } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { BudgetError, signedActual, computeVariance, monthsBetweenInclusive, startOfDay, endOfDay } from '../shared/budgeting.util';

export const FORECAST_METHOD = 'RUN_RATE' as const;

async function aggregateActuals(accountIds: string[], dateFrom: Date, dateTo: Date) {
  if (accountIds.length === 0) return new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();
  const grouped = await prisma.journalLine.groupBy({
    by: ['accountId'],
    where: { accountId: { in: accountIds }, journalEntry: { status: { in: ['POSTED', 'LOCKED'] }, transactionDate: { gte: dateFrom, lte: dateTo } } },
    _sum: { debit: true, credit: true },
  });
  const map = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();
  for (const g of grouped) map.set(g.accountId, { debit: new Prisma.Decimal(g._sum.debit || 0), credit: new Prisma.Decimal(g._sum.credit || 0) });
  return map;
}

export interface ForecastResult {
  method: typeof FORECAST_METHOD;
  budget: { id: string; name: string; fiscalYear: number };
  totalBudget: Prisma.Decimal;
  actualYtd: Prisma.Decimal;
  monthsElapsed: number;
  totalMonths: number;
  averageMonthlyActual: Prisma.Decimal;
  projectedAnnualActual: Prisma.Decimal;
  forecastVariance: Prisma.Decimal;
  forecastVariancePercent: number | null;
  status: 'EXPECTED_OVERRUN' | 'EXPECTED_WITHIN_BUDGET' | 'ON_TRACK' | 'NO_BUDGET';
}

/**
 * Run-rate forecast — the simple, explainable, auditable method the spec
 * asks for: projectedAnnual = (YTD actual / months elapsed) × total months.
 * Forecasts are computed on demand, never persisted, so they always reflect
 * the latest posted GL data (see spec section 25/27).
 */
export async function calculateForecast(budgetId: string, opts: { asOfDate?: string } = {}): Promise<ForecastResult> {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId }, include: { lines: { include: { account: true } } } });
  if (!budget) throw new BudgetError('Budget not found', 404);

  const periodStart = startOfDay(budget.startDate);
  const periodEnd = endOfDay(budget.endDate);
  const asOf = opts.asOfDate ? new Date(opts.asOfDate) : new Date();
  const effectiveAsOf = asOf < periodEnd ? endOfDay(asOf) : periodEnd;

  const totalMonths = monthsBetweenInclusive(periodStart, periodEnd);
  const monthsElapsedRaw = effectiveAsOf < periodStart ? 0 : monthsBetweenInclusive(periodStart, effectiveAsOf);
  const monthsElapsed = Math.max(1, Math.min(monthsElapsedRaw, totalMonths));

  const accountIds = budget.lines.map((l) => l.accountId);
  const actuals = await aggregateActuals(accountIds, periodStart, effectiveAsOf < periodStart ? periodStart : effectiveAsOf);

  const totalBudget = budget.lines.reduce((s, l) => s.plus(l.annualAmount), new Prisma.Decimal(0));
  let actualYtd = new Prisma.Decimal(0);
  for (const line of budget.lines) {
    const sums = actuals.get(line.accountId) || { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
    actualYtd = actualYtd.plus(signedActual(line.account.type, sums.debit, sums.credit));
  }

  const averageMonthlyActual = actualYtd.dividedBy(monthsElapsed);
  const projectedAnnualActual = averageMonthlyActual.times(totalMonths);
  const { variance: forecastVariance, variancePercent: forecastVariancePercent } = computeVariance(totalBudget, projectedAnnualActual);

  let status: ForecastResult['status'];
  if (totalBudget.equals(0)) status = 'NO_BUDGET';
  else if (forecastVariance.lessThan(0)) status = 'EXPECTED_OVERRUN';
  else if (forecastVariance.dividedBy(totalBudget).lessThan(0.05)) status = 'ON_TRACK'; // within 5% headroom
  else status = 'EXPECTED_WITHIN_BUDGET';

  return {
    method: FORECAST_METHOD,
    budget: { id: budget.id, name: budget.name, fiscalYear: budget.fiscalYear },
    totalBudget,
    actualYtd,
    monthsElapsed,
    totalMonths,
    averageMonthlyActual,
    projectedAnnualActual,
    forecastVariance,
    forecastVariancePercent,
    status,
  };
}

export async function calculateDepartmentForecasts(budgetId: string, opts: { asOfDate?: string } = {}) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId }, include: { lines: { include: { account: true } } } });
  if (!budget) throw new BudgetError('Budget not found', 404);

  const periodStart = startOfDay(budget.startDate);
  const periodEnd = endOfDay(budget.endDate);
  const asOf = opts.asOfDate ? new Date(opts.asOfDate) : new Date();
  const effectiveAsOf = asOf < periodEnd ? endOfDay(asOf) : periodEnd;
  const totalMonths = monthsBetweenInclusive(periodStart, periodEnd);
  const monthsElapsedRaw = effectiveAsOf < periodStart ? 0 : monthsBetweenInclusive(periodStart, effectiveAsOf);
  const monthsElapsed = Math.max(1, Math.min(monthsElapsedRaw, totalMonths));

  const accountIds = budget.lines.map((l) => l.accountId);
  const actuals = await aggregateActuals(accountIds, periodStart, effectiveAsOf < periodStart ? periodStart : effectiveAsOf);

  const byDept = new Map<string, { department: Department | null; budget: Prisma.Decimal; actualYtd: Prisma.Decimal }>();
  for (const line of budget.lines) {
    const sums = actuals.get(line.accountId) || { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
    const actual = signedActual(line.account.type, sums.debit, sums.credit);
    const key = line.department || '__none__';
    const bucket = byDept.get(key) || { department: line.department, budget: new Prisma.Decimal(0), actualYtd: new Prisma.Decimal(0) };
    bucket.budget = bucket.budget.plus(line.annualAmount);
    bucket.actualYtd = bucket.actualYtd.plus(actual);
    byDept.set(key, bucket);
  }

  return Array.from(byDept.values()).map((b) => {
    const averageMonthlyActual = b.actualYtd.dividedBy(monthsElapsed);
    const projectedAnnualActual = averageMonthlyActual.times(totalMonths);
    const { variance, variancePercent } = computeVariance(b.budget, projectedAnnualActual);
    return { department: b.department, budget: b.budget, actualYtd: b.actualYtd, projectedAnnualActual, forecastVariance: variance, forecastVariancePercent: variancePercent };
  });
}
