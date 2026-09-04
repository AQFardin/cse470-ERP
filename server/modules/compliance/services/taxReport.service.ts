import { Prisma, TaxDirection, TaxTransactionStatus, TaxPeriodStatus } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { TaxError } from '../shared/tax.util';

const zero = new Prisma.Decimal(0);

/** High-level compliance dashboard: current-period status, outstanding liability, recent activity. */
export async function getComplianceDashboard() {
  const [openPeriods, latestPeriod, activeTaxCodes, unpaidFinalized] = await Promise.all([
    prisma.taxPeriod.count({ where: { status: { in: [TaxPeriodStatus.OPEN, TaxPeriodStatus.REVIEW] } } }),
    prisma.taxPeriod.findFirst({ orderBy: { startDate: 'desc' } }),
    prisma.taxCode.count({ where: { isActive: true } }),
    prisma.taxPeriod.findMany({
      where: { status: { in: [TaxPeriodStatus.FINALIZED, TaxPeriodStatus.FILED] }, payment: null },
      select: { id: true, name: true, netPayable: true, dueDate: true },
    }),
  ]);

  const outstandingLiability = unpaidFinalized.reduce((sum, p) => sum.plus(p.netPayable ?? zero), zero);

  const sums = await prisma.taxTransaction.groupBy({
    by: ['direction'],
    where: { status: TaxTransactionStatus.ACTIVE },
    _sum: { taxAmount: true },
  });
  const totalOutputTax = sums.find((s) => s.direction === TaxDirection.OUTPUT)?._sum.taxAmount ?? zero;
  const totalInputTax = sums.find((s) => s.direction === TaxDirection.INPUT)?._sum.taxAmount ?? zero;

  return {
    openPeriods,
    activeTaxCodes,
    latestPeriod,
    outstandingLiability,
    unpaidFinalizedPeriods: unpaidFinalized,
    totalOutputTax,
    totalInputTax,
  };
}

/** Output VAT (sales tax) summary — grouped by tax code, optionally date-bounded. */
export async function getSalesTaxReport(from?: Date, to?: Date) {
  return taxSummaryByDirection(TaxDirection.OUTPUT, from, to);
}

/** Input VAT (purchase tax) summary — grouped by tax code, optionally date-bounded. */
export async function getPurchaseTaxReport(from?: Date, to?: Date) {
  return taxSummaryByDirection(TaxDirection.INPUT, from, to);
}

