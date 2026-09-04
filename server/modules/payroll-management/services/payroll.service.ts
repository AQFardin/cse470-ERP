import { Prisma, PayrollPeriodStatus, PaymentMethod, PaymentRecordStatus, AccountMappingKey, AccountType, EmployeeStatus, LeaveType, LeaveStatus } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { logAudit } from '../../../src/lib/auditLog';
import * as ledgerService from '../../general-ledger/services/ledger.service';
import { resolveControlAccount, assertAccountUsable } from '../../financial-management/shared/finance.util';
import { PayrollError, toDecimal, countWeekdays, countOverlapWeekdays, weekdayRange, calculateProgressiveTax } from '../shared/payroll.util';

type TxClient = Prisma.TransactionClient;

// ─── Payroll Periods ──────────────────────────────────────

export interface PayrollPeriodInput {
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  payDate: string | Date;
  workingDays?: number;
  taxRuleId?: string | null;
}

export async function listPayrollPeriods(filters: { status?: PayrollPeriodStatus; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const where: Prisma.PayrollPeriodWhereInput = filters.status ? { status: filters.status } : {};

  const [total, periods] = await Promise.all([
    prisma.payrollPeriod.count({ where }),
    prisma.payrollPeriod.findMany({
      where,
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { records: true } }, payment: { select: { id: true, status: true, paymentDate: true } } },
    }),
  ]);
  return { periods, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

export async function getPayrollPeriodById(id: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: {
      taxRule: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      journalEntry: { select: { id: true, entryNumber: true, status: true } },
      payment: { include: { bankAccount: { select: { id: true, code: true, name: true } } } },
      records: {
        include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } } },
        orderBy: { employee: { firstName: 'asc' } },
      },
    },
  });
  if (!period) throw new PayrollError('Payroll period not found', 404);
  return period;
}

export async function createPayrollPeriod(input: PayrollPeriodInput, actorId: string) {
  if (!input.name?.trim()) throw new PayrollError('Period name is required');
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const payDate = new Date(input.payDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(payDate.getTime())) throw new PayrollError('Invalid start/end/pay date');
  if (endDate < startDate) throw new PayrollError('End date cannot be before the start date');

  const overlapping = await prisma.payrollPeriod.findFirst({
    where: { status: { not: PayrollPeriodStatus.CANCELLED }, startDate: { lte: endDate }, endDate: { gte: startDate } },
  });
  if (overlapping) throw new PayrollError(`This date range overlaps an existing payroll period ("${overlapping.name}")`, 409);

  if (input.taxRuleId) {
    const rule = await prisma.taxRule.findUnique({ where: { id: input.taxRuleId } });
    if (!rule) throw new PayrollError('Tax rule not found', 404);
    if (!rule.isActive) throw new PayrollError('Cannot use an inactive tax rule', 409);
  }

  const workingDays = input.workingDays && input.workingDays > 0 ? input.workingDays : countWeekdays(startDate, endDate);

  const period = await prisma.payrollPeriod.create({
    data: { name: input.name.trim(), startDate, endDate, payDate, workingDays, taxRuleId: input.taxRuleId || null, createdById: actorId },
  });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'PayrollPeriod', targetId: period.id, after: period });
  return period;
}

export async function cancelPayrollPeriod(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const period = await tx.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new PayrollError('Payroll period not found', 404);
    if (period.status === PayrollPeriodStatus.PAID) throw new PayrollError('A paid payroll period cannot be cancelled', 409);
    if (period.status === PayrollPeriodStatus.CANCELLED) throw new PayrollError('Payroll period is already cancelled', 409);

    let reversalId: string | null = null;
    if (period.status === PayrollPeriodStatus.APPROVED && period.journalEntryId) {
      const { reversal } = await ledgerService.reverseJournalEntryInTx(tx, period.journalEntryId, actorId, {
        description: `Reversal — cancelled payroll period ${period.name}`,
      });
      reversalId = reversal.id;
    }

    const updated = await tx.payrollPeriod.update({ where: { id }, data: { status: PayrollPeriodStatus.CANCELLED } });
    return { before: period, after: updated, reversalId };
  });

  if (result.reversalId) {
    await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.reversalId, after: { reversalOfPayrollPeriod: result.after.name } });
  }
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'PayrollPeriod', targetId: id, before: { status: result.before.status }, after: { status: 'CANCELLED' } });
  return result.after;
}

