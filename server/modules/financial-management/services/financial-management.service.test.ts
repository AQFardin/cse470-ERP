import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../src/lib/prisma';
import * as ledgerService from '../../general-ledger/services/ledger.service';
import * as apService from './ap.service';
import * as arService from './ar.service';
import { FinanceError } from '../shared/finance.util';

/**
 * Runs against the real dev SQLite database (same constraint as the General
 * Ledger test suite — see ledger.service.test.ts for why). All fixtures use a
 * "TST-" prefix and are deleted in afterAll; nothing from prisma/seed.ts is
 * touched. Requires `npm run db:seed` to have been run at least once (for the
 * AP/AR account mappings and a seed user to act as).
 */

let actorId: string;
let expenseAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let revenueAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let bankAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let inactiveBankAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let vendor: Awaited<ReturnType<typeof apService.createVendor>>;
let customer: { id: string; customerId: string; name: string; email: string };

const createdAccountIds: string[] = [];

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No seeded user found — run `npm run db:seed` before running tests');
  actorId = user.id;

  expenseAccount = await ledgerService.createAccount({ code: 'TST-FM-5100', name: 'Test Expense', type: 'EXPENSE' }, actorId);
  revenueAccount = await ledgerService.createAccount({ code: 'TST-FM-4100', name: 'Test Revenue', type: 'REVENUE' }, actorId);
  bankAccount = await ledgerService.createAccount({ code: 'TST-FM-1200', name: 'Test Bank', type: 'ASSET' }, actorId);
  inactiveBankAccount = await ledgerService.createAccount({ code: 'TST-FM-1201', name: 'Test Inactive Bank', type: 'ASSET' }, actorId);
  await ledgerService.updateAccount(inactiveBankAccount.id, { isActive: false }, actorId);
  createdAccountIds.push(expenseAccount.id, revenueAccount.id, bankAccount.id, inactiveBankAccount.id);

  vendor = await apService.createVendor({ name: 'TST Test Vendor' }, actorId);
  customer = await prisma.customer.create({ data: { customerId: 'TST-CUST-000001', name: 'TST Test Customer', email: 'tst-fm-test-customer@example.com' } });
});

afterAll(async () => {
  await prisma.vendorPayment.deleteMany({ where: { vendorBill: { vendorId: vendor.id } } });
  await prisma.vendorBillItem.deleteMany({ where: { vendorBill: { vendorId: vendor.id } } });
  await prisma.vendorBill.deleteMany({ where: { vendorId: vendor.id } });
  await prisma.vendor.delete({ where: { id: vendor.id } });

  await prisma.customerPayment.deleteMany({ where: { customerInvoice: { customerId: customer.id } } });
  await prisma.customerInvoiceItem.deleteMany({ where: { customerInvoice: { customerId: customer.id } } });
  await prisma.customerInvoice.deleteMany({ where: { customerId: customer.id } });
  await prisma.customer.delete({ where: { id: customer.id } });

  const entries = await prisma.journalEntry.findMany({ where: { lines: { some: { accountId: { in: createdAccountIds } } } } });
  const entryIds = entries.map((e) => e.id);
  await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
  await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
  await prisma.account.deleteMany({ where: { id: { in: createdAccountIds } } });

  await prisma.$disconnect();
});

// ─── Accounts Payable ───────────────────────────────────

describe('AP — Vendor Bills', () => {
  it('creates a vendor bill with computed totals', async () => {
    const bill = await apService.createVendorBill(
      {
        vendorId: vendor.id,
        billDate: '2026-08-01',
        dueDate: '2026-08-25',
        expenseAccountId: expenseAccount.id,
        items: [{ description: 'Widgets', quantity: 2, unitPrice: 100 }],
      },
      actorId
    );
    expect(bill.billNumber).toMatch(/^BILL-\d{6}$/);
    expect(Number(bill.totalAmount)).toBe(200);
    expect(bill.status).toBe('DRAFT');
  });

  it('rejects a bill for an unknown vendor', async () => {
    await expect(
      apService.createVendorBill({ vendorId: 'nonexistent', billDate: '2026-08-01', dueDate: '2026-08-25', expenseAccountId: expenseAccount.id, items: [{ description: 'x', unitPrice: 10 }] }, actorId)
    ).rejects.toThrow(/Vendor not found/);
  });

  it('rejects a bill with no line items', async () => {
    await expect(
      apService.createVendorBill({ vendorId: vendor.id, billDate: '2026-08-01', dueDate: '2026-08-25', expenseAccountId: expenseAccount.id, items: [] }, actorId)
    ).rejects.toThrow(/at least one line item/i);
  });

  it('rejects an item with a negative unit price', async () => {
    await expect(
      apService.createVendorBill({ vendorId: vendor.id, billDate: '2026-08-01', dueDate: '2026-08-25', expenseAccountId: expenseAccount.id, items: [{ description: 'x', unitPrice: -5 }] }, actorId)
    ).rejects.toThrow(/cannot be negative/);
  });

  it('approves a bill, posting a balanced GL entry', async () => {
    const bill = await apService.createVendorBill(
      { vendorId: vendor.id, billDate: '2026-08-01', dueDate: '2026-08-25', expenseAccountId: expenseAccount.id, items: [{ description: 'ABC Supplier bill', unitPrice: 50000 }] },
      actorId
    );
    const approved = await apService.approveVendorBill(bill.id, actorId);
    expect(approved.status).toBe('APPROVED');
    expect(approved.journalEntryId).toBeTruthy();

    const entry = await ledgerService.getJournalEntryById(approved.journalEntryId!);
    expect(entry.status).toBe('POSTED');
    const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(50000);
    expect(Number(entry.lines.find((l) => l.accountId === expenseAccount.id)?.debit)).toBe(50000);
  });
});

