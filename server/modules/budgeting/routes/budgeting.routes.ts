import { Router } from 'express';
import * as budget from '../controllers/budget.controller';
import * as analysis from '../controllers/budgetAnalysis.controller';
import * as forecast from '../controllers/forecast.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

// ─── Dashboards ──────────────────────────────────────────
router.get('/dashboard', requirePermission('budget', 'view_reports'), analysis.getDashboard);
router.get('/department/:departmentId', requirePermission('budget', 'view_reports'), analysis.getDepartmentDashboard);

// ─── Forecast ────────────────────────────────────────────
router.get('/forecast', requirePermission('budget', 'view_forecast'), forecast.getForecast);
router.post('/forecast/calculate', requirePermission('budget', 'calculate_forecast'), forecast.calculateForecast);

// ─── Budgets ─────────────────────────────────────────────
router.get('/budgets', requirePermission('budget', 'view'), budget.getBudgets);
router.get('/budgets/:id', requirePermission('budget', 'view'), budget.getBudget);
router.post('/budgets', requirePermission('budget', 'create'), budget.createBudget);
router.put('/budgets/:id', requirePermission('budget', 'edit'), budget.updateBudget);
router.delete('/budgets/:id', requirePermission('budget', 'edit'), budget.deleteBudget);

router.post('/budgets/:id/submit', requirePermission('budget', 'submit'), budget.submitBudget);
router.post('/budgets/:id/approve', requirePermission('budget', 'approve'), budget.approveBudget);
router.post('/budgets/:id/activate', requirePermission('budget', 'activate'), budget.activateBudget);
router.post('/budgets/:id/close', requirePermission('budget', 'close'), budget.closeBudget);
router.post('/budgets/:id/cancel', requirePermission('budget', 'cancel'), budget.cancelBudget);
router.post('/budgets/:id/revise', requirePermission('budget', 'edit'), budget.reviseBudget);

// ─── Budget Analysis ─────────────────────────────────────
router.get('/budgets/:id/vs-actual', requirePermission('budget', 'view_vs_actual'), analysis.getVsActual);
router.get('/budgets/:id/departments', requirePermission('budget', 'view_vs_actual'), analysis.getDepartments);
router.get('/budgets/:id/monthly-performance', requirePermission('budget', 'view_vs_actual'), analysis.getMonthlyPerformance);

export default router;
