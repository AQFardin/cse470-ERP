import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Prisma, TaxType, TaxCategory, TaxSourceType, TaxDirection } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import * as ledgerService from '../../general-ledger/services/ledger.service';
import * as ap from '../../financial-management/services/ap.service';
import * as ar from '../../financial-management/services/ar.service';
import * as taxCodeService from './taxCode.service';
import { computeTax } from './taxCalculation.service';
import * as taxPeriodService from './taxPeriod.service';
import * as taxPaymentService from './taxPayment.service';
import { calculateExclusive, calculateInclusive } from '../shared/tax.util';
import { TaxError } from '../shared/tax.util';

/**
 * Runs against the real dev SQLite database — same constraint as every
 * other module's suite. Fixtures use a "TST-CMP-" account-code prefix and
 * unique tax-code codes per run, deleted in afterAll.
 */

let actorId: string;
let expenseAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let revenueAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let bankAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;
let vendor: Awaited<ReturnType<typeof ap.createVendor>>;
let customer: { id: string };

const createdAccountIds: string[] = [];
const createdTaxCodeIds: string[] = [];
const createdTaxPeriodIds: string[] = [];
const createdVendorBillIds: string[] = [];
const createdCustomerInvoiceIds: string[] = [];
const createdJournalEntryIds: string[] = [];
const runTag = Date.now().toString(36);

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No seeded user found — run `npm run db:seed` before running tests');
  actorId = user.id;

  expenseAccount = await ledgerService.createAccount({ code: `TST-CMP-5600-${runTag}`, name: 'Test Compliance Expense', type: 'EXPENSE' }, actorId);
  revenueAccount = await ledgerService.createAccount({ code: `TST-CMP-4600-${runTag}`, name: 'Test Compliance Revenue', type: 'REVENUE' }, actorId);
  bankAccount = await ledgerService.createAccount({ code: `TST-CMP-1600-${runTag}`, name: 'Test Compliance Bank', type: 'ASSET' }, actorId);
  createdAccountIds.push(expenseAccount.id, revenueAccount.id, bankAccount.id);

  vendor = await ap.createVendor({ name: `TST Compliance Vendor ${runTag}` }, actorId);

  const existingCustomer = await prisma.customer.findFirst();
  if (!existingCustomer) throw new Error('No seeded customer found — run `npm run db:seed` before running tests');
  customer = existingCustomer;
});

afterAll(async () => {
  await prisma.taxTransaction.deleteMany({ where: { OR: [{ sourceId: { in: createdVendorBillIds } }, { sourceId: { in: createdCustomerInvoiceIds } }] } });

  const payments = await prisma.taxPayment.findMany({ where: { taxPeriodId: { in: createdTaxPeriodIds } } });
  await prisma.taxPayment.deleteMany({ where: { id: { in: payments.map((p) => p.id) } } });
  await prisma.taxPeriod.deleteMany({ where: { id: { in: createdTaxPeriodIds } } });

  await prisma.vendorBillItem.deleteMany({ where: { vendorBillId: { in: createdVendorBillIds } } });
  await prisma.vendorBill.deleteMany({ where: { id: { in: createdVendorBillIds } } });
  await prisma.customerInvoiceItem.deleteMany({ where: { customerInvoiceId: { in: createdCustomerInvoiceIds } } });
  await prisma.customerInvoice.deleteMany({ where: { id: { in: createdCustomerInvoiceIds } } });

  await prisma.vendor.delete({ where: { id: vendor.id } }).catch(() => {});

  await prisma.taxRate.deleteMany({ where: { taxCodeId: { in: createdTaxCodeIds } } });
  await prisma.taxCode.deleteMany({ where: { id: { in: createdTaxCodeIds } } });

  const journalIds = [
    ...createdJournalEntryIds,
    ...(await prisma.vendorBill.findMany({ where: { id: { in: createdVendorBillIds } }, select: { journalEntryId: true } })).map((b) => b.journalEntryId),
    ...(await prisma.customerInvoice.findMany({ where: { id: { in: createdCustomerInvoiceIds } }, select: { journalEntryId: true } })).map((i) => i.journalEntryId),
  ].filter((x): x is string => !!x);

  const entries = await prisma.journalEntry.findMany({
    where: { OR: [{ id: { in: journalIds } }, { reversalOfId: { in: journalIds } }, { lines: { some: { accountId: { in: createdAccountIds } } } }] },
  });
  const entryIds = entries.map((e) => e.id);
  await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
  await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
  await prisma.account.deleteMany({ where: { id: { in: createdAccountIds } } });

  await prisma.$disconnect();
});

