import { Prisma, TaxCategory } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { TaxError, toDecimal, calculateExclusive, calculateInclusive, TaxCalculationResult } from '../shared/tax.util';
import { resolveEffectiveRate } from './taxCode.service';

export interface ComputeTaxInput {
  taxCodeId: string;
  amount: number | string | Prisma.Decimal;
  amountType: 'EXCLUSIVE' | 'INCLUSIVE';
  asOf: Date;
}

export interface ComputeTaxOutput extends TaxCalculationResult {
  taxCodeId: string;
  taxRateId: string | null;
  category: TaxCategory;
  ratePercent: Prisma.Decimal;
}

/**
 * The single, centralized entry point for all tax math in the system. Never
 * duplicate this logic in a controller or a React component — the frontend
 * may render an estimate, but this function's output is what gets stored.
 *
 * ZERO_RATED is taxable at a forced 0% (still reportable); EXEMPT and
 * OUT_OF_SCOPE fall outside the tax system entirely (no rate lookup, no tax).
 */
export async function computeTax(input: ComputeTaxInput): Promise<ComputeTaxOutput> {
  const taxCode = await prisma.taxCode.findUnique({ where: { id: input.taxCodeId } });
  if (!taxCode) throw new TaxError('Tax code not found', 404);
  if (!taxCode.isActive) throw new TaxError('This tax code is inactive', 409);

  const amount = toDecimal(input.amount);
  if (amount.isNegative()) throw new TaxError('Amount cannot be negative');

  if (taxCode.category === TaxCategory.EXEMPT || taxCode.category === TaxCategory.OUT_OF_SCOPE) {
    const taxableAmount = amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return {
      taxCodeId: taxCode.id,
      taxRateId: null,
      category: taxCode.category,
      ratePercent: new Prisma.Decimal(0),
      taxableAmount,
      taxAmount: new Prisma.Decimal(0),
      total: taxableAmount,
    };
  }

  const ratePercent = taxCode.category === TaxCategory.ZERO_RATED ? new Prisma.Decimal(0) : undefined;

  let taxRateId: string | null = null;
  let effectiveRatePercent: Prisma.Decimal;
  if (ratePercent !== undefined) {
    effectiveRatePercent = ratePercent;
    // still try to link the rate row in effect, for traceability, but don't fail if none configured
    try {
      const rate = await resolveEffectiveRate(taxCode.id, input.asOf);
      taxRateId = rate.id;
    } catch {
      taxRateId = null;
    }
  } else {
    const rate = await resolveEffectiveRate(taxCode.id, input.asOf);
    taxRateId = rate.id;
    effectiveRatePercent = rate.ratePercent;
  }

  const result = input.amountType === 'INCLUSIVE' ? calculateInclusive(amount, effectiveRatePercent) : calculateExclusive(amount, effectiveRatePercent);

  return {
    taxCodeId: taxCode.id,
    taxRateId,
    category: taxCode.category,
    ratePercent: effectiveRatePercent,
    ...result,
  };
}
