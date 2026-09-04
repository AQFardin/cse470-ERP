import { Prisma, AccountType, JournalStatus, FiscalPeriodStatus } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import { userHasPermission } from '../../../src/middleware/authorize';

/**
 * General Ledger domain service — the single place that knows the
 * double-entry accounting rules. Every other module (this one's
 * controllers, and any future AP/AR, Payroll, Budgeting, or
 * Compliance/Tax module) should create accounting entries by calling
 * createJournalEntry() rather than writing to gl_journal_entries /
 * gl_journal_lines directly.
 */

export class LedgerError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface JournalLineInput {
  accountId: string;
  description?: string | null;
  debit?: number | string | Prisma.Decimal | null;
  credit?: number | string | Prisma.Decimal | null;
}

type TxClient = Prisma.TransactionClient;

// ─── Chart of Accounts ───────────────────────────────────

export async function listAccounts(filters: { type?: AccountType; isActive?: boolean; search?: string } = {}) {
  return prisma.account.findMany({
    where: {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { code: { contains: filters.search } },
              { name: { contains: filters.search } },
            ],
          }
        : {}),
    },
    include: { parent: { select: { id: true, code: true, name: true } } },
    orderBy: { code: 'asc' },
  });
}

export async function getAccountById(id: string) {
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, code: true, name: true } },
      children: { select: { id: true, code: true, name: true, isActive: true } },
    },
  });
  if (!account) throw new LedgerError('Account not found', 404);
  return account;
}

export async function createAccount(
  data: { code: string; name: string; type: AccountType; parentId?: string | null; description?: string | null },
  actorId: string
) {
  const code = (data.code || '').trim();
  const name = (data.name || '').trim();
  if (!code) throw new LedgerError('Account code is required');
  if (!name) throw new LedgerError('Account name is required');
  if (!data.type) throw new LedgerError('Account type is required');

  const existing = await prisma.account.findUnique({ where: { code } });
  if (existing) throw new LedgerError(`Account code "${code}" already exists`, 409);

  if (data.parentId) {
    const parent = await prisma.account.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new LedgerError('Parent account not found', 404);
  }

  const account = await prisma.account.create({
    data: {
      code,
      name,
      type: data.type,
      parentId: data.parentId || null,
      description: data.description || null,
    },
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'Account', targetId: account.id, after: account });
  return account;
}

export async function updateAccount(
  id: string,
  data: { name?: string; description?: string | null; parentId?: string | null; isActive?: boolean; type?: AccountType },
  actorId: string
) {
  const before = await prisma.account.findUnique({ where: { id } });
  if (!before) throw new LedgerError('Account not found', 404);

  if (data.parentId !== undefined && data.parentId !== null) {
    if (data.parentId === id) throw new LedgerError('An account cannot be its own parent');
    const parent = await prisma.account.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new LedgerError('Parent account not found', 404);
    // Walk up the intended parent's chain to prevent creating a cycle.
    let cursor: string | null = parent.parentId;
    while (cursor) {
      if (cursor === id) throw new LedgerError('Circular account hierarchy is not allowed');
      const next = await prisma.account.findUnique({ where: { id: cursor }, select: { parentId: true } });
      cursor = next?.parentId ?? null;
    }
  }

  if (data.type && data.type !== before.type) {
    const lineCount = await prisma.journalLine.count({ where: { accountId: id } });
    if (lineCount > 0) {
      throw new LedgerError('Cannot change account type: this account already has journal transactions', 409);
    }
  }

  const account = await prisma.account.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
    },
  });

  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'Account', targetId: id, before, after: account });
  return account;
}

// ─── Journal validation ──────────────────────────────────

