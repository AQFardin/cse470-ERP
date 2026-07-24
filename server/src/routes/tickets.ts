import { Router } from 'express';
import {
  createTicket,
  getAllTickets,
  getTicket,
  updateTicket,
} from '../controllers/ticketController';
import { requirePermission } from '../middleware/authorize';

const router = Router();

router.post('/', requirePermission('ticket', 'raise'), createTicket);
router.get('/', getAllTickets); // Scoping & category lanes handled inside controller
router.get('/:id', getTicket);
router.patch('/:id', updateTicket); // Status update / resolution

export default router;
