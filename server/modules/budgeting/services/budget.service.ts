import { Prisma, BudgetStatus, Department } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { BudgetError, toDecimal } from '../shared/budgeting.util';

type TxClient = Prisma.TransactionClient;

export interface BudgetLineMonthInput {
  month: number;
  amount: number | string;
}

export interface BudgetLineInput {
  department?: Department | null;
  accountId: string;
  annualAmount: number | string;
  notes?: string;
  months?: BudgetLineMonthInput[];
}

export interface BudgetInput {
  name: string;
  fiscalYear: number;
  startDate: string | Date;
  endDate: string | Date;
  description?: string;
  lines: BudgetLineInput[];
}

async function validateAndNormalizeLines(lines: BudgetLineInput[], tx: TxClient) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new BudgetError('A budget must contain at least one budget line');
  }

  const seen = new Set<string>();
  const normalized: { department: Department | null; accountId: string; annualAmount: Prisma.Decimal; notes: string | null; months: { month: number; amount: Prisma.Decimal }[] }[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const label = `Line ${idx + 1}`;
    if (!line.accountId) throw new BudgetError(`${label}: account is required`);

    const account = await tx.account.findUnique({ where: { id: line.accountId } });
    if (!account) throw new BudgetError(`${label}: account not found`);
    if (!account.isActive) throw new BudgetError(`${label}: cannot budget against inactive account "${account.code} ${account.name}"`);

    const dedupeKey = `${line.department || ''}:${line.accountId}`;
    if (seen.has(dedupeKey)) throw new BudgetError(`${label}: duplicate department/account combination in this budget`);
    seen.add(dedupeKey);

    const annualAmount = toDecimal(line.annualAmount);
    if (annualAmount.isNegative()) throw new BudgetError(`${label}: annual amount cannot be negative`);

    const months: { month: number; amount: Prisma.Decimal }[] = [];
    if (line.months && line.months.length > 0) {
      const monthsSeen = new Set<number>();
      let monthSum = new Prisma.Decimal(0);
      for (const m of line.months) {
        if (!Number.isInteger(m.month) || m.month < 1 || m.month > 12) throw new BudgetError(`${label}: month must be between 1 and 12`);
        if (monthsSeen.has(m.month)) throw new BudgetError(`${label}: duplicate month ${m.month}`);
        monthsSeen.add(m.month);
        const amount = toDecimal(m.amount);
        if (amount.isNegative()) throw new BudgetError(`${label}: monthly allocation cannot be negative`);
        monthSum = monthSum.plus(amount);
        months.push({ month: m.month, amount });
      }
      if (!monthSum.equals(annualAmount)) {
        throw new BudgetError(`${label}: monthly allocations (${monthSum.toFixed(2)}) must sum to the annual amount (${annualAmount.toFixed(2)})`);
      }
    }

    normalized.push({ department: line.department || null, accountId: line.accountId, annualAmount, notes: line.notes || null, months });
  }

  return normalized;
}

export async function listBudgets(filters: { fiscalYear?: number; status?: BudgetStatus; search?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const where: Prisma.BudgetWhereInput = {
    ...(filters.fiscalYear ? { fiscalYear: filters.fiscalYear } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { name: { contains: filters.search } } : {}),
  };

  const [total, budgets] = await Promise.all([
    prisma.budget.count({ where }),
    prisma.budget.findMany({
      where,
      orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { lines: true } }, createdBy: { select: { id: true, name: true } } },
    }),
  ]);
  return { budgets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

export async function getBudgetById(id: string) {
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: {
      lines: { include: { account: { select: { id: true, code: true, name: true, type: true } }, months: { orderBy: { month: 'asc' } } } },
      createdBy: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      activatedBy: { select: { id: true, name: true } },
      revisedFrom: { select: { id: true, name: true, version: true } },
      revisions: { select: { id: true, name: true, version: true, status: true } },
    },
  });
  if (!budget) throw new BudgetError('Budget not found', 404);
  return budget;
}

