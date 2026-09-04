import { Prisma, TaxDirection, TaxSourceType, TaxTransactionStatus, TaxCategory } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { TaxError } from '../shared/tax.util';

type TxClient = Prisma.TransactionClient;

export interface CreateTaxTransactionInput {
  sourceType: TaxSourceType;
  sourceId: string;
  transactionDate: Date;
  direction: TaxDirection;
  taxCodeId: string;
  taxRateId: string | null;
  category: TaxCategory;
  ratePercent: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
}

/**
 * Creates the immutable tax ledger row. Called from within AP/AR's own
 * $transaction so the tax transaction, the source bill/invoice, and the GL
 * posting all succeed or fail together. Values are snapshotted here and
 * never recalculated later, even if the tax code/rate config changes.
 */
export async function createTaxTransaction(tx: TxClient, input: CreateTaxTransactionInput) {
  return tx.taxTransaction.create({
    data: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      transactionDate: input.transactionDate,
      direction: input.direction,
      taxCodeId: input.taxCodeId,
      taxRateId: input.taxRateId,
      category: input.category,
      ratePercent: input.ratePercent,
      taxableAmount: input.taxableAmount,
      taxAmount: input.taxAmount,
      status: TaxTransactionStatus.ACTIVE,
    },
  });
}

/** Marks the tax transaction linked to a cancelled/voided bill or invoice as reversed. Idempotent — a no-op if none exists or already reversed. Caller logs the audit entry after the enclosing transaction commits, matching the rest of the codebase's convention (logAudit is not transaction-aware). */
export async function reverseTaxTransactionForSource(tx: TxClient, sourceType: TaxSourceType, sourceId: string) {
  const existing = await tx.taxTransaction.findFirst({ where: { sourceType, sourceId, status: TaxTransactionStatus.ACTIVE } });
  if (!existing) return null;

  return tx.taxTransaction.update({ where: { id: existing.id }, data: { status: TaxTransactionStatus.REVERSED } });
}

export async function listTaxTransactions(filters: {
  direction?: TaxDirection;
  status?: TaxTransactionStatus;
  taxPeriodId?: string;
  from?: Date;
  to?: Date;
}) {
  return prisma.taxTransaction.findMany({
    where: {
      ...(filters.direction ? { direction: filters.direction } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.taxPeriodId ? { taxPeriodId: filters.taxPeriodId } : {}),
      ...(filters.from || filters.to
        ? { transactionDate: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    },
    include: { taxCode: true },
    orderBy: { transactionDate: 'desc' },
  });
}

export async function getTaxTransactionForSource(sourceType: TaxSourceType, sourceId: string) {
  return prisma.taxTransaction.findFirst({ where: { sourceType, sourceId }, include: { taxCode: true, taxRate: true } });
}

export { TaxError };
