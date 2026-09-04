import { ArInvoiceStatus, NotificationType, SystemRole } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { createNotificationIfNotDuplicate } from '../../../src/lib/notifications';

/**
 * Automated overdue-receivable reminders. Called periodically by
 * server/src/lib/notificationSweep.ts. Notifies the invoice's creator plus
 * every ADMIN — this codebase has no per-customer "account owner" concept,
 * so ADMIN + creator is the closest equivalent of "AR owner."
 *
 * Idempotent per invoice: createNotificationIfNotDuplicate skips a user who
 * already has an unread reminder for the same invoice, so re-running this
 * sweep daily doesn't spam — a fresh reminder only appears once the prior
 * one has been read (or the invoice becomes overdue by a new day and no
 * unread one exists yet).
 */
export async function generateOverdueReceivableReminders() {
  const now = new Date();
  const overdueInvoices = await prisma.customerInvoice.findMany({
    where: {
      status: { in: [ArInvoiceStatus.ISSUED, ArInvoiceStatus.PARTIALLY_PAID] },
      dueDate: { lt: now },
    },
    include: { customer: true },
  });
  if (overdueInvoices.length === 0) return { checked: 0, notified: 0 };

  const admins = await prisma.userRole.findMany({ where: { role: SystemRole.ADMIN }, select: { userId: true } });
  const recipientIds = new Set<string>(admins.map((a) => a.userId));

  let notified = 0;
  for (const invoice of overdueInvoices) {
    const outstanding = invoice.totalAmount.minus(invoice.paidAmount);
    if (outstanding.lessThanOrEqualTo(0)) continue;

    const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const ids = new Set(recipientIds);
    ids.add(invoice.createdById);

    for (const userId of ids) {
      await createNotificationIfNotDuplicate({
        userId,
        type: NotificationType.AR_OVERDUE_REMINDER,
        title: `Invoice ${invoice.invoiceNumber} is overdue`,
        message: `${invoice.customer.name} owes ${outstanding.toFixed(2)} on invoice ${invoice.invoiceNumber}, ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} past due.`,
        entityType: 'CustomerInvoice',
        entityId: invoice.id,
      });
      notified++;
    }
  }

  return { checked: overdueInvoices.length, notified };
}