async function validateAndNormalizeLines(linesInput: JournalLineInput[], tx: TxClient) {
  if (!Array.isArray(linesInput) || linesInput.length < 2) {
    throw new LedgerError('A journal entry must contain at least two lines');
  }

  const normalized: { accountId: string; description: string | null; debit: Prisma.Decimal; credit: Prisma.Decimal }[] = [];
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);
  let hasDebit = false;
  let hasCredit = false;

  for (let idx = 0; idx < linesInput.length; idx++) {
    const line = linesInput[idx];
    const label = `Line ${idx + 1}`;
    if (!line.accountId) throw new LedgerError(`${label}: account is required`);

    let debit: Prisma.Decimal;
    let credit: Prisma.Decimal;
    try {
      debit = new Prisma.Decimal(line.debit ?? 0);
      credit = new Prisma.Decimal(line.credit ?? 0);
    } catch {
      throw new LedgerError(`${label}: debit/credit must be valid numbers`);
    }

    if (debit.isNegative() || credit.isNegative()) {
      throw new LedgerError(`${label}: debit and credit amounts cannot be negative`);
    }
    if (debit.greaterThan(0) && credit.greaterThan(0)) {
      throw new LedgerError(`${label}: a line cannot have both a debit and a credit amount`);
    }
    if (debit.equals(0) && credit.equals(0)) {
      throw new LedgerError(`${label}: must have a debit or a credit amount greater than zero`);
    }

    const account = await tx.account.findUnique({ where: { id: line.accountId } });
    if (!account) throw new LedgerError(`${label}: account not found`);
    if (!account.isActive) {
      throw new LedgerError(`${label}: cannot post to inactive account "${account.code} ${account.name}"`);
    }

    if (debit.greaterThan(0)) hasDebit = true;
    if (credit.greaterThan(0)) hasCredit = true;

    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);

    normalized.push({ accountId: line.accountId, description: line.description?.trim() || null, debit, credit });
  }

  if (!hasDebit || !hasCredit) {
    throw new LedgerError('A journal entry must contain at least one debit line and one credit line');
  }
  if (!totalDebit.equals(totalCredit)) {
    throw new LedgerError(
      `Journal entry is not balanced: total debit ${totalDebit.toFixed(2)} does not equal total credit ${totalCredit.toFixed(2)}`
    );
  }

  return { normalized, totalDebit, totalCredit };
}

/**
 * Blocks a journal entry from becoming POSTED with a transaction date inside
 * a CLOSED fiscal period, unless the actor holds
 * general_ledger.override_closed_period. A date with no covering
 * FiscalPeriod is treated as open — periods are opt-in, so behavior for
 * anyone not using them is unchanged from before this feature existed.
 */
async function assertPeriodOpenForPosting(client: TxClient, transactionDate: Date, actorId: string) {
  const period = await client.fiscalPeriod.findFirst({ where: { startDate: { lte: transactionDate }, endDate: { gte: transactionDate } } });
  if (!period || period.status === FiscalPeriodStatus.OPEN) return;

  const actorRoles = (await client.userRole.findMany({ where: { userId: actorId }, select: { role: true } })).map((r) => r.role);
  const canOverride = await userHasPermission(actorRoles, 'general_ledger', 'override_closed_period');
  if (canOverride) return;

  throw new LedgerError(
    `Cannot post to ${transactionDate.toISOString().split('T')[0]} — fiscal period "${period.name}" is closed. An administrator can override or reopen it.`,
    409
  );
}

async function nextEntryNumber(tx: TxClient): Promise<string> {
  const count = await tx.journalEntry.count();
  return `JE-${String(count + 1).padStart(6, '0')}`;
}

/** Retry small helper for the rare case two requests race for the same generated entry number. */
async function withEntryNumberRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isEntryNumberClash = err?.code === 'P2002' && err?.meta?.target?.includes?.('entry_number');
      if (!isEntryNumberClash || attempt === 2) throw err;
    }
  }
  throw new LedgerError('Failed to generate a unique entry number, please retry');
}

// ─── Journal Entries ─────────────────────────────────────

