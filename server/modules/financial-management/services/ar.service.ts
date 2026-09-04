import { Prisma, ArInvoiceStatus, PaymentMethod, PaymentRecordStatus, AccountMappingKey, AccountType, TaxSourceType, TaxDirection } from '@prisma/client';
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

// Customers are the existing CRM module's model (prisma.customer) — AR does not
// duplicate it. Use GET /api/crm/customers for the customer picker.

const resolveReceivableAccount = (tx: TxClient) => resolveControlAccount(tx, AccountMappingKey.ACCOUNTS_RECEIVABLE, 'Accounts Receivable');
const assertRevenueAccountUsable = (tx: TxClient, accountId: string) => assertAccountUsable(tx, accountId, { requireType: AccountType.REVENUE, label: 'Revenue account' });
const assertBankAccountUsable = (tx: TxClient, accountId: string) => assertAccountUsable(tx, accountId, { requireType: AccountType.ASSET, label: 'Payment account' });
const resolveOutputVatAccount = (tx: TxClient) => resolveControlAccount(tx, AccountMappingKey.OUTPUT_VAT_PAYABLE, 'Output VAT Payable');

// ─── Customer Invoices ────────────────────────────────────

export interface CustomerInvoiceInput {
  customerId: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  referenceNumber?: string;
  currency?: string;
  taxAmount?: number | string;
  discountAmount?: number | string;
  revenueAccountId: string;
  notes?: string;
  items: LineItemInput[];
  /** Optional — when set, the Compliance & Tax Engine computes taxAmount from this code's effective rate (backend-authoritative) and GL posting splits out Output VAT Payable. */
  taxCodeId?: string | null;
}

export async function listCustomerInvoices(filters: {
  status?: ArInvoiceStatus;
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize || 25));

  const where: Prisma.CustomerInvoiceWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { invoiceDate: { ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}), ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}) } }
      : {}),
    ...(filters.search
      ? { OR: [{ invoiceNumber: { contains: filters.search } }, { referenceNumber: { contains: filters.search } }] }
      : {}),
  };

  const [total, invoices] = await Promise.all([
    prisma.customerInvoice.count({ where }),
    prisma.customerInvoice.findMany({
      where,
      orderBy: [{ invoiceDate: 'desc' }, { invoiceNumber: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: true, items: true },
    }),
  ]);

  const now = new Date();
  const withOverdue = invoices.map((inv) => ({ ...inv, isOverdue: isOverdue(inv.dueDate, inv.totalAmount.minus(inv.paidAmount), now) }));

  return { invoices: withOverdue, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

export async function getCustomerInvoiceById(id: string) {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: { select: { id: true, name: true } } } },
      revenueAccount: { select: { id: true, code: true, name: true } },
      receivableAccount: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      issuedBy: { select: { id: true, name: true } },
      journalEntry: { select: { id: true, entryNumber: true, status: true } },
      payments: { include: { bankAccount: { select: { id: true, code: true, name: true } }, createdBy: { select: { id: true, name: true } } }, orderBy: { paymentDate: 'asc' } },
    },
  });
  if (!invoice) throw new FinanceError('Customer invoice not found', 404);
  return { ...invoice, isOverdue: isOverdue(invoice.dueDate, invoice.totalAmount.minus(invoice.paidAmount)) };
}

