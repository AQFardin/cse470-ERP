import { BudgetStatus, NotificationType } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { createNotificationIfNotDuplicate } from '../../../src/lib/notifications';
import { getBudgetVsActual } from './budgetAnalysis.service';

/**
 * Automated budget-threshold alerts. Called periodically by
 * server/src/lib/notificationSweep.ts. For every ACTIVE budget, compares
 * live actuals (via the existing getBudgetVsActual analysis, which reads
 * posted GL journal lines — no separate actuals copy) against the budget's
 * own configurable alertThresholdPercent, and notifies its owner
 * (createdBy, plus approvedBy if different) once utilization crosses it.
 *
 * Idempotent per budget via createNotificationIfNotDuplicate — a fresh
 * alert only fires again once the previous one has been read.
 */
export async function generateBudgetThresholdAlerts() {
  const activeBudgets = await prisma.budget.findMany({
    where: { status: BudgetStatus.ACTIVE },
    select: { id: true, name: true, alertThresholdPercent: true, createdById: true, approvedById: true },
  });
  if (activeBudgets.length === 0) return { checked: 0, notified: 0 };

  let notified = 0;
  for (const budget of activeBudgets) {
    const vsActual = await getBudgetVsActual(budget.id);
    const utilizationPercent = vsActual.totals.utilizationPercent;
    if (utilizationPercent === null || utilizationPercent < Number(budget.alertThresholdPercent)) continue;

    const recipientIds = new Set<string>([budget.createdById]);
    if (budget.approvedById) recipientIds.add(budget.approvedById);

    for (const userId of recipientIds) {
      await createNotificationIfNotDuplicate({
        userId,
        type: NotificationType.BUDGET_THRESHOLD_ALERT,
        title: `Budget "${budget.name}" is at ${utilizationPercent.toFixed(0)}% utilization`,
        message: `Spending on "${budget.name}" has reached ${utilizationPercent.toFixed(1)}% of its annual amount, at or above its ${Number(budget.alertThresholdPercent).toFixed(0)}% alert threshold.`,
        entityType: 'Budget',
        entityId: budget.id,
      });
      notified++;
    }
  }

  return { checked: activeBudgets.length, notified };
}
