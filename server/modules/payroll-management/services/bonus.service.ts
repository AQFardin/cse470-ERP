import { BonusType, PayrollApprovalStatus, PayrollPeriodStatus } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { PayrollError, toDecimal } from '../shared/payroll.util';

export async function listBonuses(filters: { employeeId?: string; payrollPeriodId?: string; status?: PayrollApprovalStatus }) {
  return prisma.payrollBonus.findMany({
    where: {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.payrollPeriodId ? { payrollPeriodId: filters.payrollPeriodId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } }, payrollPeriod: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBonus(
  data: { employeeId: string; payrollPeriodId: string; bonusType: BonusType; amount: number | string; description?: string },
  actorId: string
) {
  const amount = toDecimal(data.amount);
  if (amount.lessThanOrEqualTo(0)) throw new PayrollError('Bonus amount must be greater than zero');

  const [employee, period] = await Promise.all([
    prisma.employee.findUnique({ where: { id: data.employeeId } }),
    prisma.payrollPeriod.findUnique({ where: { id: data.payrollPeriodId } }),
  ]);
  if (!employee) throw new PayrollError('Employee not found', 404);
  if (!period) throw new PayrollError('Payroll period not found', 404);
  if (period.status === PayrollPeriodStatus.PAID || period.status === PayrollPeriodStatus.CANCELLED) {
    throw new PayrollError(`Cannot add a bonus to a ${period.status.toLowerCase()} payroll period`, 409);
  }

  const existing = await prisma.payrollBonus.findUnique({
    where: { employeeId_payrollPeriodId_bonusType: { employeeId: data.employeeId, payrollPeriodId: data.payrollPeriodId, bonusType: data.bonusType } },
  });
  if (existing) throw new PayrollError(`A ${data.bonusType} bonus already exists for this employee in this period`, 409);

  const bonus = await prisma.payrollBonus.create({
    data: { employeeId: data.employeeId, payrollPeriodId: data.payrollPeriodId, bonusType: data.bonusType, amount, description: data.description || null, createdById: actorId },
    include: { employee: { select: { id: true, firstName: true, lastName: true } } },
  });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'PayrollBonus', targetId: bonus.id, after: bonus });
  return bonus;
}

export async function updateBonus(id: string, data: { amount?: number | string; description?: string }, actorId: string) {
  const before = await prisma.payrollBonus.findUnique({ where: { id } });
  if (!before) throw new PayrollError('Bonus not found', 404);
  if (before.status !== PayrollApprovalStatus.PENDING) throw new PayrollError('Only pending bonuses can be edited', 409);

  const amount = data.amount !== undefined ? toDecimal(data.amount) : before.amount;
  if (amount.lessThanOrEqualTo(0)) throw new PayrollError('Bonus amount must be greater than zero');

  const bonus = await prisma.payrollBonus.update({ where: { id }, data: { amount, ...(data.description !== undefined ? { description: data.description } : {}) } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'PayrollBonus', targetId: id, before, after: bonus });
  return bonus;
}

export async function deleteBonus(id: string, actorId: string) {
  const before = await prisma.payrollBonus.findUnique({ where: { id } });
  if (!before) throw new PayrollError('Bonus not found', 404);
  if (before.status !== PayrollApprovalStatus.PENDING) throw new PayrollError('Only pending bonuses can be deleted', 409);

  await prisma.payrollBonus.delete({ where: { id } });
  await logAudit({ actorId, action: 'DELETE', targetEntity: 'PayrollBonus', targetId: id, before });
}

export async function decideBonus(id: string, decision: 'APPROVED' | 'REJECTED', actorId: string) {
  const before = await prisma.payrollBonus.findUnique({ where: { id } });
  if (!before) throw new PayrollError('Bonus not found', 404);
  if (before.status !== PayrollApprovalStatus.PENDING) throw new PayrollError('Only pending bonuses can be approved or rejected', 409);

  const bonus = await prisma.payrollBonus.update({ where: { id }, data: { status: decision, approvedById: actorId, approvedAt: new Date() } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'PayrollBonus', targetId: id, before: { status: before.status }, after: { status: bonus.status } });
  return bonus;
}