export async function createCustomerInvoice(input: CustomerInvoiceInput, actorId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new FinanceError('Customer not found', 404);

  const invoiceDate = new Date(input.invoiceDate);
  const dueDate = new Date(input.dueDate);
  if (isNaN(invoiceDate.getTime()) || isNaN(dueDate.getTime())) throw new FinanceError('Invalid invoice date or due date');
  if (dueDate < invoiceDate) throw new FinanceError('Due date cannot be before the invoice date');

  const { items, subtotal } = normalizeLineItems(input.items);
  const discountAmount = toDecimal(input.discountAmount);

  // Jurisdiction-aware auto-selection: an explicit taxCodeId always wins; if
  // none was given, try to resolve one automatically from the customer's region.
  const taxCodeId = input.taxCodeId || (await resolveTaxCodeForRegion(customer.region));

  let taxAmount = toDecimal(input.taxAmount);
  if (taxCodeId) {
    const computed = await computeTax({ taxCodeId, amount: subtotal, amountType: 'EXCLUSIVE', asOf: invoiceDate });
    taxAmount = computed.taxAmount;
  }
  const totalAmount = computeTotal(subtotal, taxAmount, discountAmount);

  const invoice = await prisma.$transaction(async (tx) => {
    await assertRevenueAccountUsable(tx, input.revenueAccountId);
    const receivableAccount = await resolveReceivableAccount(tx);
    const invoiceNumber = await nextDocumentNumber('INV', () => tx.customerInvoice.count());

    return tx.customerInvoice.create({
      data: {
        invoiceNumber,
        customerId: input.customerId,
        invoiceDate,
        dueDate,
        referenceNumber: input.referenceNumber || null,
        currency: input.currency?.trim() || 'BDT',
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        status: ArInvoiceStatus.DRAFT,
        revenueAccountId: input.revenueAccountId,
        receivableAccountId: receivableAccount.id,
        taxCodeId: taxCodeId || null,
        notes: input.notes || null,
        createdById: actorId,
        items: { create: items },
      },
      include: { customer: true, items: true },
    });
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'CustomerInvoice', targetId: invoice.id, after: invoice });
  return invoice;
}

export async function updateCustomerInvoice(id: string, input: Partial<CustomerInvoiceInput>, actorId: string) {
  const before = await prisma.customerInvoice.findUnique({ where: { id }, include: { items: true } });
  if (!before) throw new FinanceError('Customer invoice not found', 404);
  if (before.status !== ArInvoiceStatus.DRAFT) throw new FinanceError('Only draft invoices can be edited', 409);

  let subtotal = before.subtotal;
  let itemsUpdate: Prisma.CustomerInvoiceItemUncheckedCreateWithoutCustomerInvoiceInput[] | undefined;
  if (input.items) {
    const normalized = normalizeLineItems(input.items);
    subtotal = normalized.subtotal;
    itemsUpdate = normalized.items;
  }

  const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : before.invoiceDate;
  const taxCodeId = input.taxCodeId !== undefined ? input.taxCodeId : before.taxCodeId;

  let taxAmount = input.taxAmount !== undefined ? toDecimal(input.taxAmount) : before.taxAmount;
  if (taxCodeId) {
    const computed = await computeTax({ taxCodeId, amount: subtotal, amountType: 'EXCLUSIVE', asOf: invoiceDate });
    taxAmount = computed.taxAmount;
  }

  const invoice = await prisma.$transaction(async (tx) => {
    if (itemsUpdate) {
      await tx.customerInvoiceItem.deleteMany({ where: { customerInvoiceId: id } });
    }

    if (input.revenueAccountId) await assertRevenueAccountUsable(tx, input.revenueAccountId);

    const discountAmount = input.discountAmount !== undefined ? toDecimal(input.discountAmount) : before.discountAmount;
    const totalAmount = computeTotal(subtotal, taxAmount, discountAmount);

    return tx.customerInvoice.update({
      where: { id },
      data: {
        ...(input.invoiceDate ? { invoiceDate: new Date(input.invoiceDate) } : {}),
        ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
        ...(input.referenceNumber !== undefined ? { referenceNumber: input.referenceNumber } : {}),
        ...(input.revenueAccountId ? { revenueAccountId: input.revenueAccountId } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.taxCodeId !== undefined ? { taxCodeId: input.taxCodeId || null } : {}),
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        ...(itemsUpdate ? { items: { create: itemsUpdate } } : {}),
      },
      include: { customer: true, items: true },
    });
  });

  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'CustomerInvoice', targetId: id, before, after: invoice });
  return invoice;
}

