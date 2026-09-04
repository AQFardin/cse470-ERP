import { AccountType, PaymentMethod, PaymentRecordStatus, TaxPeriodStatus, AccountMappingKey } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import * as ledgerService from '../../general-ledger/services/ledger.service';
import { resolveControlAccount, assertAccountUsable, toDecimal as financeToDecimal } from '../../financial-management/shared/finance.util';
import { TaxError } from '../shared/tax.util';

export interface TaxPaymentInput {
  taxPeriodId: string;
  amount: number | string;
  paymentDate: string | Date;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  bankAccountId: string;
}

export async function getTaxPaymentById(id: string) {
  const payment = await prisma.taxPayment.findUnique({
    where: { id },
    include: {
      taxPeriod: true,
      bankAccount: { select: { id: true, code: true, name: true } },
      journalEntry: { select: { id: true, entryNumber: true, status: true } },
      createdBy: { select: { id: true, name: true } },
      reversedBy: { select: { id: true, name: true } },
    },
  });
  if (!payment) throw new TaxError('Tax payment not found', 404);
  return payment;
}

export async function listTaxPayments() {
  return prisma.taxPayment.findMany({
    include: { taxPeriod: { select: { id: true, name: true } }, bankAccount: { select: { id: true, code: true, name: true } } },
    orderBy: { paymentDate: 'desc' },
  });
}

/**
 * Records the payment of a finalized/filed tax return and posts
 * VAT Payable debit / Bank credit — the liability is cleared and cash goes
 * out. Mirrors VendorPayment's GL-posting pattern.
 */
export async function createTaxPayment(input: TaxPaymentInput, actorId: string) {
  const amount = financeToDecimal(input.amount);
  if (amount.lessThanOrEqualTo(0)) throw new TaxError('Payment amount must be greater than zero');

  const paymentDate = new Date(input.paymentDate);
  if (isNaN(paymentDate.getTime())) throw new TaxError('Invalid payment date');

  const result = await prisma.$transaction(async (tx) => {
    const period = await tx.taxPeriod.findUnique({ where: { id: input.taxPeriodId }, include: { payment: true } });
    if (!period) throw new TaxError('Tax period not found', 404);
    if (![TaxPeriodStatus.FINALIZED, TaxPeriodStatus.FILED].includes(period.status as typeof TaxPeriodStatus.FINALIZED | typeof TaxPeriodStatus.FILED)) {
      throw new TaxError('Only a finalized or filed tax period can be paid', 409);
    }
    if (period.payment) throw new TaxError('This tax period already has a payment recorded', 409);
    if (period.netPayable == null) throw new TaxError('Tax period has no calculated net payable amount', 409);
    if (period.netPayable.lessThanOrEqualTo(0)) throw new TaxError('This tax period has no liability to pay', 409);
    if (amount.greaterThan(period.netPayable)) {
      throw new TaxError(`Payment of ${amount.toFixed(2)} exceeds the net payable of ${period.netPayable.toFixed(2)}`);
    }

    await assertAccountUsable(tx, input.bankAccountId, { requireType: AccountType.ASSET, label: 'Payment account' });
    const vatPayableAccount = await resolveControlAccount(tx, AccountMappingKey.OUTPUT_VAT_PAYABLE, 'Output VAT Payable');

    const journalEntry = await ledgerService.postAccountingEntry(
      {
        transactionDate: paymentDate,
        description: `Tax payment for period ${period.name}`,
        lines: [
          { accountId: vatPayableAccount.id, debit: amount, description: `Tax payment — ${period.name}` },
          { accountId: input.bankAccountId, credit: amount, description: `Tax payment — ${period.name}` },
        ],
      },
      actorId,
      tx
    );

    const payment = await tx.taxPayment.create({
      data: {
        taxPeriodId: period.id,
        amount,
        paymentDate,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || null,
        status: PaymentRecordStatus.POSTED,
        bankAccountId: input.bankAccountId,
        journalEntryId: journalEntry.id,
        createdById: actorId,
      },
      include: { taxPeriod: true, bankAccount: { select: { id: true, code: true, name: true } } },
    });

    return { payment, journalEntry };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.journalEntry.id, after: { forTaxPayment: result.payment.id, entryNumber: result.journalEntry.entryNumber } });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'TaxPayment', targetId: result.payment.id, after: result.payment });
  return result.payment;
}

export async function reverseTaxPayment(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.taxPayment.findUnique({ where: { id } });
    if (!payment) throw new TaxError('Tax payment not found', 404);
    if (payment.status === PaymentRecordStatus.REVERSED) throw new TaxError('This tax payment is already reversed', 409);

    let reversal: Awaited<ReturnType<typeof ledgerService.reverseJournalEntryInTx>>['reversal'] | null = null;
    if (payment.journalEntryId) {
      ({ reversal } = await ledgerService.reverseJournalEntryInTx(tx, payment.journalEntryId, actorId, {
        description: `Reversal of tax payment for period`,
      }));
    }

    const updated = await tx.taxPayment.update({
      where: { id },
      data: { status: PaymentRecordStatus.REVERSED, reversedById: actorId, reversedAt: new Date() },
    });

    return { updated, reversal };
  });

  if (result.reversal) {
    await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.reversal.id, after: { reversalOfTaxPayment: id } });
  }
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'TaxPayment', targetId: id, before: { status: 'POSTED' }, after: { status: 'REVERSED' } });
  return result.updated;
}
