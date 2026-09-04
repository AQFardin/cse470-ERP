import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../src/lib/prisma';
import * as ledger from './ledger.service';
import { LedgerError } from './ledger.service';

/**
 * These tests run against the real dev SQLite database (server/prisma/schema.prisma
 * hardcodes `file:./dev.db` rather than an env-configurable URL, so there is no
 * separate test database to point at). To keep this safe to run against a dev
 * database that also has seed data in it, every fixture created here uses a
 * "TST-" account code prefix and is deleted again in afterAll — nothing seeded
 * by prisma/seed.ts is read or modified.
 */

let actorId: string;
let cash: Awaited<ReturnType<typeof ledger.createAccount>>;
let bank: Awaited<ReturnType<typeof ledger.createAccount>>;
let revenue: Awaited<ReturnType<typeof ledger.createAccount>>;
let expenseAcct: Awaited<ReturnType<typeof ledger.createAccount>>;

const createdAccountIds: string[] = [];

async function makeAccount(code: string, name: string, type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE') {
  const acc = await ledger.createAccount({ code, name, type }, actorId);
  createdAccountIds.push(acc.id);
  return acc;
}

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No seeded user found — run `npm run db:seed` before running tests');
  actorId = user.id;

  cash = await makeAccount('TST-1100', 'Test Cash', 'ASSET');
  bank = await makeAccount('TST-1200', 'Test Bank', 'ASSET');
  revenue = await makeAccount('TST-4100', 'Test Revenue', 'REVENUE');
  expenseAcct = await makeAccount('TST-5100', 'Test Expense', 'EXPENSE');
});

afterAll(async () => {
  // Delete everything under the TST- prefix, in FK-safe order.
  const testAccounts = await prisma.account.findMany({ where: { code: { startsWith: 'TST-' } } });
  const accountIds = testAccounts.map((a) => a.id);
  const entries = await prisma.journalEntry.findMany({ where: { lines: { some: { accountId: { in: accountIds } } } } });
  const entryIds = entries.map((e) => e.id);
  await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
  await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
  await prisma.account.deleteMany({ where: { code: { startsWith: 'TST-' } } });
  await prisma.$disconnect();
});

describe('Chart of Accounts', () => {
  it('creates an account', async () => {
    expect(cash.code).toBe('TST-1100');
    expect(cash.isActive).toBe(true);
  });

  it('rejects a duplicate account code', async () => {
    await expect(ledger.createAccount({ code: 'TST-1100', name: 'Dup', type: 'ASSET' }, actorId)).rejects.toThrow(LedgerError);
  });

  it('updates an account', async () => {
    const updated = await ledger.updateAccount(cash.id, { description: 'Updated desc' }, actorId);
    expect(updated.description).toBe('Updated desc');
  });

  it('deactivates an account', async () => {
    const temp = await makeAccount('TST-9999', 'Temp Deactivate Me', 'ASSET');
    const updated = await ledger.updateAccount(temp.id, { isActive: false }, actorId);
    expect(updated.isActive).toBe(false);
  });

  it('rejects posting a transaction to an inactive account', async () => {
    const inactive = await makeAccount('TST-9998', 'Inactive Acct', 'ASSET');
    await ledger.updateAccount(inactive.id, { isActive: false }, actorId);

    await expect(
      ledger.createJournalEntry(
        {
          transactionDate: '2026-08-01',
          description: 'Should fail — inactive account',
          lines: [
            { accountId: cash.id, debit: 100 },
            { accountId: inactive.id, credit: 100 },
          ],
        },
        actorId
      )
    ).rejects.toThrow(/inactive account/);
  });
});

