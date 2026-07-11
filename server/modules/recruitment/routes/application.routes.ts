import { Router } from 'express';
import {
  getAllApplications,
  getApplication,
  updateApplicationStatus,
} from '../controllers/application.controller';

const router = Router();

// HR
router.get('/', getAllApplications);
router.get('/:id', getApplication);
router.patch('/:id/status', updateApplicationStatus);

export default router;