// ─── Calculation ──────────────────────────────────────────

interface RecordLineDraft {
  category: 'BASIC' | 'ALLOWANCE' | 'BONUS' | 'DEDUCTION' | 'TAX' | 'UNPAID_LEAVE';
  name: string;
  amount: Prisma.Decimal;
}

export async function calculatePayrollPeriod(id: string, actorId: string) {
  const summary = await prisma.$transaction(async (tx) => {
    const period = await tx.payrollPeriod.findUnique({ where: { id }, include: { taxRule: { include: { slabs: true } } } });
    if (!period) throw new PayrollError('Payroll period not found', 404);
    if (period.status === PayrollPeriodStatus.APPROVED) throw new PayrollError('Approved payroll cannot be recalculated — cancel it first if changes are needed', 409);
    if (period.status === PayrollPeriodStatus.PAID) throw new PayrollError('A paid payroll period cannot be recalculated', 409);
    if (period.status === PayrollPeriodStatus.CANCELLED) throw new PayrollError('A cancelled payroll period cannot be calculated', 409);

    // Recalculating a previously-calculated period replaces its records.
    const existingRecordIds = (await tx.payrollRecord.findMany({ where: { payrollPeriodId: id }, select: { id: true } })).map((r) => r.id);
    await tx.payrollRecordLine.deleteMany({ where: { payrollRecordId: { in: existingRecordIds } } });
    await tx.payrollRecord.deleteMany({ where: { payrollPeriodId: id } });

    const employees = await tx.employee.findMany({ where: { status: { in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE] } } });
    const [approvedBonuses, approvedDeductions, activeTaxRules] = await Promise.all([
      tx.payrollBonus.findMany({ where: { payrollPeriodId: id, status: 'APPROVED' } }),
      tx.payrollDeduction.findMany({ where: { payrollPeriodId: id, status: 'APPROVED' } }),
      tx.taxRule.findMany({ where: { isActive: true }, include: { slabs: true } }),
    ]);
    // Per-employee statutory tax rule resolution: an employee's own region's
    // rule wins if one exists; otherwise fall back to whatever rule the period
    // itself was assigned; otherwise a national (region-less) active rule.
    const nationalDefaultTaxRule = activeTaxRules.find((r) => !r.region) ?? null;
    function resolveTaxRuleForEmployee(employeeRegion: string | null) {
      if (employeeRegion) {
        const regional = activeTaxRules.find((r) => r.region === employeeRegion);
        if (regional) return regional;
      }
      return period!.taxRule ?? nationalDefaultTaxRule;
    }

    let processedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      const salary = await tx.employeeSalary.findFirst({
        where: { employeeId: emp.id, effectiveFrom: { lte: period.startDate } },
        orderBy: { effectiveFrom: 'desc' },
        include: { components: { include: { salaryComponent: true } } },
      });
      if (!salary) { skippedCount++; continue; }

      const lines: RecordLineDraft[] = [{ category: 'BASIC', name: 'Basic Salary', amount: salary.basicSalary }];
      let allowancesTotal = new Prisma.Decimal(0);
      let taxableAllowances = new Prisma.Decimal(0);
      for (const comp of salary.components) {
        if (comp.salaryComponent.category !== 'ALLOWANCE' || !comp.salaryComponent.isActive) continue;
        lines.push({ category: 'ALLOWANCE', name: comp.salaryComponent.name, amount: comp.amount });
        allowancesTotal = allowancesTotal.plus(comp.amount);
        if (comp.salaryComponent.isTaxable) taxableAllowances = taxableAllowances.plus(comp.amount);
      }

      let bonusTotal = new Prisma.Decimal(0);
      for (const b of approvedBonuses.filter((x) => x.employeeId === emp.id)) {
        lines.push({ category: 'BONUS', name: `${b.bonusType} Bonus`, amount: b.amount });
        bonusTotal = bonusTotal.plus(b.amount);
      }

      const grossEarnings = salary.basicSalary.plus(allowancesTotal).plus(bonusTotal);

      // Reuse the existing Leave module's own approval workflow — only APPROVED
      // UNPAID leave requests reduce pay, per spec section 7's formula.
      const unpaidLeaves = await tx.leaveRequest.findMany({
        where: { employeeId: emp.id, type: LeaveType.UNPAID, status: LeaveStatus.APPROVED, startDate: { lte: period.endDate }, endDate: { gte: period.startDate } },
      });
      let unpaidLeaveDays = 0;
      const unpaidLeaveDates = new Set<string>();
      for (const lr of unpaidLeaves) {
        unpaidLeaveDays += countOverlapWeekdays(lr.startDate, lr.endDate, period.startDate, period.endDate);
        for (const d of weekdayRange(lr.startDate, lr.endDate, period.startDate, period.endDate)) unpaidLeaveDates.add(d);
      }
      const dailyRate = period.workingDays > 0 ? salary.basicSalary.dividedBy(period.workingDays) : new Prisma.Decimal(0);
      const unpaidLeaveDeduction = dailyRate.times(unpaidLeaveDays);
      if (unpaidLeaveDeduction.greaterThan(0)) lines.push({ category: 'UNPAID_LEAVE', name: `Unpaid Leave (${unpaidLeaveDays} day${unpaidLeaveDays === 1 ? '' : 's'})`, amount: unpaidLeaveDeduction });

      // Attendance & Leave Tracking integration: unrecorded absences (no
      // approved-leave coverage) also dock pay, at half-rate for HALF_DAY.
      // Days already deducted as unpaid leave above are never double-counted.
      const attendanceLogs = await tx.attendanceLog.findMany({
        where: { employeeId: emp.id, date: { gte: period.startDate, lte: period.endDate }, status: { in: ['ABSENT', 'HALF_DAY'] } },
      });
      let attendanceDeductionDays = new Prisma.Decimal(0);
      let unrecordedAbsences = 0;
      for (const log of attendanceLogs) {
        const dateKey = log.date.toISOString().split('T')[0];
        if (unpaidLeaveDates.has(dateKey)) continue;
        const day = log.date.getDay();
        if (day === 0 || day === 6) continue; // weekends aren't working days
        attendanceDeductionDays = attendanceDeductionDays.plus(log.status === 'HALF_DAY' ? 0.5 : 1);
        unrecordedAbsences++;
      }
      const attendanceDeduction = dailyRate.times(attendanceDeductionDays);
      if (attendanceDeduction.greaterThan(0)) {
        lines.push({ category: 'UNPAID_LEAVE', name: `Attendance Deduction (${unrecordedAbsences} unrecorded absence day${unrecordedAbsences === 1 ? '' : 's'})`, amount: attendanceDeduction });
      }

      let taxableIncome = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);
      const applicableTaxRule = resolveTaxRuleForEmployee(emp.region);
      if (applicableTaxRule) {
        const rawTaxable = salary.basicSalary.plus(taxableAllowances).plus(bonusTotal);
        taxableIncome = Prisma.Decimal.max(rawTaxable.minus(applicableTaxRule.exemptionAmount), 0);
        taxAmount = calculateProgressiveTax(taxableIncome, applicableTaxRule.slabs);
      }
      if (taxAmount.greaterThan(0)) lines.push({ category: 'TAX', name: `Income Tax${applicableTaxRule?.region ? ` (${applicableTaxRule.region})` : ''}`, amount: taxAmount });

      let otherDeductionsTotal = new Prisma.Decimal(0);
      for (const d of approvedDeductions.filter((x) => x.employeeId === emp.id)) {
        lines.push({ category: 'DEDUCTION', name: d.deductionType, amount: d.amount });
        otherDeductionsTotal = otherDeductionsTotal.plus(d.amount);
      }

      const totalDeductions = taxAmount.plus(otherDeductionsTotal).plus(unpaidLeaveDeduction).plus(attendanceDeduction);
      const netSalary = grossEarnings.minus(totalDeductions);
      if (netSalary.isNegative()) {
        throw new PayrollError(`Net salary for ${emp.firstName} ${emp.lastName} would be negative (deductions of ${totalDeductions.toFixed(2)} exceed gross earnings of ${grossEarnings.toFixed(2)})`, 400);
      }

      await tx.payrollRecord.create({
        data: {
          payrollPeriodId: id,
          employeeId: emp.id,
          departmentSnapshot: emp.department,
          positionSnapshot: emp.position,
          basicSalary: salary.basicSalary,
          allowancesTotal,
          bonusTotal,
          grossEarnings,
          taxableIncome,
          taxAmount,
          // Attendance-driven deductions (unrecorded absences) are folded into
          // the same unpaidLeaveDeduction/unpaidLeaveDays summary fields as
          // approved unpaid leave — both dock pay for days not worked; the
          // itemized `lines` breakdown still lists them as separate entries.
          unpaidLeaveDeduction: unpaidLeaveDeduction.plus(attendanceDeduction),
          otherDeductionsTotal,
          totalDeductions,
          netSalary,
          workingDays: period.workingDays,
          unpaidLeaveDays: unpaidLeaveDays + Math.round(attendanceDeductionDays.toNumber()),
          lines: { create: lines },
        },
      });
      processedCount++;
    }

    if (processedCount === 0) {
      throw new PayrollError('No eligible employees with an assigned salary structure were found for this period', 400);
    }

    const updated = await tx.payrollPeriod.update({ where: { id }, data: { status: PayrollPeriodStatus.CALCULATED, calculatedAt: new Date() } });
    return { period: updated, processedCount, skippedCount };
  });

  await logAudit({
    actorId,
    action: 'UPDATE',
    targetEntity: 'PayrollPeriod',
    targetId: id,
    after: { status: 'CALCULATED', processedCount: summary.processedCount, skippedCount: summary.skippedCount },
  });
  return summary;
}