export async function createJournalEntry(
  input: {
    transactionDate: string | Date;
    description: string;
    currency?: string;
    lines: JournalLineInput[];
    idempotencyKey?: string | null;
  },
  actorId: string
) {
  if (!input.description?.trim()) throw new LedgerError('Description is required');
  const transactionDate = new Date(input.transactionDate);
  if (isNaN(transactionDate.getTime())) throw new LedgerError('Invalid transaction date');

  if (input.idempotencyKey) {
    const existing = await prisma.journalEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { lines: { include: { account: true } } },
    });
    if (existing) return existing;
  }

  const entry = await withEntryNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const { normalized } = await validateAndNormalizeLines(input.lines, tx);
      const entryNumber = await nextEntryNumber(tx);

      return tx.journalEntry.create({
        data: {
          entryNumber,
          transactionDate,
          description: input.description.trim(),
          currency: input.currency?.trim() || 'BDT',
          status: JournalStatus.DRAFT,
          createdById: actorId,
          idempotencyKey: input.idempotencyKey || null,
          lines: { create: normalized },
        },
        include: { lines: { include: { account: true } }, createdBy: { select: { id: true, name: true } } },
      });
    })
  );

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: entry.id, after: entry });
  return entry;
}

/**
 * Create AND immediately post a journal entry — the entry point other modules
 * (AP/AR, and future Payroll/Budgeting/Compliance modules) should use to record
 * accounting activity, since their postings are always final at the moment they
 * happen (there's no "draft AP bill GL entry" concept).
 *
 * Pass `tx` to run inside a caller-owned transaction so the GL entry commits or
 * rolls back atomically together with the caller's own record (e.g. marking a
 * VendorBill APPROVED). Without `tx`, this opens its own transaction.
 */
export async function postAccountingEntry(
  input: {
    transactionDate: string | Date;
    description: string;
    currency?: string;
    lines: JournalLineInput[];
    idempotencyKey?: string | null;
  },
  actorId: string,
  tx?: TxClient
) {
  if (!input.description?.trim()) throw new LedgerError('Description is required');
  const transactionDate = new Date(input.transactionDate);
  if (isNaN(transactionDate.getTime())) throw new LedgerError('Invalid transaction date');

  const client = tx ?? prisma;

  if (input.idempotencyKey) {
    const existing = await client.journalEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { lines: { include: { account: true } } },
    });
    if (existing) return existing;
  }

  const run = async (c: TxClient) => {
    await assertPeriodOpenForPosting(c, transactionDate, actorId);
    const { normalized } = await validateAndNormalizeLines(input.lines, c);
    const entryNumber = await nextEntryNumber(c);
    const now = new Date();

    return c.journalEntry.create({
      data: {
        entryNumber,
        transactionDate,
        description: input.description.trim(),
        currency: input.currency?.trim() || 'BDT',
        status: JournalStatus.POSTED,
        createdById: actorId,
        postedById: actorId,
        postedAt: now,
        idempotencyKey: input.idempotencyKey || null,
        lines: { create: normalized },
      },
      include: { lines: { include: { account: true } }, createdBy: { select: { id: true, name: true } } },
    });
  };

  if (tx) {
    // Caller owns the transaction and hasn't committed yet — audit logging here
    // would record an entry that might still get rolled back. The caller is
    // responsible for auditing this GL entry once its own transaction commits.
    return run(tx);
  }

  const entry = await withEntryNumberRetry(() => prisma.$transaction((t) => run(t)));
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: entry.id, after: entry });
  return entry;
}

