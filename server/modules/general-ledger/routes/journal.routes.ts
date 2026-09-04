import { Router } from 'express';
import {
  getJournals,
  getJournal,
  createJournal,
  updateJournal,
  deleteJournal,
  postJournal,
  lockJournal,
  reverseJournal,
} from '../controllers/journal.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

router.get('/', requirePermission('general_ledger', 'view_journal'), getJournals);
router.get('/:id', requirePermission('general_ledger', 'view_journal'), getJournal);
router.post('/', requirePermission('general_ledger', 'create_journal'), createJournal);
router.put('/:id', requirePermission('general_ledger', 'edit_draft_journal'), updateJournal);
router.delete('/:id', requirePermission('general_ledger', 'delete_draft_journal'), deleteJournal);
router.post('/:id/post', requirePermission('general_ledger', 'post_journal'), postJournal);
router.post('/:id/lock', requirePermission('general_ledger', 'lock_journal'), lockJournal);
router.post('/:id/reverse', requirePermission('general_ledger', 'reverse_journal'), reverseJournal);

export default router;
