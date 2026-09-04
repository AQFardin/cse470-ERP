import { DeductionType, PayrollApprovalStatus, PayrollPeriodStatus } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { PayrollError, toDecimal } from '../shared/payroll.util';

export async function listDeductions(filters: { employeeId?: string; payrollPeriodId?: string; status?: PayrollApprovalStatus }) {
  return prisma.payrollDeduction.findMany({
    where: {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.payrollPeriodId ? { payrollPeriodId: filters.payrollPeriodId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } }, payrollPeriod: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createDeduction(
  data: { employeeId: string; payrollPeriodId: string; deductionType: DeductionType; amount: number | string; description?: string },
  actorId: string
) {
  const amount = toDecimal(data.amount);
  if (amount.lessThanOrEqualTo(0)) throw new PayrollError('Deduction amount must be greater than zero');

  const [employee, period] = await Promise.all([
    prisma.employee.findUnique({ where: { id: data.employeeId } }),
    prisma.payrollPeriod.findUnique({ where: { id: data.payrollPeriodId } }),
  ]);
  if (!employee) throw new PayrollError('Employee not found', 404);
  if (!period) throw new PayrollError('Payroll period not found', 404);
  if (period.status === PayrollPeriodStatus.PAID || period.status === PayrollPeriodStatus.CANCELLED) {
    throw new PayrollError(`Cannot add a deduction to a ${period.status.toLowerCase()} payroll period`, 409);
  }

  const existing = await prisma.payrollDeduction.findUnique({
    where: { employeeId_payrollPeriodId_deductionType: { employeeId: data.employeeId, payrollPeriodId: data.payrollPeriodId, deductionType: data.deductionType } },
  });
  if (existing) throw new PayrollError(`A ${data.deductionType} deduction already exists for this employee in this period`, 409);

  const deduction = await prisma.payrollDeduction.create({
    data: { employeeId: data.employeeId, payrollPeriodId: data.payrollPeriodId, deductionType: data.deductionType, amount, description: data.description || null, createdById: actorId },
    include: { employee: { select: { id: true, firstName: true, lastName: true } } },
  });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'PayrollDeduction', targetId: deduction.id, after: deduction });
  return deduction;
}

export async function updateDeduction(id: string, data: { amount?: number | string; description?: string }, actorId: string) {
  const before = await prisma.payrollDeduction.findUnique({ where: { id } });
  if (!before) throw new PayrollError('Deduction not found', 404);
  if (before.status !== PayrollApprovalStatus.PENDING) throw new PayrollError('Only pending deductions can be edited', 409);

  const amount = data.amount !== undefined ? toDecimal(data.amount) : before.amount;
  if (amount.lessThanOrEqualTo(0)) throw new PayrollError('Deduction amount must be greater than zero');

  const deduction = await prisma.payrollDeduction.update({ where: { id }, data: { amount, ...(data.description !== undefined ? { description: data.description } : {}) } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'PayrollDeduction', targetId: id, before, after: deduction });
  return deduction;
}

export async function deleteDeduction(id: string, actorId: string) {
  const before = await prisma.payrollDeduction.findUnique({ where: { id } });
  if (!before) throw new PayrollError('Deduction not found', 404);
  if (before.status !== PayrollApprovalStatus.PENDING) throw new PayrollError('Only pending deductions can be deleted', 409);

  await prisma.payrollDeduction.delete({ where: { id } });
  await logAudit({ actorId, action: 'DELETE', targetEntity: 'PayrollDeduction', targetId: id, before });
}

export async function decideDeduction(id: string, decision: 'APPROVED' | 'REJECTED', actorId: string) {
  const before = await prisma.payrollDeduction.findUnique({ where: { id } });
  if (!before) throw new PayrollError('Deduction not found', 404);
  if (before.status !== PayrollApprovalStatus.PENDING) throw new PayrollError('Only pending deductions can be approved or rejected', 409);

  const deduction = await prisma.payrollDeduction.update({ where: { id }, data: { status: decision, approvedById: actorId, approvedAt: new Date() } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'PayrollDeduction', targetId: id, before: { status: before.status }, after: { status: deduction.status } });
  return deduction;
}
