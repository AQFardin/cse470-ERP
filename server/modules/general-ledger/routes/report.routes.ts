import { Router } from 'express';
import { getGeneralLedger, getTrialBalance, getBalanceSheet, getIncomeStatement, getCashFlowStatement } from '../controllers/report.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

router.get('/ledger', requirePermission('general_ledger', 'view_general_ledger'), getGeneralLedger);
router.get('/trial-balance', requirePermission('general_ledger', 'view_trial_balance'), getTrialBalance);
router.get('/balance-sheet', requirePermission('general_ledger', 'view_financial_statements'), getBalanceSheet);
router.get('/income-statement', requirePermission('general_ledger', 'view_financial_statements'), getIncomeStatement);
router.get('/cash-flow-statement', requirePermission('general_ledger', 'view_financial_statements'), getCashFlowStatement);

export default router;