describe('Journal Entries — creation rules', () => {
  it('creates a valid two-line journal entry', async () => {
    const entry = await ledger.createJournalEntry(
      {
        transactionDate: '2026-08-01',
        description: 'Two-line entry',
        lines: [
          { accountId: cash.id, debit: 100 },
          { accountId: revenue.id, credit: 100 },
        ],
      },
      actorId
    );
    expect(entry.status).toBe('DRAFT');
    expect(entry.lines).toHaveLength(2);
    expect(entry.entryNumber).toMatch(/^JE-\d{6}$/);
  });

  it('creates a valid multi-line journal entry', async () => {
    const entry = await ledger.createJournalEntry(
      {
        transactionDate: '2026-08-01',
        description: 'Multi-line entry',
        lines: [
          { accountId: cash.id, debit: 60 },
          { accountId: bank.id, debit: 40 },
          { accountId: revenue.id, credit: 100 },
        ],
      },
      actorId
    );
    expect(entry.lines).toHaveLength(3);
  });

  it('rejects an unbalanced journal entry', async () => {
    await expect(
      ledger.createJournalEntry(
        {
          transactionDate: '2026-08-01',
          description: 'Unbalanced',
          lines: [
            { accountId: cash.id, debit: 100 },
            { accountId: revenue.id, credit: 90 },
          ],
        },
        actorId
      )
    ).rejects.toThrow(/not balanced/);
  });

  it('rejects a journal entry with only one line', async () => {
    await expect(
      ledger.createJournalEntry(
        { transactionDate: '2026-08-01', description: 'One line', lines: [{ accountId: cash.id, debit: 100 }] },
        actorId
      )
    ).rejects.toThrow(/at least two lines/);
  });

  it('rejects a journal entry with no debit line', async () => {
    await expect(
      ledger.createJournalEntry(
        {
          transactionDate: '2026-08-01',
          description: 'No debit',
          lines: [
            { accountId: cash.id, credit: 50 },
            { accountId: revenue.id, credit: 50 },
          ],
        },
        actorId
      )
    ).rejects.toThrow();
  });

  it('rejects a journal entry with no credit line', async () => {
    await expect(
      ledger.createJournalEntry(
        {
          transactionDate: '2026-08-01',
          description: 'No credit',
          lines: [
            { accountId: cash.id, debit: 50 },
            { accountId: revenue.id, debit: 50 },
          ],
        },
        actorId
      )
    ).rejects.toThrow(/one debit line and one credit line/);
  });

  it('rejects a negative amount', async () => {
    await expect(
      ledger.createJournalEntry(
        {
          transactionDate: '2026-08-01',
          description: 'Negative amount',
          lines: [
            { accountId: cash.id, debit: -100 },
            { accountId: revenue.id, credit: 100 },
          ],
        },
        actorId
      )
    ).rejects.toThrow(/cannot be negative/);
  });

  it('rejects a line containing both a debit and a credit', async () => {
    await expect(
      ledger.createJournalEntry(
        {
          transactionDate: '2026-08-01',
          description: 'Both debit and credit',
          lines: [
            { accountId: cash.id, debit: 100, credit: 100 },
            { accountId: revenue.id, credit: 100 },
          ],
        },
        actorId
      )
    ).rejects.toThrow(/cannot have both/);
  });
});

describe('Journal Entries — lifecycle', () => {
  it('allows a draft to be edited', async () => {
    const entry = await ledger.createJournalEntry(
      { transactionDate: '2026-08-02', description: 'Draft to edit', lines: [{ accountId: cash.id, debit: 20 }, { accountId: revenue.id, credit: 20 }] },
      actorId
    );
    const updated = await ledger.updateJournalEntry(entry.id, { description: 'Edited description' }, actorId);
    expect(updated.description).toBe('Edited description');
  });

  it('allows a draft to be deleted', async () => {
    const entry = await ledger.createJournalEntry(
      { transactionDate: '2026-08-02', description: 'Draft to delete', lines: [{ accountId: cash.id, debit: 20 }, { accountId: revenue.id, credit: 20 }] },
      actorId
    );
    await ledger.deleteJournalEntry(entry.id, actorId);
    await expect(ledger.getJournalEntryById(entry.id)).rejects.toThrow(/not found/);
  });

  it('does not allow a posted journal entry to be freely edited', async () => {
    const entry = await ledger.createJournalEntry(
      { transactionDate: '2026-08-02', description: 'Will be posted', lines: [{ accountId: cash.id, debit: 20 }, { accountId: revenue.id, credit: 20 }] },
      actorId
    );
    const posted = await ledger.postJournalEntry(entry.id, actorId);
    expect(posted.status).toBe('POSTED');
    await expect(ledger.updateJournalEntry(entry.id, { description: 'Hacked' }, actorId)).rejects.toThrow(/Only draft/);
    await expect(ledger.deleteJournalEntry(entry.id, actorId)).rejects.toThrow(/Only draft/);
  });

  it('does not allow a locked journal entry to be edited', async () => {
    const entry = await ledger.createJournalEntry(
      { transactionDate: '2026-08-02', description: 'Will be locked', lines: [{ accountId: cash.id, debit: 20 }, { accountId: revenue.id, credit: 20 }] },
      actorId
    );
    await ledger.postJournalEntry(entry.id, actorId);
    const locked = await ledger.lockJournalEntry(entry.id, actorId);
    expect(locked.status).toBe('LOCKED');
    await expect(ledger.updateJournalEntry(entry.id, { description: 'Hacked' }, actorId)).rejects.toThrow(/Only draft/);
    await expect(ledger.postJournalEntry(entry.id, actorId)).rejects.toThrow(/Only draft/);
  });

  it('includes a posted entry in the account ledger but excludes a draft', async () => {
    const draft = await ledger.createJournalEntry(
      { transactionDate: '2026-08-03', description: 'Ledger visibility — draft', lines: [{ accountId: expenseAcct.id, debit: 15 }, { accountId: bank.id, credit: 15 }] },
      actorId
    );
    const toPost = await ledger.createJournalEntry(
      { transactionDate: '2026-08-03', description: 'Ledger visibility — posted', lines: [{ accountId: expenseAcct.id, debit: 25 }, { accountId: bank.id, credit: 25 }] },
      actorId
    );
    await ledger.postJournalEntry(toPost.id, actorId);

    const bankLedger = await ledger.getAccountLedger(bank.id, {});
    const refs = bankLedger.rows.map((r) => r.reference);
    expect(refs).toContain(toPost.entryNumber);
    expect(refs).not.toContain(draft.entryNumber);
  });
});

