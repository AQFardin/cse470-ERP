import { Router } from 'express';
import {
  createOffboardRequest,
  getAllOffboardRequests,
  reviewOffboardRequest,
} from '../controllers/offboardController';
import { requirePermission } from '../middleware/authorize';

const router = Router();

router.post('/', requirePermission('offboarding', 'request'), createOffboardRequest);
router.get('/', requirePermission('offboarding', 'view'), getAllOffboardRequests);
router.patch('/:id/review', requirePermission('offboarding', 'execute'), reviewOffboardRequest);

export default router;