describe('AP — Vendor Payments', () => {
  async function makeApprovedBill(amount: number) {
    const bill = await apService.createVendorBill(
      { vendorId: vendor.id, billDate: '2026-08-01', dueDate: '2026-08-25', expenseAccountId: expenseAccount.id, items: [{ description: 'Payment test bill', unitPrice: amount }] },
      actorId
    );
    return apService.approveVendorBill(bill.id, actorId);
  }

  it('records a partial payment and updates status/outstanding', async () => {
    const bill = await makeApprovedBill(50000);
    const payment = await apService.createVendorPayment({ vendorBillId: bill.id, amount: 20000, paymentDate: '2026-08-10', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);
    expect(payment.paymentNumber).toMatch(/^APP-\d{6}$/);

    const updated = await apService.getVendorBillById(bill.id);
    expect(Number(updated.paidAmount)).toBe(20000);
    expect(updated.status).toBe('PARTIALLY_PAID');
  });

  it('records a full payment and marks the bill Paid', async () => {
    const bill = await makeApprovedBill(50000);
    await apService.createVendorPayment({ vendorBillId: bill.id, amount: 20000, paymentDate: '2026-08-10', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);
    await apService.createVendorPayment({ vendorBillId: bill.id, amount: 30000, paymentDate: '2026-08-20', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);

    const updated = await apService.getVendorBillById(bill.id);
    expect(Number(updated.paidAmount)).toBe(50000);
    expect(updated.status).toBe('PAID');
  });

  it('prevents overpayment beyond the outstanding balance', async () => {
    const bill = await makeApprovedBill(1000);
    await expect(
      apService.createVendorPayment({ vendorBillId: bill.id, amount: 1500, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)
    ).rejects.toThrow(/exceeds the outstanding balance/);
  });

  it('prevents payment against a cancelled bill', async () => {
    const bill = await makeApprovedBill(1000);
    await apService.cancelVendorBill(bill.id, actorId);
    await expect(
      apService.createVendorPayment({ vendorBillId: bill.id, amount: 100, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)
    ).rejects.toThrow(/cancelled/);
  });

  it('prevents payment against an already fully paid bill', async () => {
    const bill = await makeApprovedBill(1000);
    await apService.createVendorPayment({ vendorBillId: bill.id, amount: 1000, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId);
    await expect(
      apService.createVendorPayment({ vendorBillId: bill.id, amount: 100, paymentDate: '2026-08-11', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)
    ).rejects.toThrow(/already fully paid/);
  });

  it('rejects zero and negative payment amounts', async () => {
    const bill = await makeApprovedBill(1000);
    await expect(apService.createVendorPayment({ vendorBillId: bill.id, amount: 0, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)).rejects.toThrow(/greater than zero/);
    await expect(apService.createVendorPayment({ vendorBillId: bill.id, amount: -10, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)).rejects.toThrow(/greater than zero/);
  });

  it('rejects payment through an inactive account', async () => {
    const bill = await makeApprovedBill(1000);
    await expect(
      apService.createVendorPayment({ vendorBillId: bill.id, amount: 100, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: inactiveBankAccount.id }, actorId)
    ).rejects.toThrow(/inactive/);
  });

  it('does not allow two concurrent payments to together exceed the outstanding balance', async () => {
    const bill = await makeApprovedBill(10000);
    const results = await Promise.allSettled([
      apService.createVendorPayment({ vendorBillId: bill.id, amount: 10000, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId),
      apService.createVendorPayment({ vendorBillId: bill.id, amount: 10000, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const updated = await apService.getVendorBillById(bill.id);
    expect(Number(updated.paidAmount)).toBe(10000);
    expect(updated.status).toBe('PAID');
  });

  it('reverses a payment and restores the outstanding balance without touching the original bill', async () => {
    const bill = await makeApprovedBill(5000);
    const payment = await apService.createVendorPayment({ vendorBillId: bill.id, amount: 5000, paymentDate: '2026-08-10', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId);
    const paidBill = await apService.getVendorBillById(bill.id);
    expect(paidBill.status).toBe('PAID');

    const reversed = await apService.reverseVendorPayment(payment.id, actorId);
    expect(reversed.status).toBe('REVERSED');

    const afterReversal = await apService.getVendorBillById(bill.id);
    expect(Number(afterReversal.paidAmount)).toBe(0);
    expect(afterReversal.status).toBe('APPROVED');
  });
});

describe('AP — Reports', () => {
  it('computes vendor statement with a running balance', async () => {
    const bill = await apService.createVendorBill(
      { vendorId: vendor.id, billDate: '2026-08-01', dueDate: '2026-08-25', expenseAccountId: expenseAccount.id, items: [{ description: 'Statement test', unitPrice: 400 }] },
      actorId
    );
    await apService.approveVendorBill(bill.id, actorId);
    await apService.createVendorPayment({ vendorBillId: bill.id, amount: 150, paymentDate: '2026-08-05', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId);

    const statement = await apService.getVendorStatement(vendor.id, {});
    expect(Number(statement.closingBalance)).toBeGreaterThanOrEqual(250);
    const lastRow = statement.rows[statement.rows.length - 1];
    expect(Number(lastRow.balance)).toBe(Number(statement.closingBalance));
  });

  it('places an overdue bill in the correct AP aging bucket', async () => {
    const bill = await apService.createVendorBill(
      { vendorId: vendor.id, billDate: '2026-06-01', dueDate: '2026-06-15', expenseAccountId: expenseAccount.id, items: [{ description: 'Aging test', unitPrice: 1000 }] },
      actorId
    );
    await apService.approveVendorBill(bill.id, actorId);

    const aging = await apService.getApAging('2026-08-31');
    const row = aging.rows.find((r) => r.vendor.id === vendor.id);
    expect(row).toBeTruthy();
    expect(Number(row!.buckets.d61_90)).toBeGreaterThanOrEqual(1000);
  });
});

// ─── Accounts Receivable ────────────────────────────────

describe('AR — Customer Invoices', () => {
  it('creates a customer invoice with computed totals', async () => {
    const invoice = await arService.createCustomerInvoice(
      { customerId: customer.id, invoiceDate: '2026-08-01', dueDate: '2026-08-25', revenueAccountId: revenueAccount.id, items: [{ description: 'Consulting', quantity: 3, unitPrice: 100 }] },
      actorId
    );
    expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}$/);
    expect(Number(invoice.totalAmount)).toBe(300);
    expect(invoice.status).toBe('DRAFT');
  });

  it('rejects an invoice for an unknown customer', async () => {
    await expect(
      arService.createCustomerInvoice({ customerId: 'nonexistent', invoiceDate: '2026-08-01', dueDate: '2026-08-25', revenueAccountId: revenueAccount.id, items: [{ description: 'x', unitPrice: 10 }] }, actorId)
    ).rejects.toThrow(/Customer not found/);
  });

  it('rejects an invoice with no line items', async () => {
    await expect(
      arService.createCustomerInvoice({ customerId: customer.id, invoiceDate: '2026-08-01', dueDate: '2026-08-25', revenueAccountId: revenueAccount.id, items: [] }, actorId)
    ).rejects.toThrow(/at least one line item/i);
  });

  it('issues an invoice, posting a balanced GL entry', async () => {
    const invoice = await arService.createCustomerInvoice(
      { customerId: customer.id, invoiceDate: '2026-08-01', dueDate: '2026-08-25', revenueAccountId: revenueAccount.id, items: [{ description: 'XYZ Customer invoice', unitPrice: 30000 }] },
      actorId
    );
    const issued = await arService.issueCustomerInvoice(invoice.id, actorId);
    expect(issued.status).toBe('ISSUED');

    const entry = await ledgerService.getJournalEntryById(issued.journalEntryId!);
    const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(30000);
  });
});

describe('AR — Customer Payments', () => {
  async function makeIssuedInvoice(amount: number) {
    const invoice = await arService.createCustomerInvoice(
      { customerId: customer.id, invoiceDate: '2026-08-01', dueDate: '2026-08-25', revenueAccountId: revenueAccount.id, items: [{ description: 'AR payment test', unitPrice: amount }] },
      actorId
    );
    return arService.issueCustomerInvoice(invoice.id, actorId);
  }

  it('records a partial payment and updates status/outstanding', async () => {
    const invoice = await makeIssuedInvoice(30000);
    const payment = await arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 10000, paymentDate: '2026-08-12', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);
    expect(payment.paymentNumber).toMatch(/^ARP-\d{6}$/);

    const updated = await arService.getCustomerInvoiceById(invoice.id);
    expect(Number(updated.paidAmount)).toBe(10000);
    expect(updated.status).toBe('PARTIALLY_PAID');
  });

  it('records a full payment and marks the invoice Paid', async () => {
    const invoice = await makeIssuedInvoice(30000);
    await arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 10000, paymentDate: '2026-08-12', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);
    await arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 20000, paymentDate: '2026-08-22', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);

    const updated = await arService.getCustomerInvoiceById(invoice.id);
    expect(Number(updated.paidAmount)).toBe(30000);
    expect(updated.status).toBe('PAID');
  });

  it('prevents overpayment beyond the outstanding balance', async () => {
    const invoice = await makeIssuedInvoice(1000);
    await expect(
      arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 1500, paymentDate: '2026-08-12', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)
    ).rejects.toThrow(/exceeds the outstanding balance/);
  });

  it('prevents payment against a cancelled invoice', async () => {
    const invoice = await makeIssuedInvoice(1000);
    await arService.cancelCustomerInvoice(invoice.id, actorId);
    await expect(
      arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 100, paymentDate: '2026-08-12', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)
    ).rejects.toThrow(/cancelled/);
  });

  it('prevents payment against an already fully paid invoice', async () => {
    const invoice = await makeIssuedInvoice(1000);
    await arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 1000, paymentDate: '2026-08-12', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId);
    await expect(
      arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 100, paymentDate: '2026-08-13', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)
    ).rejects.toThrow(/already fully paid/);
  });

  it('reverses a payment and restores the outstanding balance without touching the original invoice', async () => {
    const invoice = await makeIssuedInvoice(5000);
    const payment = await arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 5000, paymentDate: '2026-08-12', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId);
    expect((await arService.getCustomerInvoiceById(invoice.id)).status).toBe('PAID');

    const reversed = await arService.reverseCustomerPayment(payment.id, actorId);
    expect(reversed.status).toBe('REVERSED');

    const afterReversal = await arService.getCustomerInvoiceById(invoice.id);
    expect(Number(afterReversal.paidAmount)).toBe(0);
    expect(afterReversal.status).toBe('ISSUED');
  });
});

describe('AR — Reports', () => {
  it('computes customer statement with a running balance', async () => {
    const invoice = await arService.createCustomerInvoice(
      { customerId: customer.id, invoiceDate: '2026-08-01', dueDate: '2026-08-25', revenueAccountId: revenueAccount.id, items: [{ description: 'Statement test', unitPrice: 400 }] },
      actorId
    );
    await arService.issueCustomerInvoice(invoice.id, actorId);
    await arService.createCustomerPayment({ customerInvoiceId: invoice.id, amount: 150, paymentDate: '2026-08-05', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId);

    const statement = await arService.getCustomerStatement(customer.id, {});
    const lastRow = statement.rows[statement.rows.length - 1];
    expect(Number(lastRow.balance)).toBe(Number(statement.closingBalance));
  });

  it('places an overdue invoice in the correct AR aging bucket', async () => {
    const invoice = await arService.createCustomerInvoice(
      { customerId: customer.id, invoiceDate: '2026-05-01', dueDate: '2026-05-10', revenueAccountId: revenueAccount.id, items: [{ description: 'Aging test', unitPrice: 2000 }] },
      actorId
    );
    await arService.issueCustomerInvoice(invoice.id, actorId);

    const aging = await arService.getArAging('2026-08-31');
    const row = aging.rows.find((r) => r.customer.id === customer.id);
    expect(row).toBeTruthy();
    expect(Number(row!.buckets.d90plus)).toBeGreaterThanOrEqual(2000);
  });
});

describe('Cross-cutting: LedgerError is exported as FinanceError', () => {
  it('is the same error class used by the General Ledger module', () => {
    expect(FinanceError).toBe(ledgerService.LedgerError);
  });
});
