import { Router } from 'express';
import { getFiscalPeriods, createFiscalPeriod, closeFiscalPeriod, reopenFiscalPeriod } from '../controllers/fiscalPeriod.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

router.get('/', requirePermission('general_ledger', 'view_fiscal_periods'), getFiscalPeriods);
router.post('/', requirePermission('general_ledger', 'manage_fiscal_periods'), createFiscalPeriod);
router.post('/:id/close', requirePermission('general_ledger', 'manage_fiscal_periods'), closeFiscalPeriod);
router.post('/:id/reopen', requirePermission('general_ledger', 'override_closed_period'), reopenFiscalPeriod);

export default router;
