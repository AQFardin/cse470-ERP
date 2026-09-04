import { Router } from 'express';
import { getAccounts, getAccount, createAccount, updateAccount } from '../controllers/account.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

router.get('/', requirePermission('general_ledger', 'view_chart_of_accounts'), getAccounts);
router.get('/:id', requirePermission('general_ledger', 'view_chart_of_accounts'), getAccount);
router.post('/', requirePermission('general_ledger', 'create_chart_of_account'), createAccount);
router.put('/:id', requirePermission('general_ledger', 'edit_chart_of_account'), updateAccount);

export default router;
