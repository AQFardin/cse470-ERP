import { Prisma, AccountType, AccountMappingKey } from '@prisma/client';
import { LedgerError } from '../../general-ledger/services/ledger.service';

export { LedgerError as FinanceError };

type TxClient = Prisma.TransactionClient;

/** Resolves an AP/AR control account (Accounts Payable / Accounts Receivable) from the configured mapping — never a hard-coded id. */
export async function resolveControlAccount(tx: TxClient, key: AccountMappingKey, label: string) {
  const mapping = await tx.accountMapping.findUnique({ where: { key }, include: { account: true } });
  if (!mapping) {
    throw new LedgerError(`No ${label} account is configured. An administrator must set up the account mapping for ${key}.`, 409);
  }
  if (!mapping.account.isActive) throw new LedgerError(`The configured ${label} account is inactive`, 409);
  return mapping.account;
}

/** Validates an account chosen per-transaction (expense, revenue, or bank/cash) is postable and of the expected type. */
export async function assertAccountUsable(tx: TxClient, accountId: string, opts: { requireType?: AccountType; label: string } = { label: 'account' }) {
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account) throw new LedgerError(`${opts.label} not found`, 404);
  if (!account.isActive) throw new LedgerError(`Cannot post to inactive account "${account.code} ${account.name}"`, 409);
  if (opts.requireType && account.type !== opts.requireType) {
    throw new LedgerError(`${opts.label} must be a ${opts.requireType} account`, 400);
  }
  return account;
}

export interface AgingBuckets {
  current: Prisma.Decimal;
  d1_30: Prisma.Decimal;
  d31_60: Prisma.Decimal;
  d61_90: Prisma.Decimal;
  d90plus: Prisma.Decimal;
}

export function emptyAgingBuckets(): AgingBuckets {
  return {
    current: new Prisma.Decimal(0),
    d1_30: new Prisma.Decimal(0),
    d31_60: new Prisma.Decimal(0),
    d61_90: new Prisma.Decimal(0),
    d90plus: new Prisma.Decimal(0),
  };
}

export function addToAgingBucket(buckets: AgingBuckets, dueDate: Date, outstanding: Prisma.Decimal, asOf: Date) {
  const daysPastDue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysPastDue <= 0) buckets.current = buckets.current.plus(outstanding);
  else if (daysPastDue <= 30) buckets.d1_30 = buckets.d1_30.plus(outstanding);
  else if (daysPastDue <= 60) buckets.d31_60 = buckets.d31_60.plus(outstanding);
  else if (daysPastDue <= 90) buckets.d61_90 = buckets.d61_90.plus(outstanding);
  else buckets.d90plus = buckets.d90plus.plus(outstanding);
}

/** A record is overdue purely from its financial state — never a stored/settable status. */
export function isOverdue(dueDate: Date, outstanding: Prisma.Decimal, asOf: Date = new Date()): boolean {
  return outstanding.greaterThan(0) && dueDate.getTime() < asOf.getTime();
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/** Sequential, zero-padded document numbers (BILL-000001, INV-000001, ...). */
export async function nextDocumentNumber(prefix: string, countFn: () => Promise<number>): Promise<string> {
  const count = await countFn();
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

export interface LineItemInput {
  description: string;
  quantity?: number | string;
  unitPrice: number | string;
  productId?: string | null;
}

export interface NormalizedLineItem {
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  amount: Prisma.Decimal;
  productId: string | null;
}

/** Validates and prices a bill/invoice's line items; returns them plus the subtotal. */
export function normalizeLineItems(items: LineItemInput[]): { items: NormalizedLineItem[]; subtotal: Prisma.Decimal } {
  if (!Array.isArray(items) || items.length === 0) {
    throw new LedgerError('At least one line item is required');
  }

  let subtotal = new Prisma.Decimal(0);
  const normalized = items.map((item, idx) => {
    const label = `Item ${idx + 1}`;
    if (!item.description?.trim()) throw new LedgerError(`${label}: description is required`);

    let quantity: Prisma.Decimal;
    let unitPrice: Prisma.Decimal;
    try {
      quantity = new Prisma.Decimal(item.quantity ?? 1);
      unitPrice = new Prisma.Decimal(item.unitPrice);
    } catch {
      throw new LedgerError(`${label}: quantity/unit price must be valid numbers`);
    }

    if (quantity.lessThanOrEqualTo(0)) throw new LedgerError(`${label}: quantity must be greater than zero`);
    if (unitPrice.isNegative()) throw new LedgerError(`${label}: unit price cannot be negative`);

    const amount = quantity.times(unitPrice);
    subtotal = subtotal.plus(amount);

    return { description: item.description.trim(), quantity, unitPrice, amount, productId: item.productId || null };
  });

  return { items: normalized, subtotal };
}

export function computeTotal(subtotal: Prisma.Decimal, taxAmount: Prisma.Decimal, discountAmount: Prisma.Decimal): Prisma.Decimal {
  const total = subtotal.plus(taxAmount).minus(discountAmount);
  if (total.isNegative()) throw new LedgerError('Total amount cannot be negative (check tax/discount)');
  return total;
}

export function toDecimal(value: number | string | null | undefined, fallback = 0): Prisma.Decimal {
  try {
    return new Prisma.Decimal(value ?? fallback);
  } catch {
    throw new LedgerError('Invalid monetary amount');
  }
}
