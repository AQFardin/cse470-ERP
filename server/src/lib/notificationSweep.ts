import { generateOverdueReceivableReminders } from '../../modules/financial-management/services/reminder.service';
import { generateBudgetThresholdAlerts } from '../../modules/budgeting/services/budgetAlert.service';

const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

async function runSweep() {
  try {
    const ar = await generateOverdueReceivableReminders();
    const budget = await generateBudgetThresholdAlerts();
    console.log(`[notification-sweep] AR reminders: checked ${ar.checked}, notified ${ar.notified}. Budget alerts: checked ${budget.checked}, notified ${budget.notified}.`);
  } catch (error) {
    console.error('[notification-sweep] failed:', error);
  }
}

/**
 * No cron dependency in this codebase — a plain setInterval running inside
 * the long-lived Express process is the automated mechanism for AR overdue
 * reminders and budget threshold alerts. Runs once at startup (so demo data
 * doesn't need to wait a full day to see a reminder) and then daily.
 */
export function startNotificationSweep() {
  runSweep();
  setInterval(runSweep, SWEEP_INTERVAL_MS);
}
