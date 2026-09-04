import { Prisma } from '@prisma/client';
import { LedgerError } from '../../general-ledger/services/ledger.service';

export { LedgerError as TaxError };

export function toDecimal(value: number | string | Prisma.Decimal | null | undefined, fallback = 0): Prisma.Decimal {
  try {
    return new Prisma.Decimal(value ?? fallback);
  } catch {
    throw new LedgerError('Invalid monetary amount');
  }
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

/**
 * Centralized rounding strategy — every tax amount in the system rounds the
 * same way (2 decimal places, half-up), computed once here rather than
 * scattered across controllers/components. The backend is authoritative;
 * a frontend estimate is never trusted for the final stored amount.
 */
export function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export interface TaxCalculationResult {
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

/** Tax-exclusive: the given amount is the pre-tax base. Tax = base × rate. */
export function calculateExclusive(baseAmount: Prisma.Decimal, ratePercent: Prisma.Decimal): TaxCalculationResult {
  const taxableAmount = roundMoney(baseAmount);
  const taxAmount = roundMoney(taxableAmount.times(ratePercent).dividedBy(100));
  return { taxableAmount, taxAmount, total: taxableAmount.plus(taxAmount) };
}

/** Tax-inclusive: the given amount already contains tax. Taxable = total / (1 + rate). */
export function calculateInclusive(totalAmount: Prisma.Decimal, ratePercent: Prisma.Decimal): TaxCalculationResult {
  const total = roundMoney(totalAmount);
  const taxableAmount = roundMoney(total.dividedBy(new Prisma.Decimal(1).plus(ratePercent.dividedBy(100))));
  const taxAmount = total.minus(taxableAmount);
  return { taxableAmount, taxAmount, total };
}