// ─── Approval (posts to General Ledger) ───────────────────

export async function approvePayrollPeriod(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const period = await tx.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new PayrollError('Payroll period not found', 404);
    if (period.status !== PayrollPeriodStatus.CALCULATED) throw new PayrollError('Only calculated payroll periods can be approved', 409);

    const records = await tx.payrollRecord.findMany({ where: { payrollPeriodId: id } });
    if (records.length === 0) throw new PayrollError('This payroll period has no calculated records', 409);

    let salaryExpense = new Prisma.Decimal(0);
    let bonusExpense = new Prisma.Decimal(0);
    let taxPayable = new Prisma.Decimal(0);
    let otherPayable = new Prisma.Decimal(0);
    let salaryPayable = new Prisma.Decimal(0);

    for (const r of records) {
      // Salary expense = what the company actually incurred: basic + allowances,
      // net of any unpaid-leave days (which were never earned, so never expensed).
      salaryExpense = salaryExpense.plus(r.basicSalary).plus(r.allowancesTotal).minus(r.unpaidLeaveDeduction);
      bonusExpense = bonusExpense.plus(r.bonusTotal);
      taxPayable = taxPayable.plus(r.taxAmount);
      otherPayable = otherPayable.plus(r.otherDeductionsTotal);
      salaryPayable = salaryPayable.plus(r.netSalary);
    }

    const salaryExpenseAccount = await resolveControlAccount(tx, AccountMappingKey.SALARY_EXPENSE, 'Salary Expense');
    const salaryPayableAccount = await resolveControlAccount(tx, AccountMappingKey.SALARY_PAYABLE, 'Salary Payable');

    const lines: { accountId: string; debit?: Prisma.Decimal; credit?: Prisma.Decimal; description: string }[] = [
      { accountId: salaryExpenseAccount.id, debit: salaryExpense, description: `Salary expense — ${period.name}` },
    ];
    if (bonusExpense.greaterThan(0)) {
      const bonusExpenseAccount = await resolveControlAccount(tx, AccountMappingKey.BONUS_EXPENSE, 'Bonus Expense');
      lines.push({ accountId: bonusExpenseAccount.id, debit: bonusExpense, description: `Bonus expense — ${period.name}` });
    }
    if (taxPayable.greaterThan(0)) {
      const taxPayableAccount = await resolveControlAccount(tx, AccountMappingKey.TAX_PAYABLE, 'Tax Payable');
      lines.push({ accountId: taxPayableAccount.id, credit: taxPayable, description: `Payroll tax withheld — ${period.name}` });
    }
    if (otherPayable.greaterThan(0)) {
      const otherPayableAccount = await resolveControlAccount(tx, AccountMappingKey.OTHER_DEDUCTION_PAYABLE, 'Other Deduction Payable');
      lines.push({ accountId: otherPayableAccount.id, credit: otherPayable, description: `Payroll deductions withheld — ${period.name}` });
    }
    lines.push({ accountId: salaryPayableAccount.id, credit: salaryPayable, description: `Net salary payable — ${period.name}` });

    const journalEntry = await ledgerService.postAccountingEntry(
      { transactionDate: period.payDate, description: `Payroll posting — ${period.name}`, lines },
      actorId,
      tx
    );

    const updated = await tx.payrollPeriod.update({
      where: { id },
      data: { status: PayrollPeriodStatus.APPROVED, approvedById: actorId, approvedAt: new Date(), journalEntryId: journalEntry.id },
    });

    return { before: period, after: updated, journalEntry };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.journalEntry.id, after: { forPayrollPeriod: result.after.name, entryNumber: result.journalEntry.entryNumber } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'PayrollPeriod', targetId: id, before: { status: result.before.status }, after: { status: result.after.status } });
  return result.after;
}