async function makeTaxCode(code: string, category: TaxCategory, ratePercent?: number) {
  const taxCode = await taxCodeService.createTaxCode({ name: `TST ${code}`, code: `${code}-${runTag}`, type: TaxType.VAT, category }, actorId);
  createdTaxCodeIds.push(taxCode.id);
  if (ratePercent !== undefined) {
    await taxCodeService.createTaxRate(taxCode.id, { ratePercent, effectiveFrom: '2020-01-01' }, actorId);
  }
  return taxCode;
}

async function balanceCheck(journalEntryId: string) {
  const lines = await prisma.journalLine.findMany({ where: { journalEntryId } });
  const totalDebit = lines.reduce((s, l) => s.plus(l.debit), new Prisma.Decimal(0));
  const totalCredit = lines.reduce((s, l) => s.plus(l.credit), new Prisma.Decimal(0));
  expect(totalDebit.toFixed(2)).toBe(totalCredit.toFixed(2));
  return { lines, totalDebit, totalCredit };
}

// ─── Error class identity ────────────────────────────────

describe('TaxError identity', () => {
  it('re-exports the shared LedgerError class', () => {
    expect(TaxError).toBe(ledgerService.LedgerError);
  });
});

// ─── Calculation math ─────────────────────────────────────

describe('Tax calculation math', () => {
  it('exclusive: 100000 base @ 15% => 15000 tax, 115000 total', () => {
    const result = calculateExclusive(new Prisma.Decimal(100000), new Prisma.Decimal(15));
    expect(result.taxableAmount.toFixed(2)).toBe('100000.00');
    expect(result.taxAmount.toFixed(2)).toBe('15000.00');
    expect(result.total.toFixed(2)).toBe('115000.00');
  });

  it('inclusive: 115000 total @ 15% => 100000 taxable, 15000 tax', () => {
    const result = calculateInclusive(new Prisma.Decimal(115000), new Prisma.Decimal(15));
    expect(result.taxableAmount.toFixed(2)).toBe('100000.00');
    expect(result.taxAmount.toFixed(2)).toBe('15000.00');
    expect(result.total.toFixed(2)).toBe('115000.00');
  });

  it('rounds to 2dp half-up', () => {
    const result = calculateExclusive(new Prisma.Decimal('33.335'), new Prisma.Decimal(10));
    // 33.335 rounds to 33.34 before tax is applied
    expect(result.taxableAmount.toFixed(2)).toBe('33.34');
    expect(result.taxAmount.toFixed(2)).toBe('3.33');
  });
});

// ─── Tax code / rate CRUD ──────────────────────────────────

describe('Tax code and rate management', () => {
  it('creates a tax code with a distinct STANDARD category', async () => {
    const taxCode = await makeTaxCode('STD', TaxCategory.STANDARD, 15);
    expect(taxCode.category).toBe('STANDARD');
  });

  it('treats ZERO_RATED and EXEMPT as distinct categories, not the same thing', async () => {
    const zeroRated = await makeTaxCode('ZR', TaxCategory.ZERO_RATED);
    const exempt = await makeTaxCode('EX', TaxCategory.EXEMPT);
    expect(zeroRated.category).not.toBe(exempt.category);

    const zrResult = await computeTax({ taxCodeId: zeroRated.id, amount: 1000, amountType: 'EXCLUSIVE', asOf: new Date() });
    const exResult = await computeTax({ taxCodeId: exempt.id, amount: 1000, amountType: 'EXCLUSIVE', asOf: new Date() });

    // Both yield 0 tax, but they are reported differently: ZERO_RATED keeps
    // its STANDARD-shaped category field distinct from EXEMPT/OUT_OF_SCOPE.
    expect(zrResult.taxAmount.toFixed(2)).toBe('0.00');
    expect(exResult.taxAmount.toFixed(2)).toBe('0.00');
    expect(zrResult.category).toBe('ZERO_RATED');
    expect(exResult.category).toBe('EXEMPT');
  });

  it('rejects a new rate that overlaps an existing effective range for the same code', async () => {
    const taxCode = await makeTaxCode('OVL', TaxCategory.STANDARD, 10);
    await expect(
      taxCodeService.createTaxRate(taxCode.id, { ratePercent: 12, effectiveFrom: '2021-01-01' }, actorId)
    ).rejects.toThrow(/overlap/i);
  });

  it('resolves the rate effective on a historical date, not necessarily the latest one', async () => {
    const taxCode = await taxCodeService.createTaxCode({ name: 'TST Effective-dated', code: `EFF-${runTag}`, type: TaxType.VAT, category: TaxCategory.STANDARD }, actorId);
    createdTaxCodeIds.push(taxCode.id);
    await taxCodeService.createTaxRate(taxCode.id, { ratePercent: 10, effectiveFrom: '2020-01-01', effectiveTo: '2021-12-31' }, actorId);
    await taxCodeService.createTaxRate(taxCode.id, { ratePercent: 15, effectiveFrom: '2022-01-01' }, actorId);

    const oldResult = await computeTax({ taxCodeId: taxCode.id, amount: 1000, amountType: 'EXCLUSIVE', asOf: new Date('2021-06-01') });
    const newResult = await computeTax({ taxCodeId: taxCode.id, amount: 1000, amountType: 'EXCLUSIVE', asOf: new Date('2023-01-01') });
    expect(oldResult.ratePercent.toFixed(2)).toBe('10.00');
    expect(newResult.ratePercent.toFixed(2)).toBe('15.00');
  });
});

