import { Prisma } from '@prisma/client';
import { LedgerError } from '../../general-ledger/services/ledger.service';

export { LedgerError as PayrollError };

/** Counts Mon–Fri days between two dates, inclusive. Used as the default "working days" for a period. */
export function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Counts the weekday overlap between a leave request's date range and the payroll period's range. */
export function countOverlapWeekdays(leaveStart: Date, leaveEnd: Date, periodStart: Date, periodEnd: Date): number {
  const start = leaveStart > periodStart ? leaveStart : periodStart;
  const end = leaveEnd < periodEnd ? leaveEnd : periodEnd;
  if (start > end) return 0;
  return countWeekdays(start, end);
}

/** ISO (YYYY-MM-DD) weekday keys in the overlap of a leave request's range and the payroll period's range — used to avoid double-deducting a day as both unpaid leave and an attendance absence. */
export function weekdayRange(leaveStart: Date, leaveEnd: Date, periodStart: Date, periodEnd: Date): string[] {
  const start = leaveStart > periodStart ? leaveStart : periodStart;
  const end = leaveEnd < periodEnd ? leaveEnd : periodEnd;
  if (start > end) return [];
  const keys: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) keys.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export interface TaxSlabInput {
  minAmount: Prisma.Decimal | number | string;
  maxAmount: Prisma.Decimal | number | string | null;
  ratePercent: Prisma.Decimal | number | string;
}

/**
 * Standard progressive-slab tax calculation: each slab's rate applies only to
 * the portion of taxable income that falls within that slab, not the whole
 * amount. Slabs and the exemption are fully configurable (TaxRule/TaxSlab),
 * not hard-coded — see spec section 11.
 */
export function calculateProgressiveTax(taxableIncome: Prisma.Decimal, slabs: TaxSlabInput[]): Prisma.Decimal {
  if (taxableIncome.lessThanOrEqualTo(0)) return new Prisma.Decimal(0);

  const sorted = [...slabs].sort((a, b) => new Prisma.Decimal(a.minAmount).comparedTo(new Prisma.Decimal(b.minAmount)));
  let tax = new Prisma.Decimal(0);

  for (const slab of sorted) {
    const min = new Prisma.Decimal(slab.minAmount);
    const max = slab.maxAmount === null ? null : new Prisma.Decimal(slab.maxAmount);
    const rate = new Prisma.Decimal(slab.ratePercent);

    if (taxableIncome.lessThanOrEqualTo(min)) continue;
    const slabTop = max === null ? taxableIncome : Prisma.Decimal.min(taxableIncome, max);
    const amountInSlab = slabTop.minus(min);
    if (amountInSlab.lessThanOrEqualTo(0)) continue;

    tax = tax.plus(amountInSlab.times(rate).dividedBy(100));
  }

  return tax;
}

export function toDecimal(value: number | string | Prisma.Decimal | null | undefined, fallback = 0): Prisma.Decimal {
  try {
    return new Prisma.Decimal(value ?? fallback);
  } catch {
    throw new LedgerError('Invalid monetary amount');
  }
}