// ─── Payment ──────────────────────────────────────────────

export interface PayrollPaymentInput {
  payrollPeriodId: string;
  paymentDate: string | Date;
  paymentMethod: PaymentMethod;
  bankAccountId: string;
  referenceNumber?: string;
}

export async function createPayrollPayment(input: PayrollPaymentInput, actorId: string) {
  const paymentDate = new Date(input.paymentDate);
  if (isNaN(paymentDate.getTime())) throw new PayrollError('Invalid payment date');

  const result = await prisma.$transaction(async (tx) => {
    const period = await tx.payrollPeriod.findUnique({ where: { id: input.payrollPeriodId }, include: { records: true, payment: true } });
    if (!period) throw new PayrollError('Payroll period not found', 404);
    if (period.status !== PayrollPeriodStatus.APPROVED) throw new PayrollError('Only approved payroll periods can be paid', 409);
    if (period.payment) throw new PayrollError('This payroll period has already been paid', 409);

    await assertAccountUsable(tx, input.bankAccountId, { requireType: AccountType.ASSET, label: 'Payment account' });

    const totalNetSalary = period.records.reduce((sum, r) => sum.plus(r.netSalary), new Prisma.Decimal(0));
    if (totalNetSalary.lessThanOrEqualTo(0)) throw new PayrollError('There is nothing to pay for this payroll period', 409);

    const salaryPayableAccount = await resolveControlAccount(tx, AccountMappingKey.SALARY_PAYABLE, 'Salary Payable');

    const journalEntry = await ledgerService.postAccountingEntry(
      {
        transactionDate: paymentDate,
        description: `Payroll payment — ${period.name}`,
        lines: [
          { accountId: salaryPayableAccount.id, debit: totalNetSalary, description: `Payroll payment — ${period.name}` },
          { accountId: input.bankAccountId, credit: totalNetSalary, description: `Payroll payment — ${period.name}` },
        ],
      },
      actorId,
      tx
    );

    const payment = await tx.payrollPayment.create({
      data: {
        payrollPeriodId: period.id,
        amount: totalNetSalary,
        paymentDate,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || null,
        bankAccountId: input.bankAccountId,
        journalEntryId: journalEntry.id,
        createdById: actorId,
      },
      include: { bankAccount: { select: { id: true, code: true, name: true } } },
    });

    await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: PayrollPeriodStatus.PAID } });

    return { payment, journalEntry, periodName: period.name };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.journalEntry.id, after: { forPayrollPayment: result.payment.id, entryNumber: result.journalEntry.entryNumber } });
  await logAudit({ actorId, action: 'CREATE', targetEntity: 'PayrollPayment', targetId: result.payment.id, after: result.payment });
  return result.payment;
}