// ─── AP / AR integration ────────────────────────────────────

describe('AP/AR tax integration', () => {
  it('computes backend-authoritative tax on a vendor bill and posts a balanced 3-line GL split', async () => {
    const taxCode = await makeTaxCode('AP15', TaxCategory.STANDARD, 15);

    const bill = await ap.createVendorBill(
      {
        vendorId: vendor.id,
        billDate: '2026-08-31',
        dueDate: '2026-09-30',
        expenseAccountId: expenseAccount.id,
        taxCodeId: taxCode.id,
        // a client-sent taxAmount is deliberately wrong here — the backend must ignore it
        taxAmount: 1,
        items: [{ description: 'Test purchase', quantity: 1, unitPrice: 50000 }],
      },
      actorId
    );
    createdVendorBillIds.push(bill.id);
    expect(bill.taxAmount.toFixed(2)).toBe('7500.00');
    expect(bill.totalAmount.toFixed(2)).toBe('57500.00');

    const approved = await ap.approveVendorBill(bill.id, actorId);
    expect(approved.journalEntryId).toBeTruthy();

    const { lines, totalDebit, totalCredit } = await balanceCheck(approved.journalEntryId!);
    expect(lines).toHaveLength(3);
    expect(totalDebit.toFixed(2)).toBe('57500.00');
    expect(totalCredit.toFixed(2)).toBe('57500.00');

    const taxTx = await prisma.taxTransaction.findFirst({ where: { sourceType: TaxSourceType.AP_BILL, sourceId: bill.id } });
    expect(taxTx).toBeTruthy();
    expect(taxTx!.direction).toBe(TaxDirection.INPUT);
    expect(taxTx!.taxAmount.toFixed(2)).toBe('7500.00');
  });

  it('computes backend-authoritative tax on a customer invoice and posts a balanced 3-line GL split', async () => {
    const taxCode = await makeTaxCode('AR15', TaxCategory.STANDARD, 15);

    const invoice = await ar.createCustomerInvoice(
      {
        customerId: customer.id,
        invoiceDate: '2026-08-31',
        dueDate: '2026-09-30',
        revenueAccountId: revenueAccount.id,
        taxCodeId: taxCode.id,
        items: [{ description: 'Test sale', quantity: 1, unitPrice: 100000 }],
      },
      actorId
    );
    createdCustomerInvoiceIds.push(invoice.id);
    expect(invoice.taxAmount.toFixed(2)).toBe('15000.00');
    expect(invoice.totalAmount.toFixed(2)).toBe('115000.00');

    const issued = await ar.issueCustomerInvoice(invoice.id, actorId);
    const { lines, totalDebit, totalCredit } = await balanceCheck(issued.journalEntryId!);
    expect(lines).toHaveLength(3);
    expect(totalDebit.toFixed(2)).toBe('115000.00');
    expect(totalCredit.toFixed(2)).toBe('115000.00');

    const taxTx = await prisma.taxTransaction.findFirst({ where: { sourceType: TaxSourceType.AR_INVOICE, sourceId: invoice.id } });
    expect(taxTx!.direction).toBe(TaxDirection.OUTPUT);
    expect(taxTx!.taxAmount.toFixed(2)).toBe('15000.00');
  });

  it('leaves a bill with no tax code behaving exactly as before (2-line GL posting)', async () => {
    const bill = await ap.createVendorBill(
      { vendorId: vendor.id, billDate: '2026-08-31', dueDate: '2026-09-30', expenseAccountId: expenseAccount.id, taxAmount: 500, items: [{ description: 'No-tax purchase', quantity: 1, unitPrice: 1000 }] },
      actorId
    );
    createdVendorBillIds.push(bill.id);
    expect(bill.taxAmount.toFixed(2)).toBe('500.00'); // client value respected — no tax code means no override

    const approved = await ap.approveVendorBill(bill.id, actorId);
    const { lines } = await balanceCheck(approved.journalEntryId!);
    expect(lines).toHaveLength(2);
  });

  it('does not recalculate a historical tax transaction when the tax code config changes later', async () => {
    const taxCode = await makeTaxCode('SNAP', TaxCategory.STANDARD, 20);
    const bill = await ap.createVendorBill(
      { vendorId: vendor.id, billDate: '2026-08-31', dueDate: '2026-09-30', expenseAccountId: expenseAccount.id, taxCodeId: taxCode.id, items: [{ description: 'Snapshot test', quantity: 1, unitPrice: 1000 }] },
      actorId
    );
    createdVendorBillIds.push(bill.id);
    await ap.approveVendorBill(bill.id, actorId);

    const before = await prisma.taxTransaction.findFirst({ where: { sourceType: TaxSourceType.AP_BILL, sourceId: bill.id } });
    expect(before!.taxAmount.toFixed(2)).toBe('200.00');

    // Change the tax code's category after the fact — the stored snapshot must not move.
    await taxCodeService.updateTaxCode(taxCode.id, { category: TaxCategory.EXEMPT }, actorId);

    const after = await prisma.taxTransaction.findFirst({ where: { id: before!.id } });
    expect(after!.taxAmount.toFixed(2)).toBe('200.00');
    expect(after!.category).toBe('STANDARD'); // snapshotted category, unaffected by the later update
  });

  it('reverses the linked tax transaction when a bill is cancelled', async () => {
    const taxCode = await makeTaxCode('CXL', TaxCategory.STANDARD, 10);
    const bill = await ap.createVendorBill(
      { vendorId: vendor.id, billDate: '2026-08-31', dueDate: '2026-09-30', expenseAccountId: expenseAccount.id, taxCodeId: taxCode.id, items: [{ description: 'To cancel', quantity: 1, unitPrice: 1000 }] },
      actorId
    );
    createdVendorBillIds.push(bill.id);
    await ap.approveVendorBill(bill.id, actorId);
    await ap.cancelVendorBill(bill.id, actorId);

    const taxTx = await prisma.taxTransaction.findFirst({ where: { sourceType: TaxSourceType.AP_BILL, sourceId: bill.id } });
    expect(taxTx!.status).toBe('REVERSED');
  });
});

