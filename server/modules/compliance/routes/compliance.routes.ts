import { Router } from 'express';
import * as taxCode from '../controllers/taxCode.controller';
import * as taxCalculation from '../controllers/taxCalculation.controller';
import * as taxPeriod from '../controllers/taxPeriod.controller';
import * as taxPayment from '../controllers/taxPayment.controller';
import * as taxReport from '../controllers/taxReport.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

// ─── Dashboard & Reports ────────────────────────────────────
router.get('/dashboard', requirePermission('compliance', 'view_compliance'), taxReport.getDashboard);
router.get('/reports/sales-tax', requirePermission('compliance', 'view_tax_reports'), taxReport.getSalesTaxReport);
router.get('/reports/purchase-tax', requirePermission('compliance', 'view_tax_reports'), taxReport.getPurchaseTaxReport);
router.get('/reports/liability', requirePermission('compliance', 'view_tax_reports'), taxReport.getTaxLiabilityReport);
router.get('/reports/payments', requirePermission('compliance', 'view_tax_reports'), taxReport.getTaxPaymentsReport);

// ─── Tax Codes & Rates ───────────────────────────────────────
router.get('/tax-codes', requirePermission('compliance', 'view_compliance'), taxCode.getTaxCodes);
router.get('/tax-codes/:id', requirePermission('compliance', 'view_compliance'), taxCode.getTaxCode);
router.post('/tax-codes', requirePermission('compliance', 'manage_tax_configuration'), taxCode.createTaxCode);
router.put('/tax-codes/:id', requirePermission('compliance', 'manage_tax_configuration'), taxCode.updateTaxCode);
router.post('/tax-codes/:id/rates', requirePermission('compliance', 'manage_tax_rates'), taxCode.createTaxRate);
router.put('/tax-rates/:rateId', requirePermission('compliance', 'manage_tax_rates'), taxCode.updateTaxRate);

// ─── Calculation (preview only — backend recomputes authoritatively on save) ──
router.post('/calculate', requirePermission('compliance', 'view_compliance'), taxCalculation.previewTax);

// ─── Tax Periods ─────────────────────────────────────────────
router.get('/periods', requirePermission('compliance', 'view_compliance'), taxPeriod.getTaxPeriods);
router.get('/periods/:id', requirePermission('compliance', 'view_compliance'), taxPeriod.getTaxPeriod);
router.get('/periods/:id/transactions', requirePermission('compliance', 'view_compliance'), taxPeriod.getTaxPeriodTransactions);
router.get('/periods/:id/filing-report', requirePermission('compliance', 'view_tax_reports'), taxReport.getStatutoryFilingReport);
router.post('/periods', requirePermission('compliance', 'manage_tax_periods'), taxPeriod.createTaxPeriod);
router.post('/periods/:id/calculate', requirePermission('compliance', 'calculate_tax'), taxPeriod.calculateTaxPeriod);
router.post('/periods/:id/review', requirePermission('compliance', 'review_tax_return'), taxPeriod.reviewTaxPeriod);
router.post('/periods/:id/finalize', requirePermission('compliance', 'finalize_tax_return'), taxPeriod.finalizeTaxPeriod);
router.post('/periods/:id/file', requirePermission('compliance', 'file_tax_return'), taxPeriod.fileTaxPeriod);
router.post('/periods/:id/close', requirePermission('compliance', 'close_tax_period'), taxPeriod.closeTaxPeriod);

// ─── Tax Payments ─────────────────────────────────────────────
router.get('/payments', requirePermission('compliance', 'view_compliance'), taxPayment.getTaxPayments);
router.get('/payments/:id', requirePermission('compliance', 'view_compliance'), taxPayment.getTaxPayment);
router.post('/payments', requirePermission('compliance', 'process_tax_payment'), taxPayment.createTaxPayment);
router.post('/payments/:id/reverse', requirePermission('compliance', 'reverse_tax_payment'), taxPayment.reverseTaxPayment);

export default router;
