import { Prisma, AccountType } from '@prisma/client';
import { LedgerError } from '../../general-ledger/services/ledger.service';

export { LedgerError as BudgetError };

export function toDecimal(value: number | string | Prisma.Decimal | null | undefined, fallback = 0): Prisma.Decimal {
  try {
    return new Prisma.Decimal(value ?? fallback);
  } catch {
    throw new LedgerError('Invalid monetary amount');
  }
}

/** Normal-balance sign convention, matching ledger.service.ts: Asset/Expense increase with Debit; Liability/Equity/Revenue increase with Credit. */
export function signedActual(type: AccountType, debit: Prisma.Decimal, credit: Prisma.Decimal): Prisma.Decimal {
  const net = debit.minus(credit);
  return type === AccountType.ASSET || type === AccountType.EXPENSE ? net : net.negated();
}

export interface VarianceResult {
  variance: Prisma.Decimal;
  variancePercent: number | null; // null represents "N/A" (budget is zero)
  utilizationPercent: number | null;
  status: 'UNDER_BUDGET' | 'ON_BUDGET' | 'OVER_BUDGET' | 'NO_BUDGET';
}

/**
 * variance = budget - actual (positive => under budget, negative => over budget)
 * variancePercent = (budget - actual) / budget * 100 — null (N/A) when budget is 0.
 * utilizationPercent = actual / budget * 100 — null (N/A) when budget is 0.
 */
export function computeVariance(budget: Prisma.Decimal, actual: Prisma.Decimal): VarianceResult {
  const variance = budget.minus(actual);
  const isZeroBudget = budget.equals(0);

  const variancePercent = isZeroBudget ? null : variance.dividedBy(budget).times(100).toNumber();
  const utilizationPercent = isZeroBudget ? null : actual.dividedBy(budget).times(100).toNumber();

  let status: VarianceResult['status'];
  if (isZeroBudget) status = 'NO_BUDGET';
  else if (variance.greaterThan(0)) status = 'UNDER_BUDGET';
  else if (variance.lessThan(0)) status = 'OVER_BUDGET';
  else status = 'ON_BUDGET';

  return { variance, variancePercent, utilizationPercent, status };
}

export function monthsBetweenInclusive(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