export async function updateJournalEntry(
  id: string,
  input: { transactionDate?: string | Date; description?: string; currency?: string; lines?: JournalLineInput[] },
  actorId: string
) {
  const before = await prisma.journalEntry.findUnique({ where: { id }, include: { lines: true } });
  if (!before) throw new LedgerError('Journal entry not found', 404);
  if (before.status !== JournalStatus.DRAFT) {
    throw new LedgerError('Only draft journal entries can be edited', 409);
  }

  const entry = await prisma.$transaction(async (tx) => {
    let normalized: Awaited<ReturnType<typeof validateAndNormalizeLines>>['normalized'] | undefined;
    if (input.lines) {
      const result = await validateAndNormalizeLines(input.lines, tx);
      normalized = result.normalized;
      await tx.journalLine.deleteMany({ where: { journalEntryId: id } });
    }

    return tx.journalEntry.update({
      where: { id },
      data: {
        ...(input.transactionDate ? { transactionDate: new Date(input.transactionDate) } : {}),
        ...(input.description ? { description: input.description.trim() } : {}),
        ...(input.currency ? { currency: input.currency.trim() } : {}),
        ...(normalized ? { lines: { create: normalized } } : {}),
      },
      include: { lines: { include: { account: true } } },
    });
  });

  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'JournalEntry', targetId: id, before, after: entry });
  return entry;
}

export async function deleteJournalEntry(id: string, actorId: string) {
  const before = await prisma.journalEntry.findUnique({ where: { id }, include: { lines: true } });
  if (!before) throw new LedgerError('Journal entry not found', 404);
  if (before.status !== JournalStatus.DRAFT) {
    throw new LedgerError('Only draft journal entries can be deleted', 409);
  }

  await prisma.journalEntry.delete({ where: { id } });
  await logAudit({ actorId, action: 'DELETE', targetEntity: 'JournalEntry', targetId: id, before });
}

export async function postJournalEntry(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.findUnique({ where: { id }, include: { lines: true } });
    if (!entry) throw new LedgerError('Journal entry not found', 404);
    if (entry.status !== JournalStatus.DRAFT) {
      throw new LedgerError('Only draft journal entries can be posted', 409);
    }

    await assertPeriodOpenForPosting(tx, entry.transactionDate, actorId);

    // Defense in depth: re-validate balance + active accounts at post time,
    // since an account referenced by the draft could have been deactivated since.
    await validateAndNormalizeLines(
      entry.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit, description: l.description })),
      tx
    );

    const after = await tx.journalEntry.update({
      where: { id },
      data: { status: JournalStatus.POSTED, postedById: actorId, postedAt: new Date() },
      include: { lines: { include: { account: true } } },
    });

    return { before: entry, after };
  });

  await logAudit({
    actorId,
    action: 'UPDATE',
    targetEntity: 'JournalEntry',
    targetId: id,
    before: { status: result.before.status },
    after: { status: result.after.status },
  });
  return result.after;
}

export async function lockJournalEntry(id: string, actorId: string) {
  const before = await prisma.journalEntry.findUnique({ where: { id } });
  if (!before) throw new LedgerError('Journal entry not found', 404);
  if (before.status !== JournalStatus.POSTED) {
    throw new LedgerError('Only posted journal entries can be locked', 409);
  }

  const after = await prisma.journalEntry.update({
    where: { id },
    data: { status: JournalStatus.LOCKED, lockedAt: new Date() },
  });

  await logAudit({
    actorId,
    action: 'UPDATE',
    targetEntity: 'JournalEntry',
    targetId: id,
    before: { status: before.status },
    after: { status: after.status },
  });
  return after;
}

async function reverseJournalEntryCore(
  tx: TxClient,
  id: string,
  actorId: string,
  opts: { transactionDate?: string; description?: string }
) {
  const original = await tx.journalEntry.findUnique({ where: { id }, include: { lines: true, reversedBy: true } });
  if (!original) throw new LedgerError('Journal entry not found', 404);
  if (original.status === JournalStatus.DRAFT) {
    throw new LedgerError('Draft journal entries cannot be reversed — edit or delete instead', 409);
  }
  if (original.reversedBy) {
    throw new LedgerError(`This journal entry has already been reversed by ${original.reversedBy.entryNumber}`, 409);
  }

  const swappedLines: JournalLineInput[] = original.lines.map((l) => ({
    accountId: l.accountId,
    description: l.description,
    debit: l.credit,
    credit: l.debit,
  }));

  const { normalized } = await validateAndNormalizeLines(swappedLines, tx);
  const entryNumber = await nextEntryNumber(tx);
  const now = new Date();

  const reversal = await tx.journalEntry.create({
    data: {
      entryNumber,
      transactionDate: opts.transactionDate ? new Date(opts.transactionDate) : now,
      description: opts.description?.trim() || `Reversal of ${original.entryNumber}: ${original.description}`,
      currency: original.currency,
      status: JournalStatus.POSTED,
      createdById: actorId,
      postedById: actorId,
      postedAt: now,
      reversalOfId: original.id,
      lines: { create: normalized },
    },
    include: { lines: { include: { account: true } } },
  });

  return { original, reversal };
}