async function taxSummaryByDirection(direction: TaxDirection, from?: Date, to?: Date) {
  const where: Prisma.TaxTransactionWhereInput = {
    direction,
    status: TaxTransactionStatus.ACTIVE,
    ...(from || to ? { transactionDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const grouped = await prisma.taxTransaction.groupBy({
    by: ['taxCodeId'],
    where,
    _sum: { taxableAmount: true, taxAmount: true },
    _count: { _all: true },
  });

  const taxCodes = await prisma.taxCode.findMany({ where: { id: { in: grouped.map((g) => g.taxCodeId) } } });
  const byId = new Map(taxCodes.map((tc) => [tc.id, tc]));

  const lines = grouped.map((g) => ({
    taxCode: byId.get(g.taxCodeId) ?? null,
    taxableAmount: g._sum.taxableAmount ?? zero,
    taxAmount: g._sum.taxAmount ?? zero,
    transactionCount: g._count._all,
  }));

  const totals = lines.reduce(
    (acc, l) => ({ taxableAmount: acc.taxableAmount.plus(l.taxableAmount), taxAmount: acc.taxAmount.plus(l.taxAmount) }),
    { taxableAmount: zero, taxAmount: zero }
  );

  return { lines, totals };
}

/** Net tax liability across all periods (or a single one), by status. */
export async function getTaxLiabilityReport() {
  const periods = await prisma.taxPeriod.findMany({
    where: { calculatedAt: { not: null } },
    select: { id: true, name: true, status: true, outputTax: true, inputTax: true, adjustments: true, netPayable: true, dueDate: true, payment: { select: { amount: true, status: true } } },
    orderBy: { startDate: 'desc' },
  });

  const totalLiability = periods.reduce((sum, p) => sum.plus(p.netPayable ?? zero), zero);
  const totalPaid = periods.reduce((sum, p) => sum.plus(p.payment && p.payment.status === 'POSTED' ? p.payment.amount : zero), zero);

  return { periods, totalLiability, totalPaid, totalOutstanding: totalLiability.minus(totalPaid) };
}

export async function getTaxPaymentsReport() {
  const payments = await prisma.taxPayment.findMany({
    include: { taxPeriod: { select: { id: true, name: true } }, bankAccount: { select: { id: true, code: true, name: true } } },
    orderBy: { paymentDate: 'desc' },
  });
  const totalPaid = payments.reduce((sum, p) => sum.plus(p.status === 'POSTED' ? p.amount : zero), zero);
  return { payments, totalPaid };
}

/**
 * The statutory filing document for a tax period — the formal output the
 * "File Return" action produces, not just a status flag. Only available
 * once the period is FINALIZED/FILED/CLOSED (its numbers are locked), so
 * the document a taxpayer files never diverges from what's stored.
 * Itemizes output and input tax by tax code + category (so ZERO_RATED and
 * EXEMPT lines are visibly distinct from STANDARD-rated ones, as required
 * on most real VAT/GST returns).
 */
export async function generateStatutoryFilingReport(periodId: string) {
  const period = await prisma.taxPeriod.findUnique({
    where: { id: periodId },
    include: {
      createdBy: { select: { id: true, name: true } },
      finalizedBy: { select: { id: true, name: true } },
      filedBy: { select: { id: true, name: true } },
      payment: { select: { amount: true, paymentDate: true, status: true, referenceNumber: true } },
    },
  });
  if (!period) throw new TaxError('Tax period not found', 404);
  if (!['FINALIZED', 'FILED', 'CLOSED'].includes(period.status)) {
    throw new TaxError('A statutory filing report is only available once the period is finalized', 409);
  }

  const transactions = await prisma.taxTransaction.findMany({
    where: { taxPeriodId: periodId, status: TaxTransactionStatus.ACTIVE },
    include: { taxCode: true },
  });

  function summarizeByCodeAndCategory(direction: TaxDirection) {
    const byKey = new Map<string, { taxCode: string; category: string; ratePercent: Prisma.Decimal; taxableAmount: Prisma.Decimal; taxAmount: Prisma.Decimal; count: number }>();
    for (const t of transactions.filter((t) => t.direction === direction)) {
      const key = `${t.taxCodeId}:${t.category}`;
      const bucket = byKey.get(key) || { taxCode: t.taxCode.code, category: t.category, ratePercent: t.ratePercent, taxableAmount: zero, taxAmount: zero, count: 0 };
      bucket.taxableAmount = bucket.taxableAmount.plus(t.taxableAmount);
      bucket.taxAmount = bucket.taxAmount.plus(t.taxAmount);
      bucket.count++;
      byKey.set(key, bucket);
    }
    return Array.from(byKey.values()).sort((a, b) => a.taxCode.localeCompare(b.taxCode));
  }

  const outputLines = summarizeByCodeAndCategory(TaxDirection.OUTPUT);
  const inputLines = summarizeByCodeAndCategory(TaxDirection.INPUT);

  return {
    period: { id: period.id, name: period.name, startDate: period.startDate, endDate: period.endDate, dueDate: period.dueDate, status: period.status },
    filing: {
      finalizedBy: period.finalizedBy, finalizedAt: period.finalizedAt,
      filedBy: period.filedBy, filedAt: period.filedAt,
    },
    outputTax: { lines: outputLines, total: period.outputTax ?? zero },
    inputTax: { lines: inputLines, total: period.inputTax ?? zero },
    adjustments: period.adjustments,
    netPayable: period.netPayable ?? zero,
    payment: period.payment,
    generatedAt: new Date(),
  };
}
