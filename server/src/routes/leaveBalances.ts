import { Router } from 'express';
import {
  getLeaveBalances,
  getAllLeaveBalances,
  correctLeaveBalance,
} from '../controllers/leaveBalanceController';
import { requirePermission } from '../middleware/authorize';

const router = Router();

// All balances (HR/Admin)
router.get('/', requirePermission('leave', 'correct_balance'), getAllLeaveBalances);

// Employee's own balances (any authenticated user for their own, or HR for any)
router.get('/:employeeId', getLeaveBalances);

// Correct a balance (HR only)
router.patch('/:id/correct', requirePermission('leave', 'correct_balance'), correctLeaveBalance);

export default router;