// ─── Tax period lifecycle ───────────────────────────────────

describe('Tax period lifecycle', () => {
  it('calculates output/input tax and net payable from ACTIVE transactions in range', async () => {
    const taxCode = await makeTaxCode('PER', TaxCategory.STANDARD, 15);

    const invoice = await ar.createCustomerInvoice(
      { customerId: customer.id, invoiceDate: '2027-01-15', dueDate: '2027-02-15', revenueAccountId: revenueAccount.id, taxCodeId: taxCode.id, items: [{ description: 'Period sale', quantity: 1, unitPrice: 40000 }] },
      actorId
    );
    createdCustomerInvoiceIds.push(invoice.id);
    await ar.issueCustomerInvoice(invoice.id, actorId);

    const bill = await ap.createVendorBill(
      { vendorId: vendor.id, billDate: '2027-01-20', dueDate: '2027-02-20', expenseAccountId: expenseAccount.id, taxCodeId: taxCode.id, items: [{ description: 'Period purchase', quantity: 1, unitPrice: 20000 }] },
      actorId
    );
    createdVendorBillIds.push(bill.id);
    await ap.approveVendorBill(bill.id, actorId);

    const period = await taxPeriodService.createTaxPeriod({ name: `TST Period ${runTag}`, startDate: '2027-01-01', endDate: '2027-01-31', dueDate: '2027-02-15' }, actorId);
    createdTaxPeriodIds.push(period.id);

    const calculated = await taxPeriodService.calculateTaxPeriod(period.id, actorId);
    expect(calculated.outputTax!.toFixed(2)).toBe('6000.00'); // 40000 * 15%
    expect(calculated.inputTax!.toFixed(2)).toBe('3000.00'); // 20000 * 15%
    expect(calculated.netPayable!.toFixed(2)).toBe('3000.00');
  });

  it('walks OPEN -> REVIEW -> FINALIZED -> FILED -> CLOSED and locks calculation after FINALIZED', async () => {
    const period = await taxPeriodService.createTaxPeriod({ name: `TST Lifecycle ${runTag}`, startDate: '2027-02-01', endDate: '2027-02-28', dueDate: '2027-03-15' }, actorId);
    createdTaxPeriodIds.push(period.id);

    await taxPeriodService.calculateTaxPeriod(period.id, actorId);
    const reviewed = await taxPeriodService.reviewTaxPeriod(period.id, actorId);
    expect(reviewed.status).toBe('REVIEW');

    const finalized = await taxPeriodService.finalizeTaxPeriod(period.id, actorId);
    expect(finalized.status).toBe('FINALIZED');

    // Once finalized, recalculating is rejected — the snapshot is locked.
    await expect(taxPeriodService.calculateTaxPeriod(period.id, actorId)).rejects.toThrow();

    const filed = await taxPeriodService.fileTaxPeriod(period.id, actorId);
    expect(filed.status).toBe('FILED');

    const closed = await taxPeriodService.closeTaxPeriod(period.id, actorId);
    expect(closed.status).toBe('CLOSED');
  });

  it('rejects overlapping tax periods', async () => {
    const period = await taxPeriodService.createTaxPeriod({ name: `TST Overlap A ${runTag}`, startDate: '2027-03-01', endDate: '2027-03-31', dueDate: '2027-04-15' }, actorId);
    createdTaxPeriodIds.push(period.id);
    await expect(
      taxPeriodService.createTaxPeriod({ name: `TST Overlap B ${runTag}`, startDate: '2027-03-15', endDate: '2027-04-15', dueDate: '2027-05-01' }, actorId)
    ).rejects.toThrow(/overlap/i);
  });
});

