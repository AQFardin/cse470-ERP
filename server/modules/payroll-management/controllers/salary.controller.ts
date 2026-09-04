import { Request, Response } from 'express';
import { SalaryComponentCategory } from '@prisma/client';
import * as salaryService from '../services/salary.service';
import { PayrollError } from '../shared/payroll.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof PayrollError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

// ─── Salary Components ────────────────────────────────────

export async function getSalaryComponents(req: Request, res: Response) {
  try {
    const { category, isActive } = req.query;
    const components = await salaryService.listSalaryComponents({
      category: category ? (category as SalaryComponentCategory) : undefined,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
    res.json({ success: true, data: components, count: components.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch salary components');
  }
}

export async function createSalaryComponent(req: Request, res: Response) {
  try {
    const component = await salaryService.createSalaryComponent(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: component });
  } catch (error) {
    handleError(res, error, 'Failed to create salary component');
  }
}

export async function updateSalaryComponent(req: Request, res: Response) {
  try {
    const component = await salaryService.updateSalaryComponent(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: component });
  } catch (error) {
    handleError(res, error, 'Failed to update salary component');
  }
}

// ─── Employee Salary ──────────────────────────────────────

export async function getEmployeeSalaryHistory(req: Request, res: Response) {
  try {
    const history = await salaryService.getEmployeeSalaryHistory(req.params.employeeId as string);
    res.json({ success: true, data: history, count: history.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch salary history');
  }
}

export async function getCurrentEmployeeSalary(req: Request, res: Response) {
  try {
    const salary = await salaryService.getCurrentEmployeeSalary(req.params.employeeId as string);
    res.json({ success: true, data: salary });
  } catch (error) {
    handleError(res, error, 'Failed to fetch current salary');
  }
}

export async function assignEmployeeSalary(req: Request, res: Response) {
  try {
    const salary = await salaryService.assignEmployeeSalary(req.params.employeeId as string, req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: salary });
  } catch (error) {
    handleError(res, error, 'Failed to assign salary');
  }
}