export async function reversePayrollPayment(id: string, actorId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payrollPayment.findUnique({ where: { id }, include: { payrollPeriod: true } });
    if (!payment) throw new PayrollError('Payroll payment not found', 404);
    if (payment.status === PaymentRecordStatus.REVERSED) throw new PayrollError('This payment has already been reversed', 409);
    if (!payment.journalEntryId) throw new PayrollError('This payment has no linked journal entry to reverse', 409);

    const { reversal } = await ledgerService.reverseJournalEntryInTx(tx, payment.journalEntryId, actorId, {
      description: `Reversal — payroll payment for ${payment.payrollPeriod.name}`,
    });

    const now = new Date();
    const updatedPayment = await tx.payrollPayment.update({ where: { id }, data: { status: PaymentRecordStatus.REVERSED, reversedById: actorId, reversedAt: now } });
    await tx.payrollPeriod.update({ where: { id: payment.payrollPeriodId }, data: { status: PayrollPeriodStatus.APPROVED } });

    return { updatedPayment, reversal };
  });

  await logAudit({ actorId, action: 'CREATE', targetEntity: 'JournalEntry', targetId: result.reversal.id, after: { reversalOfPayrollPayment: result.updatedPayment.id } });
  await logAudit({ actorId, action: 'UPDATE', targetEntity: 'PayrollPayment', targetId: id, before: { status: 'POSTED' }, after: { status: 'REVERSED' } });
  return result.updatedPayment;
}

