import { Prisma, SalaryComponentCategory, SalaryComponentCalcType } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { PayrollError, toDecimal } from '../shared/payroll.util';

// ─── Salary Components (configurable allowance/deduction catalog) ─

export async function listSalaryComponents(filters: { category?: SalaryComponentCategory; isActive?: boolean } = {}) {
  return prisma.salaryComponent.findMany({
    where: {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

export async function createSalaryComponent(
  data: { name: string; category: SalaryComponentCategory; calcType?: SalaryComponentCalcType; isTaxable?: boolean },
  actorId: string
) {
  if (!data.name?.trim()) throw new PayrollError('Component name is required');
  const existing = await prisma.salaryComponent.findUnique({ where: { name: data.name.trim() } });
  if (existing) throw new PayrollError(`A salary component named "${data.name}" already exists`, 409);

  const component = await prisma.salaryComponent.create({
    data: {
      name: data.name.trim(),
      category: data.category,
      calcType: data.calcType || SalaryComponentCalcType.FIXED,
      isTaxable: data.category === SalaryComponentCategory.ALLOWANCE ? data.isTaxable ?? true : true,
    },
  });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'SalaryComponent', targetId: component.id, after: component });
  return component;
}

export async function updateSalaryComponent(id: string, data: { name?: string; isTaxable?: boolean; isActive?: boolean }, actorId: string) {
  const before = await prisma.salaryComponent.findUnique({ where: { id } });
  if (!before) throw new PayrollError('Salary component not found', 404);

  const component = await prisma.salaryComponent.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.isTaxable !== undefined ? { isTaxable: data.isTaxable } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'SalaryComponent', targetId: id, before, after: component });
  return component;
}

// ─── Employee Salary (versioned, effective-dated) ─────────

export interface EmployeeSalaryInput {
  basicSalary: number | string;
  effectiveFrom: string | Date;
  currency?: string;
  notes?: string;
  components?: { salaryComponentId: string; amount: number | string }[];
}

export async function getEmployeeSalaryHistory(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new PayrollError('Employee not found', 404);

  return prisma.employeeSalary.findMany({
    where: { employeeId },
    orderBy: { effectiveFrom: 'desc' },
    include: { components: { include: { salaryComponent: true } }, createdBy: { select: { id: true, name: true } } },
  });
}

export async function getCurrentEmployeeSalary(employeeId: string, asOf: Date = new Date()) {
  return prisma.employeeSalary.findFirst({
    where: { employeeId, effectiveFrom: { lte: asOf } },
    orderBy: { effectiveFrom: 'desc' },
    include: { components: { include: { salaryComponent: true } } },
  });
}

/** The salary version that applied during a given payroll period — always resolved by date, never mutated after the fact. */
export async function getEffectiveSalaryForPeriod(employeeId: string, periodStart: Date) {
  return getCurrentEmployeeSalary(employeeId, periodStart);
}

export async function assignEmployeeSalary(employeeId: string, input: EmployeeSalaryInput, actorId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new PayrollError('Employee not found', 404);

  const basicSalary = toDecimal(input.basicSalary);
  if (basicSalary.lessThanOrEqualTo(0)) throw new PayrollError('Basic salary must be greater than zero');

  const effectiveFrom = new Date(input.effectiveFrom);
  if (isNaN(effectiveFrom.getTime())) throw new PayrollError('Invalid effective date');

  const componentInputs = input.components || [];
  const componentIds = componentInputs.map((c) => c.salaryComponentId);
  if (new Set(componentIds).size !== componentIds.length) {
    throw new PayrollError('Duplicate salary component in the same salary assignment');
  }

  const salary = await prisma.$transaction(async (tx) => {
    for (const c of componentInputs) {
      const amount = toDecimal(c.amount);
      if (amount.isNegative()) throw new PayrollError('Salary component amounts cannot be negative');
      const component = await tx.salaryComponent.findUnique({ where: { id: c.salaryComponentId } });
      if (!component) throw new PayrollError('Salary component not found', 404);
      if (!component.isActive) throw new PayrollError(`Cannot use inactive salary component "${component.name}"`, 409);
    }

    return tx.employeeSalary.create({
      data: {
        employeeId,
        basicSalary,
        currency: input.currency?.trim() || 'BDT',
        effectiveFrom,
        notes: input.notes || null,
        createdById: actorId,
        components: {
          create: componentInputs.map((c) => ({ salaryComponentId: c.salaryComponentId, amount: toDecimal(c.amount) })),
        },
      },
      include: { components: { include: { salaryComponent: true } } },
    });
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'EmployeeSalary', targetId: salary.id, after: salary });
  return salary;
}