/**
 * Composable variant of reverseJournalEntry() for callers (AP/AR payment
 * reversal, etc.) that need the GL reversal to commit atomically together
 * with their own record update. Caller is responsible for audit logging
 * once its own transaction commits.
 */
export async function reverseJournalEntryInTx(
  tx: TxClient,
  id: string,
  actorId: string,
  opts: { transactionDate?: string; description?: string } = {}
) {
  return reverseJournalEntryCore(tx, id, actorId, opts);
}

export async function reverseJournalEntry(
  id: string,
  actorId: string,
  opts: { transactionDate?: string; description?: string } = {}
) {
  const result = await withEntryNumberRetry(() => prisma.$transaction((tx) => reverseJournalEntryCore(tx, id, actorId, opts)));

  await logAudit({
    actorId,
    action: 'CREATE',
    targetEntity: 'JournalEntry',
    targetId: result.reversal.id,
    after: { reversalOf: result.original.entryNumber, entryNumber: result.reversal.entryNumber },
  });
  await logAudit({
    actorId,
    action: 'UPDATE',
    targetEntity: 'JournalEntry',
    targetId: result.original.id,
    before: { reversedBy: null },
    after: { reversedBy: result.reversal.entryNumber },
  });

  return result.reversal;
}

export async function listJournalEntries(filters: {
  status?: JournalStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  accountId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize || 25));

  const where: Prisma.JournalEntryWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          transactionDate: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { entryNumber: { contains: filters.search } },
            { description: { contains: filters.search } },
          ],
        }
      : {}),
    ...(filters.accountId ? { lines: { some: { accountId: filters.accountId } } } : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.journalEntry.count({ where }),
    prisma.journalEntry.findMany({
      where,
      orderBy: [{ transactionDate: 'desc' }, { entryNumber: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lines: true,
        createdBy: { select: { id: true, name: true } },
        postedBy: { select: { id: true, name: true } },
        reversalOf: { select: { id: true, entryNumber: true } },
        reversedBy: { select: { id: true, entryNumber: true } },
      },
    }),
  ]);

  return { entries, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

export async function getJournalEntryById(id: string) {
  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    include: {
      lines: { include: { account: { select: { id: true, code: true, name: true } } } },
      createdBy: { select: { id: true, name: true } },
      postedBy: { select: { id: true, name: true } },
      reversalOf: { select: { id: true, entryNumber: true, description: true } },
      reversedBy: { select: { id: true, entryNumber: true, description: true } },
    },
  });
  if (!entry) throw new LedgerError('Journal entry not found', 404);
  return entry;
}

// ─── Reports ──────────────────────────────────────────────

/** Normal-balance sign convention: Asset/Expense increase with Debit; Liability/Equity/Revenue increase with Credit. */
export function signedDelta(type: AccountType, debit: Prisma.Decimal, credit: Prisma.Decimal): Prisma.Decimal {
  const net = debit.minus(credit);
  return type === AccountType.ASSET || type === AccountType.EXPENSE ? net : net.negated();
}