export async function deleteCustomerInvoice(id: string, actorId: string) {
  const before = await prisma.customerInvoice.findUnique({ where: { id } });
  if (!before) throw new FinanceError('Customer invoice not found', 404);
  if (before.status !== ArInvoiceStatus.DRAFT) throw new FinanceError('Only draft invoices can be deleted', 409);

  await prisma.customerInvoice.delete({ where: { id } });
  await logAudit({ actorId, action: 'DELETE', targetEntity: 'CustomerInvoice', targetId: id, before });
}

export async function issueCustomerInvoice(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.customerInvoice.findUnique({ where: { id }, include: { customer: true } });
    if (!invoice) throw new FinanceError('Customer invoice not found', 404);
    if (invoice.status !== ArInvoiceStatus.DRAFT) throw new FinanceError('Only draft invoices can be issued', 409);

    const now = new Date();

    // With a tax code: AR debit (total, unchanged) / Revenue credit (net) /
    // Output VAT Payable credit (tax) — still balances (net + tax = total).
    // Without one: unchanged 2-line posting, exactly as before this feature.
    const lines: Parameters<typeof ledgerService.postAccountingEntry>[0]['lines'] = invoice.taxCodeId && invoice.taxAmount.greaterThan(0)
      ? [
          { accountId: invoice.receivableAccountId, debit: invoice.totalAmount, description: `Invoice ${invoice.invoiceNumber}` },
          { accountId: invoice.revenueAccountId, credit: invoice.subtotal, description: `Invoice ${invoice.invoiceNumber} — ${invoice.customer.name}` },
          { accountId: (await resolveOutputVatAccount(tx)).id, credit: invoice.taxAmount, description: `Output VAT — invoice ${invoice.invoiceNumber}` },
        ]
      : [
          { accountId: invoice.receivableAccountId, debit: invoice.totalAmount, description: `Invoice ${invoice.invoiceNumber}` },
          { accountId: invoice.revenueAccountId, credit: invoice.totalAmount, description: `Invoice ${invoice.invoiceNumber} — ${invoice.customer.name}` },
        ];

    const journalEntry = await ledgerService.postAccountingEntry(
      {
        transactionDate: invoice.invoiceDate,
        description: `Customer invoice ${invoice.invoiceNumber} — ${invoice.customer.name}`,
        currency: invoice.currency,
        lines,
      },
      actorId,
      tx
    );

    let taxTransactionId: string | null = null;
    if (invoice.taxCodeId) {
      const computed = await computeTax({ taxCodeId: invoice.taxCodeId, amount: invoice.subtotal, amountType: 'EXCLUSIVE', asOf: invoice.invoiceDate });
      const taxTx = await createTaxTransaction(tx, {
        sourceType: TaxSourceType.AR_INVOICE,
        sourceId: invoice.id,
        transactionDate: invoice.invoiceDate,
        direction: TaxDirection.OUTPUT,
        taxCodeId: invoice.taxCodeId,
        taxRateId: computed.taxRateId,
        category: computed.category,
        ratePercent: computed.ratePercent,
        taxableAmount: invoice.subtotal,
        taxAmount: invoice.taxAmount,
      });
      taxTransactionId = taxTx.id;
    }

    const updated = await tx.customerInvoice.update({
      where: { id },
      data: { status: ArInvoiceStatus.ISSUED, issuedById: actorId, issuedAt: now, journalEntryId: journalEntry.id },
      include: { customer: true, items: true },
    });

    return { before: invoice, after: updated, journalEntry, taxTransactionId };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.journalEntry.id, after: { forCustomerInvoice: result.after.invoiceNumber, entryNumber: result.journalEntry.entryNumber } });
  if (result.taxTransactionId) {
    await logAudit({ actorId, action: 'CREATE', targetEntity: 'TaxTransaction', targetId: result.taxTransactionId, after: { forCustomerInvoice: result.after.invoiceNumber } });
  }
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'CustomerInvoice', targetId: id, before: { status: result.before.status }, after: { status: result.after.status } });
  return result.after;
}

