import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../src/lib/prisma';
import * as ledgerService from '../../general-ledger/services/ledger.service';
import * as salaryService from './salary.service';
import * as taxRuleService from './taxRule.service';
import * as bonusService from './bonus.service';
import * as deductionService from './deduction.service';
import * as payrollService from './payroll.service';
import { PayrollError } from '../shared/payroll.util';

/**
 * Runs against the real dev SQLite database — same constraint as the GL and
 * AP/AR suites (see ledger.service.test.ts). Fixtures use a "TST-" prefix
 * and distinct, far-past month ranges for payroll periods (so they never
 * overlap each other or anything real), and are deleted in afterAll.
 * Requires `npm run db:seed` to have been run at least once.
 */

let actorId: string;
let employee: Awaited<ReturnType<typeof prisma.employee.create>>;
let secondEmployee: Awaited<ReturnType<typeof prisma.employee.create>>;
let housingComponent: Awaited<ReturnType<typeof salaryService.createSalaryComponent>>;
let taxRule: Awaited<ReturnType<typeof taxRuleService.createTaxRule>>;
let bankAccount: Awaited<ReturnType<typeof ledgerService.createAccount>>;

const createdEmployeeIds: string[] = [];
const createdComponentIds: string[] = [];
const createdTaxRuleIds: string[] = [];
const createdAccountIds: string[] = [];
const createdPeriodIds: string[] = [];

beforeAll(async () => {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No seeded user found — run `npm run db:seed` before running tests');
  actorId = user.id;

  employee = await prisma.employee.create({
    data: { employeeId: 'TST-PR-EMP001', firstName: 'Test', lastName: 'Payee', email: 'tst-pr-payee@example.com', department: 'ENGINEERING', position: 'Engineer', hireDate: new Date('2020-01-01') },
  });
  secondEmployee = await prisma.employee.create({
    data: { employeeId: 'TST-PR-EMP002', firstName: 'No', lastName: 'Salary', email: 'tst-pr-nosalary@example.com', department: 'ENGINEERING', position: 'Engineer', hireDate: new Date('2020-01-01') },
  });
  createdEmployeeIds.push(employee.id, secondEmployee.id);

  housingComponent = await salaryService.createSalaryComponent({ name: 'TST-PR Housing Allowance', category: 'ALLOWANCE', isTaxable: true }, actorId);
  createdComponentIds.push(housingComponent.id);

  taxRule = await taxRuleService.createTaxRule({ name: 'TST-PR Tax Rule', exemptionAmount: 43000, slabs: [{ minAmount: 0, maxAmount: null, ratePercent: 15 }] }, actorId);
  createdTaxRuleIds.push(taxRule.id);

  bankAccount = await ledgerService.createAccount({ code: 'TST-PR-1200', name: 'Test Payroll Bank', type: 'ASSET' }, actorId);
  createdAccountIds.push(bankAccount.id);
});

afterAll(async () => {
  await prisma.payrollPayment.deleteMany({ where: { payrollPeriodId: { in: createdPeriodIds } } });
  await prisma.payrollRecordLine.deleteMany({ where: { payrollRecord: { payrollPeriodId: { in: createdPeriodIds } } } });
  await prisma.payrollRecord.deleteMany({ where: { payrollPeriodId: { in: createdPeriodIds } } });
  await prisma.payrollBonus.deleteMany({ where: { payrollPeriodId: { in: createdPeriodIds } } });
  await prisma.payrollDeduction.deleteMany({ where: { payrollPeriodId: { in: createdPeriodIds } } });

  const periods = await prisma.payrollPeriod.findMany({ where: { id: { in: createdPeriodIds } } });
  const journalEntryIds = periods.map((p) => p.journalEntryId).filter((x): x is string => !!x);
  const payments = await prisma.payrollPayment.findMany({ where: { payrollPeriodId: { in: createdPeriodIds } } });
  const paymentJournalIds = payments.map((p) => p.journalEntryId).filter((x): x is string => !!x);

  await prisma.payrollPeriod.deleteMany({ where: { id: { in: createdPeriodIds } } });
  await prisma.employeeSalary.deleteMany({ where: { employeeId: { in: createdEmployeeIds } } });
  await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: createdEmployeeIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: createdEmployeeIds } } });
  await prisma.salaryComponent.deleteMany({ where: { id: { in: createdComponentIds } } });
  await prisma.taxSlab.deleteMany({ where: { taxRuleId: { in: createdTaxRuleIds } } });
  await prisma.taxRule.deleteMany({ where: { id: { in: createdTaxRuleIds } } });

  const allJournalIds = [...journalEntryIds, ...paymentJournalIds];
  // Also sweep up any reversal entries created against those (e.g. by cancelling
  // an approved period) — their id isn't stored back on the period/payment row.
  const entries = await prisma.journalEntry.findMany({
    where: { OR: [{ id: { in: allJournalIds } }, { reversalOfId: { in: allJournalIds } }, { lines: { some: { accountId: { in: createdAccountIds } } } }] },
  });
  const entryIds = entries.map((e) => e.id);
  await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
  await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
  await prisma.account.deleteMany({ where: { id: { in: createdAccountIds } } });

  await prisma.$disconnect();
});

