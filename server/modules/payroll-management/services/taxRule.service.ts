import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { PayrollError, toDecimal } from '../shared/payroll.util';

export async function listTaxRules(filters: { isActive?: boolean } = {}) {
  return prisma.taxRule.findMany({
    where: filters.isActive !== undefined ? { isActive: filters.isActive } : {},
    include: { slabs: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { name: 'asc' },
  });
}

export async function getTaxRuleById(id: string) {
  const rule = await prisma.taxRule.findUnique({ where: { id }, include: { slabs: { orderBy: { sortOrder: 'asc' } } } });
  if (!rule) throw new PayrollError('Tax rule not found', 404);
  return rule;
}

export interface TaxSlabInput {
  minAmount: number | string;
  maxAmount?: number | string | null;
  ratePercent: number | string;
}

function validateSlabs(slabs: TaxSlabInput[]) {
  if (!Array.isArray(slabs) || slabs.length === 0) throw new PayrollError('At least one tax slab is required');
  for (const [idx, s] of slabs.entries()) {
    const min = toDecimal(s.minAmount);
    const rate = toDecimal(s.ratePercent);
    if (min.isNegative()) throw new PayrollError(`Slab ${idx + 1}: minimum amount cannot be negative`);
    if (rate.isNegative() || rate.greaterThan(100)) throw new PayrollError(`Slab ${idx + 1}: rate must be between 0 and 100`);
    if (s.maxAmount !== undefined && s.maxAmount !== null) {
      const max = toDecimal(s.maxAmount);
      if (max.lessThanOrEqualTo(min)) throw new PayrollError(`Slab ${idx + 1}: maximum amount must be greater than the minimum`);
    }
  }
}

export async function createTaxRule(data: { name: string; exemptionAmount?: number | string; slabs: TaxSlabInput[] }, actorId: string) {
  if (!data.name?.trim()) throw new PayrollError('Tax rule name is required');
  validateSlabs(data.slabs);

  const rule = await prisma.taxRule.create({
    data: {
      name: data.name.trim(),
      exemptionAmount: toDecimal(data.exemptionAmount),
      slabs: {
        create: data.slabs.map((s, idx) => ({
          minAmount: toDecimal(s.minAmount),
          maxAmount: s.maxAmount === undefined || s.maxAmount === null ? null : toDecimal(s.maxAmount),
          ratePercent: toDecimal(s.ratePercent),
          sortOrder: idx,
        })),
      },
    },
    include: { slabs: true },
  });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'TaxRule', targetId: rule.id, after: rule });
  return rule;
}

export async function updateTaxRule(
  id: string,
  data: { name?: string; exemptionAmount?: number | string; isActive?: boolean; slabs?: TaxSlabInput[] },
  actorId: string
) {
  const before = await prisma.taxRule.findUnique({ where: { id }, include: { slabs: true } });
  if (!before) throw new PayrollError('Tax rule not found', 404);

  if (data.slabs) validateSlabs(data.slabs);

  const rule = await prisma.$transaction(async (tx) => {
    if (data.slabs) {
      await tx.taxSlab.deleteMany({ where: { taxRuleId: id } });
    }
    return tx.taxRule.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.exemptionAmount !== undefined ? { exemptionAmount: toDecimal(data.exemptionAmount) } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.slabs
          ? { slabs: { create: data.slabs.map((s, idx) => ({ minAmount: toDecimal(s.minAmount), maxAmount: s.maxAmount == null ? null : toDecimal(s.maxAmount), ratePercent: toDecimal(s.ratePercent), sortOrder: idx })) } }
          : {}),
      },
      include: { slabs: { orderBy: { sortOrder: 'asc' } } },
    });
  });

  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxRule', targetId: id, before, after: rule });
  return rule;
}
