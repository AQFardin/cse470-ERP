import { Router } from 'express';
import {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getDashboardStats,
} from '../controllers/employeeController';

const router = Router();

// Dashboard stats
router.get('/stats', getDashboardStats);

// CRUD
router.post('/', createEmployee);
router.get('/', getAllEmployees);
router.get('/:id', getEmployee);
router.put('/:id', updateEmployee);
router.patch('/:id/status', toggleEmployeeStatus);

export default router;
