import { Prisma, ApBillStatus, PaymentMethod, PaymentRecordStatus, AccountMappingKey, AccountType, TaxSourceType, TaxDirection } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import * as ledgerService from '../../general-ledger/services/ledger.service';
import {
  FinanceError,
  emptyAgingBuckets,
  addToAgingBucket,
  isOverdue,
  startOfDay,
  endOfDay,
  nextDocumentNumber,
  normalizeLineItems,
  computeTotal,
  toDecimal,
  resolveControlAccount,
  assertAccountUsable,
  LineItemInput,
} from '../shared/finance.util';
import { computeTax } from '../../compliance/services/taxCalculation.service';
import { createTaxTransaction, reverseTaxTransactionForSource } from '../../compliance/services/taxTransaction.service';
import { resolveTaxCodeForRegion } from '../../compliance/services/taxCode.service';

type TxClient = Prisma.TransactionClient;

// ─── Vendors ──────────────────────────────────────────────

export async function listVendors(filters: { isActive?: boolean; search?: string } = {}) {
  return prisma.vendor.findMany({
    where: {
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? { OR: [{ vendorId: { contains: filters.search } }, { name: { contains: filters.search } }] }
        : {}),
    },
    orderBy: { name: 'asc' },
  });
}

export async function getVendorById(id: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw new FinanceError('Vendor not found', 404);
  return vendor;
}

export async function createVendor(
  data: { name: string; email?: string | null; phone?: string | null; address?: string | null },
  actorId: string
) {
  if (!data.name?.trim()) throw new FinanceError('Vendor name is required');
  const vendorId = await nextDocumentNumber('VEND', () => prisma.vendor.count());
  const vendor = await prisma.vendor.create({
    data: { vendorId, name: data.name.trim(), email: data.email || null, phone: data.phone || null, address: data.address || null },
  });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'Vendor', targetId: vendor.id, after: vendor });
  return vendor;
}

export async function updateVendor(
  id: string,
  data: { name?: string; email?: string | null; phone?: string | null; address?: string | null; isActive?: boolean },
  actorId: string
) {
  const before = await getVendorById(id);
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'Vendor', targetId: id, before, after: vendor });
  return vendor;
}

// ─── Account mapping helpers ──────────────────────────────

const resolvePayableAccount = (tx: TxClient) => resolveControlAccount(tx, AccountMappingKey.ACCOUNTS_PAYABLE, 'Accounts Payable');
const assertExpenseAccountUsable = (tx: TxClient, accountId: string) => assertAccountUsable(tx, accountId, { label: 'Expense/inventory account' });
const assertBankAccountUsable = (tx: TxClient, accountId: string) => assertAccountUsable(tx, accountId, { requireType: AccountType.ASSET, label: 'Payment account' });

// ─── Vendor Bills ─────────────────────────────────────────

export interface VendorBillInput {
  vendorId: string;
  billDate: string | Date;
  dueDate: string | Date;
  referenceNumber?: string;
  currency?: string;
  taxAmount?: number | string;
  discountAmount?: number | string;
  expenseAccountId: string;
  notes?: string;
  items: LineItemInput[];
  /** Optional — when set, the Compliance & Tax Engine computes taxAmount from this code's effective rate (backend-authoritative, overrides any client-sent taxAmount) and GL posting splits out Input VAT Recoverable. */
  taxCodeId?: string | null;
}

const resolveInputVatAccount = (tx: TxClient) => resolveControlAccount(tx, AccountMappingKey.INPUT_VAT_RECOVERABLE, 'Input VAT Recoverable');

