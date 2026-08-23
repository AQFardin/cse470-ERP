import { Router } from 'express';
import {
  getOrders,
  createOrder,
  getReturnRequests,
  createReturnRequest,
  approveReturnRequest,
  rejectReturnRequest,
  createRefundTransaction
} from '../controllers/returns.controller';

const router = Router();

// Orders
router.get('/orders', getOrders);
router.post('/orders', createOrder);

// Return Requests
router.get('/requests', getReturnRequests);
router.post('/requests', createReturnRequest);
router.patch('/requests/:id/approve', approveReturnRequest);
router.patch('/requests/:id/reject', rejectReturnRequest);

// Refund Transactions
router.post('/requests/:returnRequestId/refund', createRefundTransaction);

export default router;