export async function listPayrollPayments(filters: { payrollPeriodId?: string; status?: PaymentRecordStatus } = {}) {
  return prisma.payrollPayment.findMany({
    where: { ...(filters.payrollPeriodId ? { payrollPeriodId: filters.payrollPeriodId } : {}), ...(filters.status ? { status: filters.status } : {}) },
    include: { payrollPeriod: { select: { id: true, name: true } }, bankAccount: { select: { id: true, code: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    orderBy: { paymentDate: 'desc' },
  });
}

// ─── Payslip ──────────────────────────────────────────────

export async function getPayslip(employeeId: string, payrollPeriodId: string) {
  const record = await prisma.payrollRecord.findUnique({
    where: { payrollPeriodId_employeeId: { payrollPeriodId, employeeId } },
    include: {
      employee: { select: { id: true, employeeId: true, firstName: true, lastName: true, department: true, position: true } },
      payrollPeriod: { select: { id: true, name: true, startDate: true, endDate: true, payDate: true, status: true } },
      lines: true,
    },
  });
  if (!record) throw new PayrollError('No payslip found for this employee in this period', 404);
  return record;
}

// ─── Dashboard & Reports ───────────────────────────────────

export async function getPayrollDashboard() {
  const current = await prisma.payrollPeriod.findFirst({
    where: { status: { in: [PayrollPeriodStatus.DRAFT, PayrollPeriodStatus.CALCULATED, PayrollPeriodStatus.APPROVED] } },
    orderBy: { startDate: 'desc' },
    include: { records: true },
  });
  const pendingApprovalCount = await prisma.payrollPeriod.count({ where: { status: PayrollPeriodStatus.CALCULATED } });
  const paidPeriods = await prisma.payrollPeriod.findMany({ where: { status: PayrollPeriodStatus.PAID }, include: { records: true } });

  const currentSummary = current
    ? current.records.reduce(
        (acc, r) => ({
          employeesProcessed: acc.employeesProcessed + 1,
          totalGrossSalary: acc.totalGrossSalary.plus(r.grossEarnings),
          totalTax: acc.totalTax.plus(r.taxAmount),
          totalDeductions: acc.totalDeductions.plus(r.totalDeductions),
          totalNetSalary: acc.totalNetSalary.plus(r.netSalary),
        }),
        { employeesProcessed: 0, totalGrossSalary: new Prisma.Decimal(0), totalTax: new Prisma.Decimal(0), totalDeductions: new Prisma.Decimal(0), totalNetSalary: new Prisma.Decimal(0) }
      )
    : null;

  const totalPaidNet = paidPeriods.reduce((sum, p) => sum.plus(p.records.reduce((s, r) => s.plus(r.netSalary), new Prisma.Decimal(0))), new Prisma.Decimal(0));

  return {
    currentPeriod: current ? { id: current.id, name: current.name, status: current.status, ...currentSummary } : null,
    pendingApprovalCount,
    paidPeriodsCount: paidPeriods.length,
    totalPaidNetAllTime: totalPaidNet,
  };
}

export async function getPayrollSummaryReport(payrollPeriodId: string) {
  const period = await getPayrollPeriodById(payrollPeriodId);
  const totals = period.records.reduce(
    (acc, r) => ({
      totalGross: acc.totalGross.plus(r.grossEarnings),
      totalBonus: acc.totalBonus.plus(r.bonusTotal),
      totalTax: acc.totalTax.plus(r.taxAmount),
      totalDeductions: acc.totalDeductions.plus(r.totalDeductions),
      totalNet: acc.totalNet.plus(r.netSalary),
    }),
    { totalGross: new Prisma.Decimal(0), totalBonus: new Prisma.Decimal(0), totalTax: new Prisma.Decimal(0), totalDeductions: new Prisma.Decimal(0), totalNet: new Prisma.Decimal(0) }
  );
  return { period, records: period.records, totals };
}

export async function getTaxSummaryReport(payrollPeriodId: string) {
  const records = await prisma.payrollRecord.findMany({
    where: { payrollPeriodId },
    include: { employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } } },
    orderBy: { employee: { firstName: 'asc' } },
  });
  const totalTax = records.reduce((sum, r) => sum.plus(r.taxAmount), new Prisma.Decimal(0));
  return { records, totalTax };
}

export async function getSalaryExpenseSummaryReport(filters: { dateFrom?: string; dateTo?: string }) {
  const periods = await prisma.payrollPeriod.findMany({
    where: {
      status: { in: [PayrollPeriodStatus.APPROVED, PayrollPeriodStatus.PAID] },
      ...(filters.dateFrom ? { startDate: { gte: new Date(filters.dateFrom) } } : {}),
      ...(filters.dateTo ? { endDate: { lte: new Date(filters.dateTo) } } : {}),
    },
    include: { records: true },
    orderBy: { startDate: 'asc' },
  });

  const rows = periods.map((p) => {
    const grossSalary = p.records.reduce((s, r) => s.plus(r.basicSalary).plus(r.allowancesTotal), new Prisma.Decimal(0));
    const bonus = p.records.reduce((s, r) => s.plus(r.bonusTotal), new Prisma.Decimal(0));
    const otherCosts = p.records.reduce((s, r) => s.plus(r.taxAmount).plus(r.otherDeductionsTotal), new Prisma.Decimal(0));
    return { periodId: p.id, periodName: p.name, grossSalary, bonus, otherCosts, total: grossSalary.plus(bonus) };
  });
  return { rows };
}
