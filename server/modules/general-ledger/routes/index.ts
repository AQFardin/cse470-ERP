import { Router } from 'express';
import accountRoutes from './account.routes';
import journalRoutes from './journal.routes';
import reportRoutes from './report.routes';
import fiscalPeriodRoutes from './fiscalPeriod.routes';

const router = Router();

router.use('/accounts', accountRoutes);
router.use('/journals', journalRoutes);
router.use('/fiscal-periods', fiscalPeriodRoutes);
router.use('/', reportRoutes); // exposes /ledger, /trial-balance, /balance-sheet, /income-statement, /cash-flow-statement

export default router;
