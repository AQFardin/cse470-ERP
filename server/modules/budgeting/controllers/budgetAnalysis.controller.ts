import { Request, Response } from 'express';
import { Department } from '@prisma/client';
import * as analysisService from '../services/budgetAnalysis.service';
import { BudgetError } from '../shared/budgeting.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof BudgetError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getVsActual(req: Request, res: Response) {
  try {
    const { department, asOfDate } = req.query;
    const result = await analysisService.getBudgetVsActual(req.params.id as string, { department: department ? (department as Department) : undefined, asOfDate: asOfDate ? String(asOfDate) : undefined });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to compute budget vs actual');
  }
}

export async function getDepartments(req: Request, res: Response) {
  try {
    const { asOfDate } = req.query;
    const result = await analysisService.getDepartmentBreakdown(req.params.id as string, asOfDate ? String(asOfDate) : undefined);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to compute department breakdown');
  }
}

export async function getMonthlyPerformance(req: Request, res: Response) {
  try {
    const { asOfDate } = req.query;
    const result = await analysisService.getMonthlyPerformance(req.params.id as string, asOfDate ? String(asOfDate) : undefined);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to compute monthly performance');
  }
}

export async function getDashboard(req: Request, res: Response) {
  try {
    const { fiscalYear } = req.query;
    const result = await analysisService.getBudgetingDashboard(fiscalYear ? Number(fiscalYear) : undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch budgeting dashboard');
  }
}

export async function getDepartmentDashboard(req: Request, res: Response) {
  try {
    const { fiscalYear } = req.query;
    const result = await analysisService.getDepartmentDashboard(req.params.departmentId as Department, fiscalYear ? Number(fiscalYear) : undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch department dashboard');
  }
}