export async function createBudget(input: BudgetInput, actorId: string) {
  if (!input.name?.trim()) throw new BudgetError('Budget name is required');
  if (!Number.isInteger(input.fiscalYear)) throw new BudgetError('Fiscal year is required');
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new BudgetError('Invalid start or end date');
  if (endDate < startDate) throw new BudgetError('End date cannot be before the start date');

  const budget = await prisma.$transaction(async (tx) => {
    const normalized = await validateAndNormalizeLines(input.lines, tx);

    return tx.budget.create({
      data: {
        name: input.name.trim(),
        fiscalYear: input.fiscalYear,
        startDate,
        endDate,
        description: input.description || null,
        status: BudgetStatus.DRAFT,
        createdById: actorId,
        lines: {
          create: normalized.map((l) => ({
            department: l.department,
            accountId: l.accountId,
            annualAmount: l.annualAmount,
            notes: l.notes,
            months: { create: l.months },
          })),
        },
      },
      include: { lines: { include: { account: true, months: true } } },
    });
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'Budget', targetId: budget.id, after: budget });
  return budget;
}

export async function updateBudget(id: string, input: Partial<BudgetInput>, actorId: string) {
  const before = await prisma.budget.findUnique({ where: { id }, include: { lines: true } });
  if (!before) throw new BudgetError('Budget not found', 404);
  if (before.status !== BudgetStatus.DRAFT) throw new BudgetError('Only draft budgets can be edited', 409);

  if (input.startDate || input.endDate) {
    const startDate = new Date(input.startDate || before.startDate);
    const endDate = new Date(input.endDate || before.endDate);
    if (endDate < startDate) throw new BudgetError('End date cannot be before the start date');
  }

  const budget = await prisma.$transaction(async (tx) => {
    let linesUpdate: Awaited<ReturnType<typeof validateAndNormalizeLines>> | undefined;
    if (input.lines) {
      linesUpdate = await validateAndNormalizeLines(input.lines, tx);
      const lineIds = (await tx.budgetLine.findMany({ where: { budgetId: id }, select: { id: true } })).map((l) => l.id);
      await tx.budgetLineMonth.deleteMany({ where: { budgetLineId: { in: lineIds } } });
      await tx.budgetLine.deleteMany({ where: { budgetId: id } });
    }

    return tx.budget.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.fiscalYear !== undefined ? { fiscalYear: input.fiscalYear } : {}),
        ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
        ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(linesUpdate
          ? { lines: { create: linesUpdate.map((l) => ({ department: l.department, accountId: l.accountId, annualAmount: l.annualAmount, notes: l.notes, months: { create: l.months } })) } }
          : {}),
      },
      include: { lines: { include: { account: true, months: true } } },
    });
  });

  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'Budget', targetId: id, before, after: budget });
  return budget;
}

export async function deleteBudget(id: string, actorId: string) {
  const before = await prisma.budget.findUnique({ where: { id } });
  if (!before) throw new BudgetError('Budget not found', 404);
  if (before.status !== BudgetStatus.DRAFT) throw new BudgetError('Only draft budgets can be deleted', 409);

  await prisma.budget.delete({ where: { id } });
  await logAudit({ actorId, action: 'DELETE', targetEntity: 'Budget', targetId: id, before });
}

async function transition(id: string, from: BudgetStatus[], to: BudgetStatus, actorId: string, extra: Prisma.BudgetUncheckedUpdateInput = {}) {
  const before = await prisma.budget.findUnique({ where: { id } });
  if (!before) throw new BudgetError('Budget not found', 404);
  if (!from.includes(before.status)) {
    throw new BudgetError(`Budget is ${before.status.toLowerCase().replace('_', ' ')}; expected ${from.map((s) => s.toLowerCase()).join(' or ')}`, 409);
  }

  const after = await prisma.budget.update({ where: { id }, data: { status: to, ...extra } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'Budget', targetId: id, before: { status: before.status }, after: { status: after.status } });
  return after;
}