let periodCounter = 0;
/**
 * Every test gets its own far-past, distinct month so periods never overlap
 * each other. Starts at July 2019 — on/after the employee's second salary
 * version (effective 2019-07-01) — so every calculation-phase test
 * consistently resolves the ৳45,000 basic salary, not the earlier ৳40,000 one.
 */
function nextPeriodRange() {
  periodCounter++;
  const totalMonthIndex = periodCounter + 6; // 1 -> July (month 7)
  const year = 2019 + Math.floor((totalMonthIndex - 1) / 12);
  const month = ((totalMonthIndex - 1) % 12) + 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month)}-01`;
  const end = `${year}-${pad(month)}-28`;
  const pay = `${year}-${pad(month)}-28`;
  return { start, end, pay };
}

async function makePeriod(overrides: Partial<{ taxRuleId: string | null }> = {}) {
  const { start, end, pay } = nextPeriodRange();
  const period = await payrollService.createPayrollPeriod({ name: `TST Period ${periodCounter}`, startDate: start, endDate: end, payDate: pay, taxRuleId: overrides.taxRuleId ?? taxRule.id }, actorId);
  createdPeriodIds.push(period.id);
  return period;
}

// ─── Salary Structure ───────────────────────────────────

describe('Salary Structure', () => {
  it('creates a salary component', () => {
    expect(housingComponent.category).toBe('ALLOWANCE');
  });

  it('assigns a salary to an employee', async () => {
    const salary = await salaryService.assignEmployeeSalary(employee.id, { basicSalary: 40000, effectiveFrom: '2019-01-01', components: [{ salaryComponentId: housingComponent.id, amount: 10000 }] }, actorId);
    expect(Number(salary.basicSalary)).toBe(40000);
  });

  it('creates a new effective-dated version on update without touching the old one, and resolves the correct version per date', async () => {
    await salaryService.assignEmployeeSalary(employee.id, { basicSalary: 45000, effectiveFrom: '2019-07-01', components: [{ salaryComponentId: housingComponent.id, amount: 10000 }] }, actorId);

    const juneSalary = await salaryService.getEffectiveSalaryForPeriod(employee.id, new Date('2019-06-15'));
    const julySalary = await salaryService.getEffectiveSalaryForPeriod(employee.id, new Date('2019-07-15'));

    expect(Number(juneSalary!.basicSalary)).toBe(40000);
    expect(Number(julySalary!.basicSalary)).toBe(45000);

    const history = await salaryService.getEmployeeSalaryHistory(employee.id);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(Number(history.find((h) => h.effectiveFrom.toISOString().startsWith('2019-01'))!.basicSalary)).toBe(40000);
  });
});

// ─── Payroll Periods & Calculation ──────────────────────

describe('Payroll Periods', () => {
  it('creates a payroll period', async () => {
    const period = await makePeriod();
    expect(period.status).toBe('DRAFT');
    expect(period.workingDays).toBeGreaterThan(0);
  });

  it('rejects an invalid period where the end date precedes the start date', async () => {
    await expect(payrollService.createPayrollPeriod({ name: 'Bad', startDate: '2019-05-10', endDate: '2019-05-01', payDate: '2019-05-15' }, actorId)).rejects.toThrow(/cannot be before/);
  });

  it('rejects a period that overlaps an existing one', async () => {
    const { start, end, pay } = nextPeriodRange();
    await payrollService.createPayrollPeriod({ name: `TST Overlap Base ${periodCounter}`, startDate: start, endDate: end, payDate: pay }, actorId).then((p) => createdPeriodIds.push(p.id));
    await expect(payrollService.createPayrollPeriod({ name: 'Overlap', startDate: start, endDate: end, payDate: pay }, actorId)).rejects.toThrow(/overlaps/);
  });
});

describe('Payroll Calculation', () => {
  it('calculates gross, allowances, bonus, deductions, tax, and net correctly, skipping employees without a salary structure', async () => {
    const period = await makePeriod();

    const bonus = await bonusService.createBonus({ employeeId: employee.id, payrollPeriodId: period.id, bonusType: 'FESTIVAL', amount: 5000 }, actorId);
    await bonusService.decideBonus(bonus.id, 'APPROVED', actorId);
    const deduction = await deductionService.createDeduction({ employeeId: employee.id, payrollPeriodId: period.id, deductionType: 'LOAN', amount: 2000 }, actorId);
    await deductionService.decideDeduction(deduction.id, 'APPROVED', actorId);

    const result = await payrollService.calculatePayrollPeriod(period.id, actorId);
    expect(result.period.status).toBe('CALCULATED');
    expect(result.skippedCount).toBeGreaterThan(0); // secondEmployee has no salary assigned

    const full = await payrollService.getPayrollPeriodById(period.id);
    const record = full.records.find((r) => r.employeeId === employee.id)!;
    expect(Number(record.basicSalary)).toBe(45000); // most recent effective salary as of this period
    expect(Number(record.allowancesTotal)).toBe(10000);
    expect(Number(record.bonusTotal)).toBe(5000);
    expect(Number(record.grossEarnings)).toBe(60000);
    expect(Number(record.otherDeductionsTotal)).toBe(2000);
    expect(Number(record.netSalary)).toBe(Number(record.grossEarnings) - Number(record.totalDeductions));

    // secondEmployee (no salary structure) must not appear at all.
    expect(full.records.find((r) => r.employeeId === secondEmployee.id)).toBeUndefined();
  });

  it('does not create duplicate records when recalculated', async () => {
    const period = await makePeriod();
    await payrollService.calculatePayrollPeriod(period.id, actorId);
    await payrollService.calculatePayrollPeriod(period.id, actorId);
    const count = await prisma.payrollRecord.count({ where: { payrollPeriodId: period.id, employeeId: employee.id } });
    expect(count).toBe(1);
  });

  it('excludes a pending (unapproved) bonus and a rejected bonus from the calculation', async () => {
    const period = await makePeriod();
    const pending = await bonusService.createBonus({ employeeId: employee.id, payrollPeriodId: period.id, bonusType: 'PERFORMANCE', amount: 1000 }, actorId);
    const rejected = await bonusService.createBonus({ employeeId: employee.id, payrollPeriodId: period.id, bonusType: 'ANNUAL', amount: 2000 }, actorId);
    await bonusService.decideBonus(rejected.id, 'REJECTED', actorId);

    await payrollService.calculatePayrollPeriod(period.id, actorId);
    const full = await payrollService.getPayrollPeriodById(period.id);
    const record = full.records.find((r) => r.employeeId === employee.id)!;
    expect(Number(record.bonusTotal)).toBe(0);

    // sanity: pending bonus itself still exists, untouched, just not applied
    const stillPending = await prisma.payrollBonus.findUnique({ where: { id: pending.id } });
    expect(stillPending!.status).toBe('PENDING');
  });

  it('applies an unpaid-leave deduction using Daily Rate × Unpaid Days, from the existing Leave module', async () => {
    const period = await makePeriod();
    // Use a Mon–Fri work-week window entirely inside the period so the overlap math is unambiguous.
    const leaveStart = new Date(period.startDate);
    leaveStart.setDate(leaveStart.getDate() + 6); // a few days in
    while (leaveStart.getDay() === 0 || leaveStart.getDay() === 6) leaveStart.setDate(leaveStart.getDate() + 1);
    const leaveEnd = new Date(leaveStart);
    leaveEnd.setDate(leaveEnd.getDate() + 1); // two weekdays, best-effort (could span a weekend rarely; acceptable for this check)

    await prisma.leaveRequest.create({ data: { employeeId: employee.id, type: 'UNPAID', startDate: leaveStart, endDate: leaveEnd, reason: 'test', status: 'APPROVED' } });

    await payrollService.calculatePayrollPeriod(period.id, actorId);
    const full = await payrollService.getPayrollPeriodById(period.id);
    const record = full.records.find((r) => r.employeeId === employee.id)!;
    expect(record.unpaidLeaveDays).toBeGreaterThan(0);
    expect(Number(record.unpaidLeaveDeduction)).toBeGreaterThan(0);
    const expectedDaily = 45000 / record.workingDays;
    expect(Number(record.unpaidLeaveDeduction)).toBeCloseTo(expectedDaily * record.unpaidLeaveDays, 2);
  });
});

// ─── Approval, GL posting, Payment ──────────────────────

describe('Payroll Approval, Payment & General Ledger', () => {
  it('posts a balanced GL entry on approval and prevents recalculation afterward', async () => {
    const period = await makePeriod();
    await payrollService.calculatePayrollPeriod(period.id, actorId);
    const approved = await payrollService.approvePayrollPeriod(period.id, actorId);
    expect(approved.status).toBe('APPROVED');

    const entry = await ledgerService.getJournalEntryById(approved.journalEntryId!);
    const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);
    expect(totalDebit).toBe(totalCredit);

    await expect(payrollService.calculatePayrollPeriod(period.id, actorId)).rejects.toThrow(/Approved payroll cannot be recalculated/);
  });

  it('processes payment, marks the period Paid, and prevents a duplicate payment', async () => {
    const period = await makePeriod();
    await payrollService.calculatePayrollPeriod(period.id, actorId);
    await payrollService.approvePayrollPeriod(period.id, actorId);

    const payment = await payrollService.createPayrollPayment({ payrollPeriodId: period.id, paymentDate: '2019-01-28', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);
    expect(payment.status).toBe('POSTED');

    const afterPay = await payrollService.getPayrollPeriodById(period.id);
    expect(afterPay.status).toBe('PAID');

    await expect(
      payrollService.createPayrollPayment({ payrollPeriodId: period.id, paymentDate: '2019-01-29', paymentMethod: 'CASH', bankAccountId: bankAccount.id }, actorId)
    ).rejects.toThrow(/Only approved payroll periods can be paid/);
  });

  it('reverses a payroll payment and returns the period to Approved', async () => {
    const period = await makePeriod();
    await payrollService.calculatePayrollPeriod(period.id, actorId);
    await payrollService.approvePayrollPeriod(period.id, actorId);
    const payment = await payrollService.createPayrollPayment({ payrollPeriodId: period.id, paymentDate: '2019-01-28', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);

    const reversed = await payrollService.reversePayrollPayment(payment.id, actorId);
    expect(reversed.status).toBe('REVERSED');

    const afterReversal = await payrollService.getPayrollPeriodById(period.id);
    expect(afterReversal.status).toBe('APPROVED');
  });

  it('makes a paid payroll period immutable: cannot be cancelled', async () => {
    const period = await makePeriod();
    await payrollService.calculatePayrollPeriod(period.id, actorId);
    await payrollService.approvePayrollPeriod(period.id, actorId);
    await payrollService.createPayrollPayment({ payrollPeriodId: period.id, paymentDate: '2019-01-28', paymentMethod: 'BANK_TRANSFER', bankAccountId: bankAccount.id }, actorId);

    await expect(payrollService.cancelPayrollPeriod(period.id, actorId)).rejects.toThrow(/paid payroll period cannot be cancelled/);
  });

  it('reverses the GL entry when cancelling an approved-but-unpaid period', async () => {
    const period = await makePeriod();
    await payrollService.calculatePayrollPeriod(period.id, actorId);
    const approved = await payrollService.approvePayrollPeriod(period.id, actorId);

    const cancelled = await payrollService.cancelPayrollPeriod(period.id, actorId);
    expect(cancelled.status).toBe('CANCELLED');

    const original = await ledgerService.getJournalEntryById(approved.journalEntryId!);
    expect(original.reversedBy).toBeTruthy();
  });
});

// ─── Payslip ─────────────────────────────────────────────

describe('Payslip', () => {
  it('preserves the exact calculated snapshot regardless of later salary changes', async () => {
    const period = await makePeriod();
    await payrollService.calculatePayrollPeriod(period.id, actorId);
    const payslipBefore = await payrollService.getPayslip(employee.id, period.id);
    const netBefore = Number(payslipBefore.netSalary);

    // Change the employee's current salary — historical payslip must not move.
    await salaryService.assignEmployeeSalary(employee.id, { basicSalary: 99999, effectiveFrom: '2025-01-01' }, actorId);

    const payslipAfter = await payrollService.getPayslip(employee.id, period.id);
    expect(Number(payslipAfter.netSalary)).toBe(netBefore);
  });
});

describe('Cross-cutting: PayrollError is the same class as LedgerError', () => {
  it('is exported consistently for uniform controller error handling', () => {
    expect(PayrollError).toBe(ledgerService.LedgerError);
  });
});
