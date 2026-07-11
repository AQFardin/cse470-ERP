import { Router } from 'express';
import {
  createJobPosting,
  getAllJobPostings,
  getActiveJobPostings,
  getJobPosting,
  updateJobPosting,
} from '../controllers/jobPosting.controller';

const router = Router();

// Public
router.get('/active', getActiveJobPostings);

// HR
router.post('/', createJobPosting);
router.get('/', getAllJobPostings);
router.get('/:id', getJobPosting);
router.put('/:id', updateJobPosting);

export default router;
