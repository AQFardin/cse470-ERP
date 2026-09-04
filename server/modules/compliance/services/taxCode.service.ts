import { TaxType, TaxCategory } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { TaxError, toDecimal } from '../shared/tax.util';

// ─── Tax Codes ────────────────────────────────────────────

export async function listTaxCodes(filters: { type?: TaxType; category?: TaxCategory; isActive?: boolean } = {}) {
  return prisma.taxCode.findMany({
    where: {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    include: { rates: { orderBy: { effectiveFrom: 'desc' } } },
    orderBy: { code: 'asc' },
  });
}

export async function getTaxCodeById(id: string) {
  const taxCode = await prisma.taxCode.findUnique({ where: { id }, include: { rates: { orderBy: { effectiveFrom: 'desc' } } } });
  if (!taxCode) throw new TaxError('Tax code not found', 404);
  return taxCode;
}

export async function createTaxCode(
  data: { name: string; code: string; type: TaxType; region?: string; category?: TaxCategory },
  actorId: string
) {
  if (!data.name?.trim()) throw new TaxError('Tax name is required');
  const code = data.code?.trim();
  if (!code) throw new TaxError('Tax code is required');

  const existing = await prisma.taxCode.findUnique({ where: { code } });
  if (existing) throw new TaxError(`A tax code "${code}" already exists`, 409);

  const taxCode = await prisma.taxCode.create({
    data: { name: data.name.trim(), code, type: data.type, region: data.region || null, category: data.category || TaxCategory.STANDARD },
  });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'TaxCode', targetId: taxCode.id, after: taxCode });
  return taxCode;
}

export async function updateTaxCode(id: string, data: { name?: string; region?: string; category?: TaxCategory; isActive?: boolean }, actorId: string) {
  const before = await prisma.taxCode.findUnique({ where: { id } });
  if (!before) throw new TaxError('Tax code not found', 404);

  const taxCode = await prisma.taxCode.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.region !== undefined ? { region: data.region } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxCode', targetId: id, before, after: taxCode });
  return taxCode;
}

// ─── Tax Rates (effective-dated, never overwritten) ───────

export async function createTaxRate(
  taxCodeId: string,
  data: { ratePercent: number | string; effectiveFrom: string | Date; effectiveTo?: string | Date | null },
  actorId: string
) {
  const taxCode = await prisma.taxCode.findUnique({ where: { id: taxCodeId } });
  if (!taxCode) throw new TaxError('Tax code not found', 404);

  const ratePercent = toDecimal(data.ratePercent);
  if (ratePercent.isNegative()) throw new TaxError('Tax rate cannot be negative');
  if (ratePercent.greaterThan(100)) throw new TaxError('Tax rate cannot exceed 100%');

  const effectiveFrom = new Date(data.effectiveFrom);
  if (isNaN(effectiveFrom.getTime())) throw new TaxError('Invalid effective-from date');
  const effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : null;
  if (effectiveTo && effectiveTo < effectiveFrom) throw new TaxError('Effective-to date cannot be before the effective-from date');

  // Prevent overlapping effective ranges for the same tax code.
  const existingRates = await prisma.taxRate.findMany({ where: { taxCodeId, isActive: true } });
  for (const r of existingRates) {
    const rEnd = r.effectiveTo ?? new Date(8640000000000000); // treat null as "open-ended"
    const newEnd = effectiveTo ?? new Date(8640000000000000);
    const overlaps = effectiveFrom <= rEnd && newEnd >= r.effectiveFrom;
    if (overlaps) throw new TaxError('This effective date range overlaps an existing rate for this tax code', 409);
  }

  const rate = await prisma.taxRate.create({ data: { taxCodeId, ratePercent, effectiveFrom, effectiveTo } });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'TaxRate', targetId: rate.id, after: rate });
  return rate;
}

export async function updateTaxRate(id: string, data: { effectiveTo?: string | Date | null; isActive?: boolean }, actorId: string) {
  const before = await prisma.taxRate.findUnique({ where: { id } });
  if (!before) throw new TaxError('Tax rate not found', 404);

  const rate = await prisma.taxRate.update({
    where: { id },
    data: {
      ...(data.effectiveTo !== undefined ? { effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxRate', targetId: id, before, after: rate });
  return rate;
}

/**
 * Jurisdiction-aware auto-selection: given a vendor/customer's region, finds
 * an active STANDARD-category VAT/GST tax code configured for that exact
 * region. Returns null (no auto-selection) if none matches — the caller
 * falls back to whatever taxCodeId was explicitly passed, so this is purely
 * additive and never overrides an explicit choice.
 */
export async function resolveTaxCodeForRegion(region: string | null | undefined): Promise<string | null> {
  if (!region) return null;
  const taxCode = await prisma.taxCode.findFirst({
    where: { region, isActive: true, category: TaxCategory.STANDARD },
    orderBy: { createdAt: 'asc' },
  });
  return taxCode?.id ?? null;
}

/** The rate effective on a given date — historical transactions always resolve the rate that applied *then*, never the current one. */
export async function resolveEffectiveRate(taxCodeId: string, asOf: Date) {
  const rate = await prisma.taxRate.findFirst({
    where: { taxCodeId, isActive: true, effectiveFrom: { lte: asOf }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }] },
    orderBy: { effectiveFrom: 'desc' },
  });
  if (!rate) throw new TaxError('No active tax rate is configured for this tax code on the given date', 409);
  return rate;
}
