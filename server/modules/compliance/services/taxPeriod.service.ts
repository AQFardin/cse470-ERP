import { Prisma, TaxPeriodStatus, TaxDirection, TaxTransactionStatus } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { TaxError } from '../shared/tax.util';

type TxClient = Prisma.TransactionClient;

export async function listTaxPeriods(filters: { status?: TaxPeriodStatus } = {}) {
  return prisma.taxPeriod.findMany({
    where: { ...(filters.status ? { status: filters.status } : {}) },
    orderBy: { startDate: 'desc' },
  });
}

export async function getTaxPeriodById(id: string) {
  const period = await prisma.taxPeriod.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      finalizedBy: { select: { id: true, name: true } },
      filedBy: { select: { id: true, name: true } },
      payment: true,
    },
  });
  if (!period) throw new TaxError('Tax period not found', 404);
  return period;
}

export async function createTaxPeriod(data: { name: string; startDate: string | Date; endDate: string | Date; dueDate: string | Date }, actorId: string) {
  if (!data.name?.trim()) throw new TaxError('Tax period name is required');

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const dueDate = new Date(data.dueDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(dueDate.getTime())) throw new TaxError('Invalid date(s)');
  if (endDate < startDate) throw new TaxError('End date cannot be before start date');

  const overlapping = await prisma.taxPeriod.findFirst({
    where: { startDate: { lte: endDate }, endDate: { gte: startDate } },
  });
  if (overlapping) throw new TaxError(`This date range overlaps existing tax period "${overlapping.name}"`, 409);

  const period = await prisma.taxPeriod.create({
    data: { name: data.name.trim(), startDate, endDate, dueDate, status: TaxPeriodStatus.OPEN, createdById: actorId },
  });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'TaxPeriod', targetId: period.id, after: period });
  return period;
}

async function requireStatus(tx: TxClient, id: string, allowed: TaxPeriodStatus[]) {
  const period = await tx.taxPeriod.findUnique({ where: { id } });
  if (!period) throw new TaxError('Tax period not found', 404);
  if (!allowed.includes(period.status)) {
    throw new TaxError(`Tax period is ${period.status}; expected one of ${allowed.join(', ')} for this action`, 409);
  }
  return period;
}

/**
 * Recomputes the period's output/input tax snapshot from ACTIVE tax
 * transactions in its date range, using DB-side aggregation. Repeatable
 * while OPEN or REVIEW; locked out once FINALIZED so a finalized return's
 * numbers never silently drift from later-posted transactions.
 */
export async function calculateTaxPeriod(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const period = await requireStatus(tx, id, [TaxPeriodStatus.OPEN, TaxPeriodStatus.REVIEW]);

    // Attach any ACTIVE transactions in range that aren't yet linked to a period.
    await tx.taxTransaction.updateMany({
      where: {
        status: TaxTransactionStatus.ACTIVE,
        taxPeriodId: null,
        transactionDate: { gte: period.startDate, lte: period.endDate },
      },
      data: { taxPeriodId: period.id },
    });

    const sums = await tx.taxTransaction.groupBy({
      by: ['direction'],
      where: { taxPeriodId: period.id, status: TaxTransactionStatus.ACTIVE },
      _sum: { taxAmount: true },
    });

    const outputTax = sums.find((s) => s.direction === TaxDirection.OUTPUT)?._sum.taxAmount ?? new Prisma.Decimal(0);
    const inputTax = sums.find((s) => s.direction === TaxDirection.INPUT)?._sum.taxAmount ?? new Prisma.Decimal(0);
    const netPayable = outputTax.minus(inputTax).plus(period.adjustments);

    const updated = await tx.taxPeriod.update({
      where: { id },
      data: { outputTax, inputTax, netPayable, calculatedAt: new Date() },
    });
    return { before: period, after: updated };
  });

  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxPeriod', targetId: id, before: result.before, after: result.after });
  return result.after;
}

export async function reviewTaxPeriod(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const period = await requireStatus(tx, id, [TaxPeriodStatus.OPEN]);
    if (!period.calculatedAt) throw new TaxError('Calculate the tax period before submitting it for review', 409);
    const updated = await tx.taxPeriod.update({
      where: { id },
      data: { status: TaxPeriodStatus.REVIEW, reviewedById: actorId, reviewedAt: new Date() },
    });
    return { before: period, after: updated };
  });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxPeriod', targetId: id, before: { status: result.before.status }, after: { status: result.after.status } });
  return result.after;
}

export async function finalizeTaxPeriod(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const period = await requireStatus(tx, id, [TaxPeriodStatus.REVIEW]);
    const updated = await tx.taxPeriod.update({
      where: { id },
      data: { status: TaxPeriodStatus.FINALIZED, finalizedById: actorId, finalizedAt: new Date() },
    });
    return { before: period, after: updated };
  });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxPeriod', targetId: id, before: { status: result.before.status }, after: { status: result.after.status } });
  return result.after;
}

export async function fileTaxPeriod(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const period = await requireStatus(tx, id, [TaxPeriodStatus.FINALIZED]);
    const updated = await tx.taxPeriod.update({
      where: { id },
      data: { status: TaxPeriodStatus.FILED, filedById: actorId, filedAt: new Date() },
    });
    return { before: period, after: updated };
  });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxPeriod', targetId: id, before: { status: result.before.status }, after: { status: result.after.status } });
  return result.after;
}

export async function closeTaxPeriod(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const period = await requireStatus(tx, id, [TaxPeriodStatus.FILED]);
    const updated = await tx.taxPeriod.update({ where: { id }, data: { status: TaxPeriodStatus.CLOSED, closedAt: new Date() } });
    return { before: period, after: updated };
  });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxPeriod', targetId: id, before: { status: result.before.status }, after: { status: result.after.status } });
  return result.after;
}