export async function submitBudget(id: string, actorId: string) {
  const budget = await prisma.budget.findUnique({ where: { id }, include: { _count: { select: { lines: true } } } });
  if (!budget) throw new BudgetError('Budget not found', 404);
  if (budget._count.lines === 0) throw new BudgetError('Cannot submit a budget with no budget lines', 409);
  return transition(id, [BudgetStatus.DRAFT], BudgetStatus.PENDING_APPROVAL, actorId, { submittedById: actorId, submittedAt: new Date() });
}

export async function approveBudget(id: string, actorId: string) {
  return transition(id, [BudgetStatus.PENDING_APPROVAL], BudgetStatus.APPROVED, actorId, { approvedById: actorId, approvedAt: new Date() });
}

export async function activateBudget(id: string, actorId: string) {
  const budget = await prisma.budget.findUnique({ where: { id }, include: { lines: true } });
  if (!budget) throw new BudgetError('Budget not found', 404);
  if (budget.status !== BudgetStatus.APPROVED) throw new BudgetError('Only approved budgets can be activated', 409);

  // Prevent overlapping active budgets for the same fiscal year + department + account.
  const activeSameYear = await prisma.budget.findMany({
    where: { status: BudgetStatus.ACTIVE, fiscalYear: budget.fiscalYear, id: { not: id } },
    include: { lines: true },
  });
  for (const other of activeSameYear) {
    for (const line of budget.lines) {
      const clash = other.lines.find((ol) => ol.accountId === line.accountId && ol.department === line.department);
      if (clash) {
        throw new BudgetError(
          `An active budget ("${other.name}") already covers fiscal year ${budget.fiscalYear} for this department/account combination`,
          409
        );
      }
    }
  }

  return transition(id, [BudgetStatus.APPROVED], BudgetStatus.ACTIVE, actorId, { activatedById: actorId, activatedAt: new Date() });
}

export async function closeBudget(id: string, actorId: string) {
  return transition(id, [BudgetStatus.ACTIVE], BudgetStatus.CLOSED, actorId, { closedAt: new Date() });
}

export async function cancelBudget(id: string, actorId: string) {
  return transition(id, [BudgetStatus.DRAFT, BudgetStatus.PENDING_APPROVAL, BudgetStatus.APPROVED, BudgetStatus.ACTIVE], BudgetStatus.CANCELLED, actorId, { cancelledAt: new Date() });
}

export async function reviseBudget(id: string, actorId: string) {
  const original = await prisma.budget.findUnique({ where: { id }, include: { lines: { include: { months: true } } } });
  if (!original) throw new BudgetError('Budget not found', 404);
  if (!([BudgetStatus.APPROVED, BudgetStatus.ACTIVE, BudgetStatus.CLOSED] as BudgetStatus[]).includes(original.status)) {
    throw new BudgetError('Only an approved, active, or closed budget can be revised', 409);
  }

  const latestVersion = await prisma.budget.findFirst({
    where: { OR: [{ id: original.id }, { revisedFromId: original.id }, { revisedFrom: { revisedFromId: original.id } }] },
    orderBy: { version: 'desc' },
  });

  const revision = await prisma.budget.create({
    data: {
      name: `${original.name} (Revision ${(latestVersion?.version || original.version) + 1})`,
      fiscalYear: original.fiscalYear,
      startDate: original.startDate,
      endDate: original.endDate,
      description: original.description,
      status: BudgetStatus.DRAFT,
      version: (latestVersion?.version || original.version) + 1,
      revisedFromId: original.id,
      createdById: actorId,
      lines: {
        create: original.lines.map((l) => ({
          department: l.department,
          accountId: l.accountId,
          annualAmount: l.annualAmount,
          notes: l.notes,
          months: { create: l.months.map((m) => ({ month: m.month, amount: m.amount })) },
        })),
      },
    },
    include: { lines: { include: { account: true, months: true } } },
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'Budget', targetId: revision.id, after: { revisionOf: original.name, version: revision.version } });
  return revision;
}