export async function cancelCustomerInvoice(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.customerInvoice.findUnique({ where: { id } });
    if (!invoice) throw new FinanceError('Customer invoice not found', 404);
    if (invoice.status === ArInvoiceStatus.CANCELLED) throw new FinanceError('Invoice is already cancelled', 409);
    if (invoice.status === ArInvoiceStatus.PAID) throw new FinanceError('A fully paid invoice cannot be cancelled', 409);
    if (invoice.paidAmount.greaterThan(0)) throw new FinanceError('Cannot cancel an invoice that has payments — reverse the payments first', 409);

    let reversalId: string | null = null;
    if (invoice.status === ArInvoiceStatus.ISSUED && invoice.journalEntryId) {
      const { reversal } = await ledgerService.reverseJournalEntryInTx(tx, invoice.journalEntryId, actorId, {
        description: `Reversal — cancelled invoice ${invoice.invoiceNumber}`,
      });
      reversalId = reversal.id;
    }

    if (invoice.taxCodeId) {
      await reverseTaxTransactionForSource(tx, TaxSourceType.AR_INVOICE, invoice.id);
    }

    const updated = await tx.customerInvoice.update({ where: { id }, data: { status: ArInvoiceStatus.CANCELLED }, include: { customer: true } });
    return { before: invoice, after: updated, reversalId };
  });

  if (result.reversalId) {
    await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.reversalId, after: { reversalOfCustomerInvoice: result.after.invoiceNumber } });
  }
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'CustomerInvoice', targetId: id, before: { status: result.before.status }, after: { status: 'CANCELLED' } });
  return result.after;
}

// ─── Customer Payments ────────────────────────────────────

export interface CustomerPaymentInput {
  customerInvoiceId: string;
  amount: number | string;
  paymentDate: string | Date;
  paymentMethod: PaymentMethod;
  bankAccountId: string;
  referenceNumber?: string;
  notes?: string;
}

