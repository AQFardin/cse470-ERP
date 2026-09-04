import { Request, Response } from 'express';
import * as forecastService from '../services/forecast.service';
import { BudgetError } from '../shared/budgeting.util';
import { logAudit } from '../../../src/lib/auditLog';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof BudgetError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

// GET — cheap, read-only forecast preview; not audited (would spam the log on every dashboard render).
export async function getForecast(req: Request, res: Response) {
  try {
    const { budgetId, asOfDate } = req.query;
    if (!budgetId) {
      res.status(400).json({ success: false, error: 'budgetId query parameter is required' });
      return;
    }
    const [forecast, departmentForecasts] = await Promise.all([
      forecastService.calculateForecast(String(budgetId), { asOfDate: asOfDate ? String(asOfDate) : undefined }),
      forecastService.calculateDepartmentForecasts(String(budgetId), { asOfDate: asOfDate ? String(asOfDate) : undefined }),
    ]);
    res.json({ success: true, data: { ...forecast, departments: departmentForecasts } });
  } catch (error) {
    handleError(res, error, 'Failed to calculate forecast');
  }
}

// POST — explicit user-triggered calculation; recorded to the audit log per spec section 38.
export async function calculateForecast(req: Request, res: Response) {
  try {
    const { budgetId, asOfDate } = req.body;
    if (!budgetId) {
      res.status(400).json({ success: false, error: 'budgetId is required' });
      return;
    }
    const forecast = await forecastService.calculateForecast(budgetId, { asOfDate });
    await logAudit({
      actorId: req.currentUser!.id,
      action: 'CREATE',
      targetEntity: 'BudgetForecast',
      targetId: budgetId,
      after: { method: forecast.method, projectedAnnualActual: forecast.projectedAnnualActual.toString(), status: forecast.status },
    });
    res.json({ success: true, data: forecast });
  } catch (error) {
    handleError(res, error, 'Failed to calculate forecast');
  }
}
