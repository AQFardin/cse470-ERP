import { Router } from 'express';
import { submitApplication, checkApplicationStatus } from '../controllers/applicant.controller';
import { uploadCV } from '../middleware/upload.middleware';

const router = Router();

// Public
router.post('/apply', uploadCV.single('resume'), submitApplication);
router.get('/status', checkApplicationStatus);

export default router;