export async function getAccountLedger(
  accountId: string,
  filters: { dateFrom?: string; dateTo?: string; reference?: string; page?: number; pageSize?: number }
) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new LedgerError('Account not found', 404);

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(500, Math.max(1, filters.pageSize || 50));

  const journalWhere: Prisma.JournalEntryWhereInput = {
    status: { in: [JournalStatus.POSTED, JournalStatus.LOCKED] },
    ...(filters.dateFrom || filters.dateTo
      ? {
          transactionDate: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.reference ? { entryNumber: { contains: filters.reference } } : {}),
  };

  // Opening balance = net of all posted/locked activity strictly before dateFrom.
  let openingBalance = new Prisma.Decimal(0);
  if (filters.dateFrom) {
    const priorLines = await prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: { status: { in: [JournalStatus.POSTED, JournalStatus.LOCKED] }, transactionDate: { lt: new Date(filters.dateFrom) } },
      },
      select: { debit: true, credit: true },
    });
    for (const l of priorLines) {
      openingBalance = openingBalance.plus(signedDelta(account.type, l.debit, l.credit));
    }
  }

  const allMatchingLines = await prisma.journalLine.findMany({
    where: { accountId, journalEntry: journalWhere },
    include: { journalEntry: { select: { id: true, entryNumber: true, transactionDate: true, description: true, status: true } } },
    orderBy: [{ journalEntry: { transactionDate: 'asc' } }, { createdAt: 'asc' }],
  });

  const total = allMatchingLines.length;
  const startIdx = (page - 1) * pageSize;

  let runningBalance = openingBalance;
  for (let i = 0; i < startIdx; i++) {
    const l = allMatchingLines[i];
    runningBalance = runningBalance.plus(signedDelta(account.type, l.debit, l.credit));
  }

  const rows = allMatchingLines.slice(startIdx, startIdx + pageSize).map((l) => {
    runningBalance = runningBalance.plus(signedDelta(account.type, l.debit, l.credit));
    return {
      date: l.journalEntry.transactionDate,
      reference: l.journalEntry.entryNumber,
      journalEntryId: l.journalEntry.id,
      description: l.description || l.journalEntry.description,
      debit: l.debit,
      credit: l.credit,
      balance: runningBalance,
      status: l.journalEntry.status,
    };
  });

  return {
    account: { id: account.id, code: account.code, name: account.name, type: account.type },
    openingBalance,
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getTrialBalance(filters: { dateFrom?: string; dateTo?: string; accountId?: string }) {
  const journalWhere: Prisma.JournalEntryWhereInput = {
    status: { in: [JournalStatus.POSTED, JournalStatus.LOCKED] },
    ...(filters.dateFrom || filters.dateTo
      ? {
          transactionDate: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
          },
        }
      : {}),
  };

  const lines = await prisma.journalLine.findMany({
    where: { journalEntry: journalWhere, ...(filters.accountId ? { accountId: filters.accountId } : {}) },
    include: { account: { select: { id: true, code: true, name: true, type: true } } },
  });

  const byAccount = new Map<string, { account: { id: string; code: string; name: string; type: AccountType }; debit: Prisma.Decimal; credit: Prisma.Decimal }>();
  for (const l of lines) {
    const bucket = byAccount.get(l.accountId) || { account: l.account, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) };
    bucket.debit = bucket.debit.plus(l.debit);
    bucket.credit = bucket.credit.plus(l.credit);
    byAccount.set(l.accountId, bucket);
  }

  const rows = Array.from(byAccount.values())
    .map(({ account, debit, credit }) => {
      // Trial balance nets each account's raw activity onto whichever side it actually
      // falls on — it doesn't matter which side is that account type's "normal" balance.
      const net = debit.minus(credit); // positive => net debit balance, negative => net credit balance
      const debitBalance = net.greaterThanOrEqualTo(0) ? net : new Prisma.Decimal(0);
      const creditBalance = net.lessThan(0) ? net.abs() : new Prisma.Decimal(0);
      return { account, debit: debitBalance, credit: creditBalance };
    })
    .sort((a, b) => a.account.code.localeCompare(b.account.code));

  const totalDebit = rows.reduce((sum, r) => sum.plus(r.debit), new Prisma.Decimal(0));
  const totalCredit = rows.reduce((sum, r) => sum.plus(r.credit), new Prisma.Decimal(0));

  return {
    rows,
    totalDebit,
    totalCredit,
    difference: totalDebit.minus(totalCredit),
    isBalanced: totalDebit.equals(totalCredit),
  };
}