export async function listVendorBills(filters: {
  status?: ApBillStatus;
  vendorId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize || 25));

  const where: Prisma.VendorBillWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { billDate: { ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}), ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}) } }
      : {}),
    ...(filters.search
      ? { OR: [{ billNumber: { contains: filters.search } }, { referenceNumber: { contains: filters.search } }] }
      : {}),
  };

  const [total, bills] = await Promise.all([
    prisma.vendorBill.count({ where }),
    prisma.vendorBill.findMany({
      where,
      orderBy: [{ billDate: 'desc' }, { billNumber: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { vendor: true, items: true },
    }),
  ]);

  const now = new Date();
  const withOverdue = bills.map((b) => ({ ...b, isOverdue: isOverdue(b.dueDate, b.totalAmount.minus(b.paidAmount), now) }));

  return { bills: withOverdue, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

export async function getVendorBillById(id: string) {
  const bill = await prisma.vendorBill.findUnique({
    where: { id },
    include: {
      vendor: true,
      items: { include: { product: { select: { id: true, name: true } } } },
      expenseAccount: { select: { id: true, code: true, name: true } },
      payableAccount: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      journalEntry: { select: { id: true, entryNumber: true, status: true } },
      payments: { include: { bankAccount: { select: { id: true, code: true, name: true } }, createdBy: { select: { id: true, name: true } } }, orderBy: { paymentDate: 'asc' } },
    },
  });
  if (!bill) throw new FinanceError('Vendor bill not found', 404);
  return { ...bill, isOverdue: isOverdue(bill.dueDate, bill.totalAmount.minus(bill.paidAmount)) };
}

export async function createVendorBill(input: VendorBillInput, actorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
  if (!vendor) throw new FinanceError('Vendor not found', 404);
  if (!vendor.isActive) throw new FinanceError('Cannot bill an inactive vendor', 409);

  const billDate = new Date(input.billDate);
  const dueDate = new Date(input.dueDate);
  if (isNaN(billDate.getTime()) || isNaN(dueDate.getTime())) throw new FinanceError('Invalid bill date or due date');
  if (dueDate < billDate) throw new FinanceError('Due date cannot be before the bill date');

  const { items, subtotal } = normalizeLineItems(input.items);
  const discountAmount = toDecimal(input.discountAmount);

  // Jurisdiction-aware auto-selection: an explicit taxCodeId always wins; if
  // none was given, try to resolve one automatically from the vendor's region.
  const taxCodeId = input.taxCodeId || (await resolveTaxCodeForRegion(vendor.region));

  // When a tax code is selected (explicitly or by region), the backend
  // recomputes taxAmount from the code's effective rate as of the bill date
  // — never trusts a client-sent value. With neither, behavior is unchanged
  // from before this feature.
  let taxAmount = toDecimal(input.taxAmount);
  if (taxCodeId) {
    const computed = await computeTax({ taxCodeId, amount: subtotal, amountType: 'EXCLUSIVE', asOf: billDate });
    taxAmount = computed.taxAmount;
  }
  const totalAmount = computeTotal(subtotal, taxAmount, discountAmount);

  const bill = await prisma.$transaction(async (tx) => {
    await assertExpenseAccountUsable(tx, input.expenseAccountId);
    const payableAccount = await resolvePayableAccount(tx);
    const billNumber = await nextDocumentNumber('BILL', () => tx.vendorBill.count());

    return tx.vendorBill.create({
      data: {
        billNumber,
        vendorId: input.vendorId,
        billDate,
        dueDate,
        referenceNumber: input.referenceNumber || null,
        currency: input.currency?.trim() || 'BDT',
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        status: ApBillStatus.DRAFT,
        expenseAccountId: input.expenseAccountId,
        payableAccountId: payableAccount.id,
        taxCodeId: taxCodeId || null,
        notes: input.notes || null,
        createdById: actorId,
        items: { create: items },
      },
      include: { vendor: true, items: true },
    });
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'VendorBill', targetId: bill.id, after: bill });
  return bill;
}

export async function updateVendorBill(id: string, input: Partial<VendorBillInput>, actorId: string) {
  const before = await prisma.vendorBill.findUnique({ where: { id }, include: { items: true } });
  if (!before) throw new FinanceError('Vendor bill not found', 404);
  if (before.status !== ApBillStatus.DRAFT) throw new FinanceError('Only draft vendor bills can be edited', 409);

  let subtotal = before.subtotal;
  let itemsUpdate: Prisma.VendorBillItemUncheckedCreateWithoutVendorBillInput[] | undefined;
  if (input.items) {
    const normalized = normalizeLineItems(input.items);
    subtotal = normalized.subtotal;
    itemsUpdate = normalized.items;
  }

  const billDate = input.billDate ? new Date(input.billDate) : before.billDate;
  const taxCodeId = input.taxCodeId !== undefined ? input.taxCodeId : before.taxCodeId;

  let taxAmount = input.taxAmount !== undefined ? toDecimal(input.taxAmount) : before.taxAmount;
  if (taxCodeId) {
    const computed = await computeTax({ taxCodeId, amount: subtotal, amountType: 'EXCLUSIVE', asOf: billDate });
    taxAmount = computed.taxAmount;
  }

  const bill = await prisma.$transaction(async (tx) => {
    if (itemsUpdate) {
      await tx.vendorBillItem.deleteMany({ where: { vendorBillId: id } });
    }

    if (input.expenseAccountId) await assertExpenseAccountUsable(tx, input.expenseAccountId);

    const discountAmount = input.discountAmount !== undefined ? toDecimal(input.discountAmount) : before.discountAmount;
    const totalAmount = computeTotal(subtotal, taxAmount, discountAmount);

    return tx.vendorBill.update({
      where: { id },
      data: {
        ...(input.billDate ? { billDate: new Date(input.billDate) } : {}),
        ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
        ...(input.referenceNumber !== undefined ? { referenceNumber: input.referenceNumber } : {}),
        ...(input.expenseAccountId ? { expenseAccountId: input.expenseAccountId } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.taxCodeId !== undefined ? { taxCodeId: input.taxCodeId || null } : {}),
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        ...(itemsUpdate ? { items: { create: itemsUpdate } } : {}),
      },
      include: { vendor: true, items: true },
    });
  });

  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'VendorBill', targetId: id, before, after: bill });
  return bill;
}

export async function deleteVendorBill(id: string, actorId: string) {
  const before = await prisma.vendorBill.findUnique({ where: { id } });
  if (!before) throw new FinanceError('Vendor bill not found', 404);
  if (before.status !== ApBillStatus.DRAFT) throw new FinanceError('Only draft vendor bills can be deleted', 409);

  await prisma.vendorBill.delete({ where: { id } });
  await logAudit({ actorId, action: 'DELETE', targetEntity: 'VendorBill', targetId: id, before });
}

export async function approveVendorBill(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const bill = await tx.vendorBill.findUnique({ where: { id }, include: { vendor: true } });
    if (!bill) throw new FinanceError('Vendor bill not found', 404);
    if (bill.status !== ApBillStatus.DRAFT) throw new FinanceError('Only draft vendor bills can be approved', 409);

    const now = new Date();

    // With a tax code: split into Expense debit (net) / Input VAT Recoverable
    // debit (tax) / Payable credit (total) — still balances (net + tax = total).
    // Without one: unchanged 2-line posting, exactly as before this feature.
    const lines: Parameters<typeof ledgerService.postAccountingEntry>[0]['lines'] = bill.taxCodeId && bill.taxAmount.greaterThan(0)
      ? [
          { accountId: bill.expenseAccountId, debit: bill.subtotal, description: `Bill ${bill.billNumber}` },
          { accountId: (await resolveInputVatAccount(tx)).id, debit: bill.taxAmount, description: `Input VAT — bill ${bill.billNumber}` },
          { accountId: bill.payableAccountId, credit: bill.totalAmount, description: `Bill ${bill.billNumber} — ${bill.vendor.name}` },
        ]
      : [
          { accountId: bill.expenseAccountId, debit: bill.totalAmount, description: `Bill ${bill.billNumber}` },
          { accountId: bill.payableAccountId, credit: bill.totalAmount, description: `Bill ${bill.billNumber} — ${bill.vendor.name}` },
        ];

    const journalEntry = await ledgerService.postAccountingEntry(
      {
        transactionDate: bill.billDate,
        description: `Vendor bill ${bill.billNumber} — ${bill.vendor.name}`,
        currency: bill.currency,
        lines,
      },
      actorId,
      tx
    );

    let taxTransactionId: string | null = null;
    if (bill.taxCodeId) {
      const computed = await computeTax({ taxCodeId: bill.taxCodeId, amount: bill.subtotal, amountType: 'EXCLUSIVE', asOf: bill.billDate });
      const taxTx = await createTaxTransaction(tx, {
        sourceType: TaxSourceType.AP_BILL,
        sourceId: bill.id,
        transactionDate: bill.billDate,
        direction: TaxDirection.INPUT,
        taxCodeId: bill.taxCodeId,
        taxRateId: computed.taxRateId,
        category: computed.category,
        ratePercent: computed.ratePercent,
        taxableAmount: bill.subtotal,
        taxAmount: bill.taxAmount,
      });
      taxTransactionId = taxTx.id;
    }

    const updated = await tx.vendorBill.update({
      where: { id },
      data: { status: ApBillStatus.APPROVED, approvedById: actorId, approvedAt: now, journalEntryId: journalEntry.id },
      include: { vendor: true, items: true },
    });

    return { before: bill, after: updated, journalEntry, taxTransactionId };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.journalEntry.id, after: { forVendorBill: result.after.billNumber, entryNumber: result.journalEntry.entryNumber } });
  if (result.taxTransactionId) {
    await logAudit({ actorId, action: 'CREATE', targetEntity: 'TaxTransaction', targetId: result.taxTransactionId, after: { forVendorBill: result.after.billNumber } });
  }
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'VendorBill', targetId: id, before: { status: result.before.status }, after: { status: result.after.status } });
  return result.after;
}

