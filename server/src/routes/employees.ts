import { Router } from 'express';
import {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getDashboardStats,
} from '../controllers/employeeController';
import { requirePermission } from '../middleware/authorize';

const router = Router();

// Dashboard stats (any authenticated user)
router.get('/stats', getDashboardStats);

// CRUD with permission guards
router.post('/', requirePermission('employee_records', 'create'), createEmployee);
router.get('/', getAllEmployees); // Scoping handled inside controller
router.get('/:id', getEmployee);
router.put('/:id', requirePermission('employee_records', 'edit'), updateEmployee);
router.patch('/:id/status', requirePermission('employee_records', 'edit'), toggleEmployeeStatus);

export default router;