// ─── Standard Financial Statements ───────────────────────

interface StatementLine {
  account: { id: string; code: string; name: string; type: AccountType };
  amount: Prisma.Decimal;
}

/** Every posted/locked account balance, signed per its normal balance, as of a point in time (from the beginning of time through asOfDate). */
async function accountBalancesAsOf(asOfDate: Date, types: AccountType[]): Promise<StatementLine[]> {
  const lines = await prisma.journalLine.findMany({
    where: { journalEntry: { status: { in: [JournalStatus.POSTED, JournalStatus.LOCKED] }, transactionDate: { lte: asOfDate } }, account: { type: { in: types } } },
    include: { account: { select: { id: true, code: true, name: true, type: true } } },
  });

  const byAccount = new Map<string, StatementLine>();
  for (const l of lines) {
    const bucket = byAccount.get(l.accountId) || { account: l.account, amount: new Prisma.Decimal(0) };
    bucket.amount = bucket.amount.plus(signedDelta(l.account.type, l.debit, l.credit));
    byAccount.set(l.accountId, bucket);
  }
  return Array.from(byAccount.values())
    .filter((b) => !b.amount.equals(0))
    .sort((a, b) => a.account.code.localeCompare(b.account.code));
}

/** Revenue/Expense activity strictly within [startDate, endDate] — these accounts reset each period, unlike Balance Sheet accounts. */
async function accountActivityInRange(startDate: Date, endDate: Date, types: AccountType[]): Promise<StatementLine[]> {
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { status: { in: [JournalStatus.POSTED, JournalStatus.LOCKED] }, transactionDate: { gte: startDate, lte: endDate } },
      account: { type: { in: types } },
    },
    include: { account: { select: { id: true, code: true, name: true, type: true } } },
  });

  const byAccount = new Map<string, StatementLine>();
  for (const l of lines) {
    const bucket = byAccount.get(l.accountId) || { account: l.account, amount: new Prisma.Decimal(0) };
    bucket.amount = bucket.amount.plus(signedDelta(l.account.type, l.debit, l.credit));
    byAccount.set(l.accountId, bucket);
  }
  return Array.from(byAccount.values())
    .filter((b) => !b.amount.equals(0))
    .sort((a, b) => a.account.code.localeCompare(b.account.code));
}

/**
 * Assets = Liabilities + Equity, as of a point in time. Net income earned
 * since inception (Revenue − Expense, not yet closed to an equity account
 * — this codebase has no period-close/closing-entry step) is folded into
 * Equity as "Retained Earnings (current)" so the statement still balances.
 */
export async function getBalanceSheet(asOfDateStr?: string) {
  const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

  const [assets, liabilities, equity, revenue, expense] = await Promise.all([
    accountBalancesAsOf(asOfDate, [AccountType.ASSET]),
    accountBalancesAsOf(asOfDate, [AccountType.LIABILITY]),
    accountBalancesAsOf(asOfDate, [AccountType.EQUITY]),
    accountBalancesAsOf(asOfDate, [AccountType.REVENUE]),
    accountBalancesAsOf(asOfDate, [AccountType.EXPENSE]),
  ]);

  const totalAssets = assets.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0));
  const totalLiabilities = liabilities.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0));
  const totalEquityAccounts = equity.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0));
  const retainedEarnings = revenue.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0)).minus(expense.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0)));
  const totalEquity = totalEquityAccounts.plus(retainedEarnings);

  return {
    asOfDate,
    assets,
    liabilities,
    equity: [...equity, { account: { id: 'retained-earnings', code: '3900', name: 'Retained Earnings (current)', type: AccountType.EQUITY }, amount: retainedEarnings }],
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced: totalAssets.equals(totalLiabilities.plus(totalEquity)),
  };
}