export async function cancelVendorBill(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const bill = await tx.vendorBill.findUnique({ where: { id } });
    if (!bill) throw new FinanceError('Vendor bill not found', 404);
    if (bill.status === ApBillStatus.CANCELLED) throw new FinanceError('Vendor bill is already cancelled', 409);
    if (bill.status === ApBillStatus.PAID) throw new FinanceError('A fully paid vendor bill cannot be cancelled', 409);
    if (bill.paidAmount.greaterThan(0)) throw new FinanceError('Cannot cancel a vendor bill that has payments — reverse the payments first', 409);

    let reversalId: string | null = null;
    if (bill.status === ApBillStatus.APPROVED && bill.journalEntryId) {
      const { reversal } = await ledgerService.reverseJournalEntryInTx(tx, bill.journalEntryId, actorId, {
        description: `Reversal — cancelled vendor bill ${bill.billNumber}`,
      });
      reversalId = reversal.id;
    }

    if (bill.taxCodeId) {
      await reverseTaxTransactionForSource(tx, TaxSourceType.AP_BILL, bill.id);
    }

    const updated = await tx.vendorBill.update({ where: { id }, data: { status: ApBillStatus.CANCELLED }, include: { vendor: true } });
    return { before: bill, after: updated, reversalId };
  });

  if (result.reversalId) {
    await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.reversalId, after: { reversalOfVendorBill: result.after.billNumber } });
  }
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'VendorBill', targetId: id, before: { status: result.before.status }, after: { status: 'CANCELLED' } });
  return result.after;
}