describe('Trial Balance', () => {
  it('keeps total debit equal to total credit after several transactions', async () => {
    const e1 = await ledger.createJournalEntry(
      { transactionDate: '2026-08-04', description: 'TB check 1', lines: [{ accountId: cash.id, debit: 200 }, { accountId: revenue.id, credit: 200 }] },
      actorId
    );
    const e2 = await ledger.createJournalEntry(
      { transactionDate: '2026-08-04', description: 'TB check 2', lines: [{ accountId: expenseAcct.id, debit: 50 }, { accountId: cash.id, credit: 50 }] },
      actorId
    );
    await ledger.postJournalEntry(e1.id, actorId);
    await ledger.postJournalEntry(e2.id, actorId);

    const tb = await ledger.getTrialBalance({ accountId: undefined, dateFrom: '2026-08-04', dateTo: '2026-08-04' });
    const relevant = tb.rows.filter((r) => [cash.id, revenue.id, expenseAcct.id].includes(r.account.id));
    const totalDebit = relevant.reduce((s, r) => s + Number(r.debit), 0);
    const totalCredit = relevant.reduce((s, r) => s + Number(r.credit), 0);
    expect(totalDebit).toBe(totalCredit);
  });
});

describe('Reversal', () => {
  it('reverses a posted journal with swapped debit/credit, leaves the original unchanged, and prevents a second reversal', async () => {
    const original = await ledger.createJournalEntry(
      { transactionDate: '2026-08-05', description: 'To be reversed', lines: [{ accountId: cash.id, debit: 40 }, { accountId: revenue.id, credit: 40 }] },
      actorId
    );
    await ledger.postJournalEntry(original.id, actorId);

    const reversal = await ledger.reverseJournalEntry(original.id, actorId);
    expect(reversal.status).toBe('POSTED');
    expect(reversal.reversalOfId).toBe(original.id);

    const originalLine = (await ledger.getJournalEntryById(original.id)).lines.find((l) => l.accountId === cash.id)!;
    const reversalLine = reversal.lines.find((l) => l.accountId === cash.id)!;
    expect(Number(originalLine.debit)).toBe(40);
    expect(Number(originalLine.credit)).toBe(0);
    expect(Number(reversalLine.debit)).toBe(0);
    expect(Number(reversalLine.credit)).toBe(40);

    // Original journal itself was never modified.
    const originalAfter = await ledger.getJournalEntryById(original.id);
    expect(originalAfter.status).toBe('POSTED');
    expect(originalAfter.description).toBe('To be reversed');

    // Both the reversal creation and the original's "reversedBy" update are audited.
    const logs = await prisma.auditLog.findMany({
      where: { targetEntity: 'JournalEntry', targetId: { in: [original.id, reversal.id] } },
    });
    expect(logs.some((l) => l.targetId === reversal.id && l.action === 'CREATE')).toBe(true);
    expect(logs.some((l) => l.targetId === original.id && l.action === 'UPDATE')).toBe(true);

    // A second reversal of the same original entry is rejected.
    await expect(ledger.reverseJournalEntry(original.id, actorId)).rejects.toThrow(/already been reversed/);
  });

  it('rejects reversing a draft journal entry', async () => {
    const draft = await ledger.createJournalEntry(
      { transactionDate: '2026-08-05', description: 'Draft, cannot reverse', lines: [{ accountId: cash.id, debit: 10 }, { accountId: revenue.id, credit: 10 }] },
      actorId
    );
    await expect(ledger.reverseJournalEntry(draft.id, actorId)).rejects.toThrow(/Draft journal entries cannot be reversed/);
  });
});
