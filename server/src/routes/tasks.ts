import { Router } from 'express';
import {
  createTask,
  getAllTasks,
  getEmployeeTasks,
  updateTask,
  deleteTask,
} from '../controllers/taskController';
import { requirePermission } from '../middleware/authorize';

const router = Router();

router.post('/', requirePermission('task', 'create'), createTask);
router.get('/', getAllTasks); // Scoping is done inside the controller
router.patch('/:id', updateTask);
router.delete('/:id', requirePermission('task', 'delete'), deleteTask);

export default router;