// ─── Tax payment ────────────────────────────────────────────

describe('Tax payment', () => {
  it('posts VAT Payable debit / Bank credit for a finalized period and balances', async () => {
    const taxCode = await makeTaxCode('PAY', TaxCategory.STANDARD, 15);
    const invoice = await ar.createCustomerInvoice(
      { customerId: customer.id, invoiceDate: '2027-04-10', dueDate: '2027-05-10', revenueAccountId: revenueAccount.id, taxCodeId: taxCode.id, items: [{ description: 'Payment test sale', quantity: 1, unitPrice: 10000 }] },
      actorId
    );
    createdCustomerInvoiceIds.push(invoice.id);
    await ar.issueCustomerInvoice(invoice.id, actorId);

    const period = await taxPeriodService.createTaxPeriod({ name: `TST Payment ${runTag}`, startDate: '2027-04-01', endDate: '2027-04-30', dueDate: '2027-05-15' }, actorId);
    createdTaxPeriodIds.push(period.id);
    await taxPeriodService.calculateTaxPeriod(period.id, actorId);
    await taxPeriodService.reviewTaxPeriod(period.id, actorId);
    const finalized = await taxPeriodService.finalizeTaxPeriod(period.id, actorId);
    expect(finalized.netPayable!.toFixed(2)).toBe('1500.00');

    const payment = await taxPaymentService.createTaxPayment(
      { taxPeriodId: period.id, amount: 1500, paymentDate: '2027-05-01', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id },
      actorId
    );
    expect(payment.journalEntryId).toBeTruthy();

    const { lines, totalDebit, totalCredit } = await balanceCheck(payment.journalEntryId!);
    expect(lines).toHaveLength(2);
    expect(totalDebit.toFixed(2)).toBe('1500.00');
    expect(totalCredit.toFixed(2)).toBe('1500.00');
  });

  it('rejects a payment that exceeds the net payable amount', async () => {
    const period = await taxPeriodService.createTaxPeriod({ name: `TST Overpay ${runTag}`, startDate: '2027-05-01', endDate: '2027-05-31', dueDate: '2027-06-15' }, actorId);
    createdTaxPeriodIds.push(period.id);
    await taxPeriodService.calculateTaxPeriod(period.id, actorId);
    await taxPeriodService.reviewTaxPeriod(period.id, actorId);
    await taxPeriodService.finalizeTaxPeriod(period.id, actorId);

    await expect(
      taxPaymentService.createTaxPayment({ taxPeriodId: period.id, amount: 100, paymentDate: '2027-06-01', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId)
    ).rejects.toThrow(/no liability/i);
  });
});
