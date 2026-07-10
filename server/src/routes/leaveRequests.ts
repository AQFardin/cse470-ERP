import { Router } from 'express';
import {
  createLeaveRequest,
  getAllLeaveRequests,
  getEmployeeLeaveRequests,
  reviewLeaveRequest,
} from '../controllers/leaveController';

const router = Router();

router.post('/', createLeaveRequest);
router.get('/', getAllLeaveRequests);
router.get('/employee/:id', getEmployeeLeaveRequests);
router.patch('/:id/review', reviewLeaveRequest);

export default router;
