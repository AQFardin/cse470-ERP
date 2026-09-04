import { Router } from 'express';
import * as salary from '../controllers/salary.controller';
import * as taxRule from '../controllers/taxRule.controller';
import * as bonus from '../controllers/bonus.controller';
import * as deduction from '../controllers/deduction.controller';
import * as payroll from '../controllers/payroll.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

// ─── Dashboard & Reports ────────────────────────────────
router.get('/dashboard', requirePermission('payroll', 'view_reports'), payroll.getDashboard);
router.get('/reports/summary', requirePermission('payroll', 'view_reports'), payroll.getSummaryReport);
router.get('/reports/tax', requirePermission('payroll', 'view_reports'), payroll.getTaxReport);
router.get('/reports/salary-expense', requirePermission('payroll', 'view_reports'), payroll.getSalaryExpenseReport);
router.get('/reports/payments', requirePermission('payroll', 'view_reports'), payroll.getPaymentsReport);

// ─── Salary Components ──────────────────────────────────
router.get('/salary-components', requirePermission('payroll', 'view'), salary.getSalaryComponents);
router.post('/salary-components', requirePermission('payroll', 'manage_salary_structure'), salary.createSalaryComponent);
router.put('/salary-components/:id', requirePermission('payroll', 'manage_salary_structure'), salary.updateSalaryComponent);

// ─── Employee Salary ─────────────────────────────────────
router.get('/employees/:employeeId/salary', requirePermission('payroll', 'manage_salary_structure'), salary.getEmployeeSalaryHistory);
router.get('/employees/:employeeId/salary/current', requirePermission('payroll', 'manage_salary_structure'), salary.getCurrentEmployeeSalary);
router.post('/employees/:employeeId/salary', requirePermission('payroll', 'manage_salary_structure'), salary.assignEmployeeSalary);

// ─── Payslip (self-service, checked inside the controller) ─
router.get('/employees/:employeeId/payslip', requirePermission('payroll', 'view_payslip'), payroll.getPayslip);

// ─── Tax Rules ───────────────────────────────────────────
router.get('/tax-rules', requirePermission('payroll', 'manage_tax_rules'), taxRule.getTaxRules);
router.get('/tax-rules/:id', requirePermission('payroll', 'manage_tax_rules'), taxRule.getTaxRule);
router.post('/tax-rules', requirePermission('payroll', 'manage_tax_rules'), taxRule.createTaxRule);
router.put('/tax-rules/:id', requirePermission('payroll', 'manage_tax_rules'), taxRule.updateTaxRule);

// ─── Bonuses ─────────────────────────────────────────────
router.get('/bonuses', requirePermission('payroll', 'view'), bonus.getBonuses);
router.post('/bonuses', requirePermission('payroll', 'manage_bonus'), bonus.createBonus);
router.put('/bonuses/:id', requirePermission('payroll', 'manage_bonus'), bonus.updateBonus);
router.delete('/bonuses/:id', requirePermission('payroll', 'manage_bonus'), bonus.deleteBonus);
router.post('/bonuses/:id/approve', requirePermission('payroll', 'manage_bonus'), bonus.approveBonus);
router.post('/bonuses/:id/reject', requirePermission('payroll', 'manage_bonus'), bonus.rejectBonus);

// ─── Deductions ──────────────────────────────────────────
router.get('/deductions', requirePermission('payroll', 'view'), deduction.getDeductions);
router.post('/deductions', requirePermission('payroll', 'manage_deduction'), deduction.createDeduction);
router.put('/deductions/:id', requirePermission('payroll', 'manage_deduction'), deduction.updateDeduction);
router.delete('/deductions/:id', requirePermission('payroll', 'manage_deduction'), deduction.deleteDeduction);
router.post('/deductions/:id/approve', requirePermission('payroll', 'manage_deduction'), deduction.approveDeduction);
router.post('/deductions/:id/reject', requirePermission('payroll', 'manage_deduction'), deduction.rejectDeduction);

// ─── Payroll Periods ─────────────────────────────────────
router.get('/periods', requirePermission('payroll', 'view'), payroll.getPeriods);
router.get('/periods/:id', requirePermission('payroll', 'view'), payroll.getPeriod);
router.post('/periods', requirePermission('payroll', 'create'), payroll.createPeriod);
router.post('/periods/:id/calculate', requirePermission('payroll', 'calculate'), payroll.calculatePeriod);
router.post('/periods/:id/approve', requirePermission('payroll', 'approve'), payroll.approvePeriod);
router.post('/periods/:id/cancel', requirePermission('payroll', 'cancel'), payroll.cancelPeriod);

// ─── Payroll Payments ────────────────────────────────────
router.get('/payments', requirePermission('payroll', 'view'), payroll.getPayments);
router.post('/payments', requirePermission('payroll', 'process_payment'), payroll.createPayment);
router.post('/payments/:id/reverse', requirePermission('payroll', 'reverse_payment'), payroll.reversePayment);

export default router;