/** Net Income = Total Revenue − Total Expense over [startDate, endDate]. */
export async function getIncomeStatement(startDateStr: string, endDateStr: string) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new LedgerError('Invalid date range');

  const [revenue, expense] = await Promise.all([
    accountActivityInRange(startDate, endDate, [AccountType.REVENUE]),
    accountActivityInRange(startDate, endDate, [AccountType.EXPENSE]),
  ]);

  const totalRevenue = revenue.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0));
  const totalExpense = expense.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0));

  return { startDate, endDate, revenue, expense, totalRevenue, totalExpense, netIncome: totalRevenue.minus(totalExpense) };
}

/**
 * Direct-method cash flow: every journal line hitting an `isCashAccount`
 * account within [startDate, endDate], classified by the *other* side of
 * its journal entry — Revenue/Expense counterparts are Operating, other
 * Asset counterparts are Investing, Liability/Equity counterparts are
 * Financing. A multi-line entry can split across categories.
 */
export async function getCashFlowStatement(startDateStr: string, endDateStr: string) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new LedgerError('Invalid date range');

  const cashLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { status: { in: [JournalStatus.POSTED, JournalStatus.LOCKED] }, transactionDate: { gte: startDate, lte: endDate } },
      account: { isCashAccount: true },
    },
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
      journalEntry: { select: { id: true, entryNumber: true, transactionDate: true, description: true, lines: { include: { account: { select: { type: true } } } } } },
    },
  });

  let operating = new Prisma.Decimal(0);
  let investing = new Prisma.Decimal(0);
  let financing = new Prisma.Decimal(0);
  const movements: { date: Date; reference: string; description: string; account: string; amount: Prisma.Decimal; category: 'OPERATING' | 'INVESTING' | 'FINANCING' }[] = [];

  for (const line of cashLines) {
    const netCashMovement = line.debit.minus(line.credit); // cash is an ASSET — debit increases it
    if (netCashMovement.equals(0)) continue;

    // Classify by the account types present on this entry's *other* lines.
    const otherTypes = new Set(line.journalEntry.lines.filter((l) => l.id !== line.id).map((l) => l.account.type));

    let category: 'OPERATING' | 'INVESTING' | 'FINANCING' = 'OPERATING';
    if (otherTypes.has(AccountType.REVENUE) || otherTypes.has(AccountType.EXPENSE)) category = 'OPERATING';
    else if (otherTypes.has(AccountType.LIABILITY) || otherTypes.has(AccountType.EQUITY)) category = 'FINANCING';
    else if (otherTypes.has(AccountType.ASSET)) category = 'INVESTING';

    if (category === 'OPERATING') operating = operating.plus(netCashMovement);
    else if (category === 'INVESTING') investing = investing.plus(netCashMovement);
    else financing = financing.plus(netCashMovement);

    movements.push({
      date: line.journalEntry.transactionDate,
      reference: line.journalEntry.entryNumber,
      description: line.description || line.journalEntry.description,
      account: `${line.account.code} ${line.account.name}`,
      amount: netCashMovement,
      category,
    });
  }

  const netCashChange = operating.plus(investing).plus(financing);

  const openingLines = await prisma.journalLine.findMany({
    where: { journalEntry: { status: { in: [JournalStatus.POSTED, JournalStatus.LOCKED] }, transactionDate: { lt: startDate } }, account: { isCashAccount: true } },
  });
  const openingCash = openingLines.reduce((s, l) => s.plus(l.debit).minus(l.credit), new Prisma.Decimal(0));

  return {
    startDate,
    endDate,
    operating,
    investing,
    financing,
    netCashChange,
    openingCash,
    closingCash: openingCash.plus(netCashChange),
    movements: movements.sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
}