export async function listCustomerPayments(filters: { customerInvoiceId?: string; status?: PaymentRecordStatus; page?: number; pageSize?: number }) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize || 25));
  const where: Prisma.CustomerPaymentWhereInput = {
    ...(filters.customerInvoiceId ? { customerInvoiceId: filters.customerInvoiceId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const [total, payments] = await Promise.all([
    prisma.customerPayment.count({ where }),
    prisma.customerPayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customerInvoice: { include: { customer: true } }, bankAccount: { select: { id: true, code: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    }),
  ]);
  return { payments, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

export async function getCustomerPaymentById(id: string) {
  const payment = await prisma.customerPayment.findUnique({
    where: { id },
    include: {
      customerInvoice: { include: { customer: true } },
      bankAccount: { select: { id: true, code: true, name: true } },
      journalEntry: { select: { id: true, entryNumber: true, status: true } },
      createdBy: { select: { id: true, name: true } },
      reversedBy: { select: { id: true, name: true } },
    },
  });
  if (!payment) throw new FinanceError('Customer payment not found', 404);
  return payment;
}

export async function createCustomerPayment(input: CustomerPaymentInput, actorId: string) {
  const amount = toDecimal(input.amount);
  if (amount.lessThanOrEqualTo(0)) throw new FinanceError('Payment amount must be greater than zero');

  const paymentDate = new Date(input.paymentDate);
  if (isNaN(paymentDate.getTime())) throw new FinanceError('Invalid payment date');

  const result = await prisma.$transaction(async (tx) => {
    // Re-read fresh inside the transaction — see ap.service.ts's createVendorPayment for why.
    const invoice = await tx.customerInvoice.findUnique({ where: { id: input.customerInvoiceId }, include: { customer: true } });
    if (!invoice) throw new FinanceError('Customer invoice not found', 404);
    if (invoice.status === ArInvoiceStatus.DRAFT) throw new FinanceError('Cannot pay a draft invoice — issue it first', 409);
    if (invoice.status === ArInvoiceStatus.CANCELLED) throw new FinanceError('Cannot pay a cancelled invoice', 409);
    if (invoice.status === ArInvoiceStatus.PAID) throw new FinanceError('This invoice is already fully paid', 409);

    const outstanding = invoice.totalAmount.minus(invoice.paidAmount);
    if (amount.greaterThan(outstanding)) {
      throw new FinanceError(`Payment of ${amount.toFixed(2)} exceeds the outstanding balance of ${outstanding.toFixed(2)}`);
    }

    await assertBankAccountUsable(tx, input.bankAccountId);

    const paymentNumber = await nextDocumentNumber('ARP', () => tx.customerPayment.count());

    const journalEntry = await ledgerService.postAccountingEntry(
      {
        transactionDate: paymentDate,
        description: `Payment ${paymentNumber} for invoice ${invoice.invoiceNumber} — ${invoice.customer.name}`,
        currency: invoice.currency,
        lines: [
          { accountId: input.bankAccountId, debit: amount, description: `Payment for ${invoice.invoiceNumber}` },
          { accountId: invoice.receivableAccountId, credit: amount, description: `Payment for ${invoice.invoiceNumber}` },
        ],
      },
      actorId,
      tx
    );

    const newPaidAmount = invoice.paidAmount.plus(amount);
    const newStatus = newPaidAmount.greaterThanOrEqualTo(invoice.totalAmount) ? ArInvoiceStatus.PAID : ArInvoiceStatus.PARTIALLY_PAID;

    await tx.customerInvoice.update({ where: { id: invoice.id }, data: { paidAmount: newPaidAmount, status: newStatus } });

    const payment = await tx.customerPayment.create({
      data: {
        paymentNumber,
        customerInvoiceId: invoice.id,
        amount,
        paymentDate,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || null,
        notes: input.notes || null,
        bankAccountId: input.bankAccountId,
        journalEntryId: journalEntry.id,
        createdById: actorId,
      },
      include: { customerInvoice: { include: { customer: true } }, bankAccount: { select: { id: true, code: true, name: true } } },
    });

    return { payment, journalEntry };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.journalEntry.id, after: { forCustomerPayment: result.payment.paymentNumber, entryNumber: result.journalEntry.entryNumber } });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'CustomerPayment', targetId: result.payment.id, after: result.payment });
  return result.payment;
}

export async function reverseCustomerPayment(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.findUnique({ where: { id }, include: { customerInvoice: true } });
    if (!payment) throw new FinanceError('Customer payment not found', 404);
    if (payment.status === PaymentRecordStatus.REVERSED) throw new FinanceError('This payment has already been reversed', 409);
    if (!payment.journalEntryId) throw new FinanceError('This payment has no linked journal entry to reverse', 409);

    const { reversal } = await ledgerService.reverseJournalEntryInTx(tx, payment.journalEntryId, actorId, {
      description: `Reversal — payment ${payment.paymentNumber} for invoice ${payment.customerInvoice.invoiceNumber}`,
    });

    const newPaidAmount = payment.customerInvoice.paidAmount.minus(payment.amount);
    const newStatus = newPaidAmount.lessThanOrEqualTo(0) ? ArInvoiceStatus.ISSUED : ArInvoiceStatus.PARTIALLY_PAID;

    await tx.customerInvoice.update({ where: { id: payment.customerInvoiceId }, data: { paidAmount: newPaidAmount, status: newStatus } });

    const now = new Date();
    const updatedPayment = await tx.customerPayment.update({
      where: { id },
      data: { status: PaymentRecordStatus.REVERSED, reversedById: actorId, reversedAt: now },
      include: { customerInvoice: { include: { customer: true } } },
    });

    return { updatedPayment, reversal };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.reversal.id, after: { reversalOfCustomerPayment: result.updatedPayment.paymentNumber } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'CustomerPayment', targetId: id, before: { status: 'POSTED' }, after: { status: 'REVERSED' } });
  return result.updatedPayment;
}

// ─── Customer Statement ───────────────────────────────────