// ─── Vendor Payments ──────────────────────────────────────

export interface VendorPaymentInput {
  vendorBillId: string;
  amount: number | string;
  paymentDate: string | Date;
  paymentMethod: PaymentMethod;
  bankAccountId: string;
  referenceNumber?: string;
  notes?: string;
}

export async function listVendorPayments(filters: { vendorBillId?: string; status?: PaymentRecordStatus; page?: number; pageSize?: number }) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize || 25));
  const where: Prisma.VendorPaymentWhereInput = {
    ...(filters.vendorBillId ? { vendorBillId: filters.vendorBillId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const [total, payments] = await Promise.all([
    prisma.vendorPayment.count({ where }),
    prisma.vendorPayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { vendorBill: { include: { vendor: true } }, bankAccount: { select: { id: true, code: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    }),
  ]);
  return { payments, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

export async function getVendorPaymentById(id: string) {
  const payment = await prisma.vendorPayment.findUnique({
    where: { id },
    include: {
      vendorBill: { include: { vendor: true } },
      bankAccount: { select: { id: true, code: true, name: true } },
      journalEntry: { select: { id: true, entryNumber: true, status: true } },
      createdBy: { select: { id: true, name: true } },
      reversedBy: { select: { id: true, name: true } },
    },
  });
  if (!payment) throw new FinanceError('Vendor payment not found', 404);
  return payment;
}

export async function createVendorPayment(input: VendorPaymentInput, actorId: string) {
  const amount = toDecimal(input.amount);
  if (amount.lessThanOrEqualTo(0)) throw new FinanceError('Payment amount must be greater than zero');

  const paymentDate = new Date(input.paymentDate);
  if (isNaN(paymentDate.getTime())) throw new FinanceError('Invalid payment date');

  const result = await prisma.$transaction(async (tx) => {
    // Re-read the bill fresh, inside the transaction, so two concurrent payment
    // requests against the same bill serialize correctly (SQLite's single-writer
    // model blocks the second transaction until the first commits, and it then
    // sees the updated paidAmount here) instead of both validating against a
    // stale outstanding balance.
    const bill = await tx.vendorBill.findUnique({ where: { id: input.vendorBillId }, include: { vendor: true } });
    if (!bill) throw new FinanceError('Vendor bill not found', 404);
    if (bill.status === ApBillStatus.DRAFT) throw new FinanceError('Cannot pay a draft vendor bill — approve it first', 409);
    if (bill.status === ApBillStatus.CANCELLED) throw new FinanceError('Cannot pay a cancelled vendor bill', 409);
    if (bill.status === ApBillStatus.PAID) throw new FinanceError('This vendor bill is already fully paid', 409);

    const outstanding = bill.totalAmount.minus(bill.paidAmount);
    if (amount.greaterThan(outstanding)) {
      throw new FinanceError(`Payment of ${amount.toFixed(2)} exceeds the outstanding balance of ${outstanding.toFixed(2)}`);
    }

    await assertBankAccountUsable(tx, input.bankAccountId);

    const paymentNumber = await nextDocumentNumber('APP', () => tx.vendorPayment.count());

    const journalEntry = await ledgerService.postAccountingEntry(
      {
        transactionDate: paymentDate,
        description: `Payment ${paymentNumber} for bill ${bill.billNumber} — ${bill.vendor.name}`,
        currency: bill.currency,
        lines: [
          { accountId: bill.payableAccountId, debit: amount, description: `Payment for ${bill.billNumber}` },
          { accountId: input.bankAccountId, credit: amount, description: `Payment for ${bill.billNumber}` },
        ],
      },
      actorId,
      tx
    );

    const newPaidAmount = bill.paidAmount.plus(amount);
    const newStatus = newPaidAmount.greaterThanOrEqualTo(bill.totalAmount) ? ApBillStatus.PAID : ApBillStatus.PARTIALLY_PAID;

    await tx.vendorBill.update({ where: { id: bill.id }, data: { paidAmount: newPaidAmount, status: newStatus } });

    const payment = await tx.vendorPayment.create({
      data: {
        paymentNumber,
        vendorBillId: bill.id,
        amount,
        paymentDate,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || null,
        notes: input.notes || null,
        bankAccountId: input.bankAccountId,
        journalEntryId: journalEntry.id,
        createdById: actorId,
      },
      include: { vendorBill: { include: { vendor: true } }, bankAccount: { select: { id: true, code: true, name: true } } },
    });

    return { payment, journalEntry, newStatus };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.journalEntry.id, after: { forVendorPayment: result.payment.paymentNumber, entryNumber: result.journalEntry.entryNumber } });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'VendorPayment', targetId: result.payment.id, after: result.payment });
  return result.payment;
}

export async function reverseVendorPayment(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.vendorPayment.findUnique({ where: { id }, include: { vendorBill: true } });
    if (!payment) throw new FinanceError('Vendor payment not found', 404);
    if (payment.status === PaymentRecordStatus.REVERSED) throw new FinanceError('This payment has already been reversed', 409);
    if (!payment.journalEntryId) throw new FinanceError('This payment has no linked journal entry to reverse', 409);

    const { reversal } = await ledgerService.reverseJournalEntryInTx(tx, payment.journalEntryId, actorId, {
      description: `Reversal — payment ${payment.paymentNumber} for bill ${payment.vendorBill.billNumber}`,
    });

    const newPaidAmount = payment.vendorBill.paidAmount.minus(payment.amount);
    const newStatus = newPaidAmount.lessThanOrEqualTo(0) ? ApBillStatus.APPROVED : ApBillStatus.PARTIALLY_PAID;

    await tx.vendorBill.update({ where: { id: payment.vendorBillId }, data: { paidAmount: newPaidAmount, status: newStatus } });

    const now = new Date();
    const updatedPayment = await tx.vendorPayment.update({
      where: { id },
      data: { status: PaymentRecordStatus.REVERSED, reversedById: actorId, reversedAt: now },
      include: { vendorBill: { include: { vendor: true } } },
    });

    return { updatedPayment, reversal };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.reversal.id, after: { reversalOfVendorPayment: result.updatedPayment.paymentNumber } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'VendorPayment', targetId: id, before: { status: 'POSTED' }, after: { status: 'REVERSED' } });
  return result.updatedPayment;
}

// ─── Vendor Statement ─────────────────────────────────────

export async function getVendorStatement(vendorId: string, filters: { dateFrom?: string; dateTo?: string }) {
  const vendor = await getVendorById(vendorId);

  const bills = await prisma.vendorBill.findMany({
    where: {
      vendorId,
      status: { in: [ApBillStatus.APPROVED, ApBillStatus.PARTIALLY_PAID, ApBillStatus.PAID] },
      ...(filters.dateFrom ? { billDate: { gte: startOfDay(new Date(filters.dateFrom)) } } : {}),
      ...(filters.dateTo ? { billDate: { lte: endOfDay(new Date(filters.dateTo)) } } : {}),
    },
  });
  const payments = await prisma.vendorPayment.findMany({
    where: {
      vendorBill: { vendorId },
      status: PaymentRecordStatus.POSTED,
      ...(filters.dateFrom ? { paymentDate: { gte: startOfDay(new Date(filters.dateFrom)) } } : {}),
      ...(filters.dateTo ? { paymentDate: { lte: endOfDay(new Date(filters.dateTo)) } } : {}),
    },
    include: { vendorBill: true },
  });

  type Row = { date: Date; reference: string; description: string; debit: Prisma.Decimal; credit: Prisma.Decimal };
  const rows: Row[] = [
    ...bills.map((b) => ({ date: b.billDate, reference: b.billNumber, description: `Vendor bill`, debit: new Prisma.Decimal(0), credit: b.totalAmount })),
    ...payments.map((p) => ({ date: p.paymentDate, reference: p.paymentNumber, description: `Payment for ${p.vendorBill.billNumber}`, debit: p.amount, credit: new Prisma.Decimal(0) })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = new Prisma.Decimal(0);
  const withBalance = rows.map((r) => {
    balance = balance.plus(r.credit).minus(r.debit);
    return { ...r, balance };
  });

  return { vendor, rows: withBalance, closingBalance: balance };
}

// ─── Aging & Dashboard ────────────────────────────────────

export async function getApAging(asOfDateStr?: string) {
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();
  const bills = await prisma.vendorBill.findMany({
    where: { status: { in: [ApBillStatus.APPROVED, ApBillStatus.PARTIALLY_PAID] } },
    include: { vendor: true },
  });

  const byVendor = new Map<string, { vendor: { id: string; vendorId: string; name: string }; buckets: ReturnType<typeof emptyAgingBuckets> }>();
  for (const b of bills) {
    const outstanding = b.totalAmount.minus(b.paidAmount);
    if (outstanding.lessThanOrEqualTo(0)) continue;
    const entry = byVendor.get(b.vendorId) || { vendor: { id: b.vendor.id, vendorId: b.vendor.vendorId, name: b.vendor.name }, buckets: emptyAgingBuckets() };
    addToAgingBucket(entry.buckets, b.dueDate, outstanding, asOf);
    byVendor.set(b.vendorId, entry);
  }

  const rows = Array.from(byVendor.values()).sort((a, b) => a.vendor.name.localeCompare(b.vendor.name));
  return { asOf, rows };
}

export async function getApDashboard(asOfDateStr?: string) {
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();
  const weekFromNow = new Date(asOf.getTime() + 7 * 24 * 60 * 60 * 1000);

  const bills = await prisma.vendorBill.findMany({ where: { status: { in: [ApBillStatus.APPROVED, ApBillStatus.PARTIALLY_PAID, ApBillStatus.PAID] } } });

  let totalOutstanding = new Prisma.Decimal(0);
  let dueToday = new Prisma.Decimal(0);
  let dueThisWeek = new Prisma.Decimal(0);
  let overdue = new Prisma.Decimal(0);
  let partiallyPaidAmount = new Prisma.Decimal(0);
  let paidAmount = new Prisma.Decimal(0);
  let partiallyPaidCount = 0;
  let paidCount = 0;

  const todayStart = startOfDay(asOf);
  const todayEnd = endOfDay(asOf);

  for (const b of bills) {
    const outstanding = b.totalAmount.minus(b.paidAmount);
    if (b.status === ApBillStatus.PAID) {
      paidAmount = paidAmount.plus(b.totalAmount);
      paidCount++;
      continue;
    }
    totalOutstanding = totalOutstanding.plus(outstanding);
    if (b.status === ApBillStatus.PARTIALLY_PAID) {
      partiallyPaidAmount = partiallyPaidAmount.plus(outstanding);
      partiallyPaidCount++;
    }
    if (b.dueDate >= todayStart && b.dueDate <= todayEnd) dueToday = dueToday.plus(outstanding);
    if (b.dueDate >= todayStart && b.dueDate <= weekFromNow) dueThisWeek = dueThisWeek.plus(outstanding);
    if (isOverdue(b.dueDate, outstanding, asOf)) overdue = overdue.plus(outstanding);
  }

  return {
    totalOutstanding,
    dueToday,
    dueThisWeek,
    overdue,
    partiallyPaid: { count: partiallyPaidCount, amount: partiallyPaidAmount },
    paid: { count: paidCount, amount: paidAmount },
  };
}
