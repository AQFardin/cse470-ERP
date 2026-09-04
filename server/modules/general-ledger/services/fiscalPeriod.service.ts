import { FiscalPeriodStatus } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { LedgerError } from './ledger.service';

export async function listFiscalPeriods() {
  return prisma.fiscalPeriod.findMany({
    orderBy: { startDate: 'desc' },
    include: { createdBy: { select: { id: true, name: true } }, closedBy: { select: { id: true, name: true } }, reopenedBy: { select: { id: true, name: true } } },
  });
}

export async function createFiscalPeriod(data: { name: string; startDate: string | Date; endDate: string | Date }, actorId: string) {
  if (!data.name?.trim()) throw new LedgerError('Fiscal period name is required');
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new LedgerError('Invalid date(s)');
  if (endDate < startDate) throw new LedgerError('End date cannot be before start date');

  const overlapping = await prisma.fiscalPeriod.findFirst({ where: { startDate: { lte: endDate }, endDate: { gte: startDate } } });
  if (overlapping) throw new LedgerError(`This date range overlaps existing fiscal period "${overlapping.name}"`, 409);

  const period = await prisma.fiscalPeriod.create({ data: { name: data.name.trim(), startDate, endDate, status: FiscalPeriodStatus.OPEN, createdById: actorId } });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'FiscalPeriod', targetId: period.id, after: period });
  return period;
}

export async function closeFiscalPeriod(id: string, actorId: string) {
  const before = await prisma.fiscalPeriod.findUnique({ where: { id } });
  if (!before) throw new LedgerError('Fiscal period not found', 404);
  if (before.status === FiscalPeriodStatus.CLOSED) throw new LedgerError('This fiscal period is already closed', 409);

  const after = await prisma.fiscalPeriod.update({ where: { id }, data: { status: FiscalPeriodStatus.CLOSED, closedById: actorId, closedAt: new Date() } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'FiscalPeriod', targetId: id, before: { status: before.status }, after: { status: after.status } });
  return after;
}

/** Administrator override — reopens a closed period so corrections can be posted, then it should be re-closed. */
export async function reopenFiscalPeriod(id: string, actorId: string) {
  const before = await prisma.fiscalPeriod.findUnique({ where: { id } });
  if (!before) throw new LedgerError('Fiscal period not found', 404);
  if (before.status === FiscalPeriodStatus.OPEN) throw new LedgerError('This fiscal period is already open', 409);

  const after = await prisma.fiscalPeriod.update({ where: { id }, data: { status: FiscalPeriodStatus.OPEN, reopenedById: actorId, reopenedAt: new Date() } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'FiscalPeriod', targetId: id, before: { status: before.status }, after: { status: after.status } });
  return after;
}