export async function getCustomerStatement(customerId: string, filters: { dateFrom?: string; dateTo?: string }) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new FinanceError('Customer not found', 404);

  const invoices = await prisma.customerInvoice.findMany({
    where: {
      customerId,
      status: { in: [ArInvoiceStatus.ISSUED, ArInvoiceStatus.PARTIALLY_PAID, ArInvoiceStatus.PAID] },
      ...(filters.dateFrom ? { invoiceDate: { gte: startOfDay(new Date(filters.dateFrom)) } } : {}),
      ...(filters.dateTo ? { invoiceDate: { lte: endOfDay(new Date(filters.dateTo)) } } : {}),
    },
  });
  const payments = await prisma.customerPayment.findMany({
    where: {
      customerInvoice: { customerId },
      status: PaymentRecordStatus.POSTED,
      ...(filters.dateFrom ? { paymentDate: { gte: startOfDay(new Date(filters.dateFrom)) } } : {}),
      ...(filters.dateTo ? { paymentDate: { lte: endOfDay(new Date(filters.dateTo)) } } : {}),
    },
    include: { customerInvoice: true },
  });

  type Row = { date: Date; reference: string; description: string; debit: Prisma.Decimal; credit: Prisma.Decimal };
  const rows: Row[] = [
    ...invoices.map((i) => ({ date: i.invoiceDate, reference: i.invoiceNumber, description: 'Customer invoice', debit: i.totalAmount, credit: new Prisma.Decimal(0) })),
    ...payments.map((p) => ({ date: p.paymentDate, reference: p.paymentNumber, description: `Payment for ${p.customerInvoice.invoiceNumber}`, debit: new Prisma.Decimal(0), credit: p.amount })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = new Prisma.Decimal(0);
  const withBalance = rows.map((r) => {
    balance = balance.plus(r.debit).minus(r.credit);
    return { ...r, balance };
  });

  return { customer, rows: withBalance, closingBalance: balance };
}

// ─── Aging & Dashboard ────────────────────────────────────

export async function getArAging(asOfDateStr?: string) {
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();
  const invoices = await prisma.customerInvoice.findMany({
    where: { status: { in: [ArInvoiceStatus.ISSUED, ArInvoiceStatus.PARTIALLY_PAID] } },
    include: { customer: true },
  });

  const byCustomer = new Map<string, { customer: { id: string; customerId: string; name: string }; buckets: ReturnType<typeof emptyAgingBuckets> }>();
  for (const inv of invoices) {
    const outstanding = inv.totalAmount.minus(inv.paidAmount);
    if (outstanding.lessThanOrEqualTo(0)) continue;
    const entry = byCustomer.get(inv.customerId) || { customer: { id: inv.customer.id, customerId: inv.customer.customerId, name: inv.customer.name }, buckets: emptyAgingBuckets() };
    addToAgingBucket(entry.buckets, inv.dueDate, outstanding, asOf);
    byCustomer.set(inv.customerId, entry);
  }

  const rows = Array.from(byCustomer.values()).sort((a, b) => a.customer.name.localeCompare(b.customer.name));
  return { asOf, rows };
}

export async function getArDashboard(asOfDateStr?: string) {
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();
  const weekFromNow = new Date(asOf.getTime() + 7 * 24 * 60 * 60 * 1000);

  const invoices = await prisma.customerInvoice.findMany({ where: { status: { in: [ArInvoiceStatus.ISSUED, ArInvoiceStatus.PARTIALLY_PAID, ArInvoiceStatus.PAID] } } });

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

  for (const inv of invoices) {
    const outstanding = inv.totalAmount.minus(inv.paidAmount);
    if (inv.status === ArInvoiceStatus.PAID) {
      paidAmount = paidAmount.plus(inv.totalAmount);
      paidCount++;
      continue;
    }
    totalOutstanding = totalOutstanding.plus(outstanding);
    if (inv.status === ArInvoiceStatus.PARTIALLY_PAID) {
      partiallyPaidAmount = partiallyPaidAmount.plus(outstanding);
      partiallyPaidCount++;
    }
    if (inv.dueDate >= todayStart && inv.dueDate <= todayEnd) dueToday = dueToday.plus(outstanding);
    if (inv.dueDate >= todayStart && inv.dueDate <= weekFromNow) dueThisWeek = dueThisWeek.plus(outstanding);
    if (isOverdue(inv.dueDate, outstanding, asOf)) overdue = overdue.plus(outstanding);
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
