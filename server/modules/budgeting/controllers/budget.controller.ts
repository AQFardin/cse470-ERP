import { Request, Response } from 'express';
import { BudgetStatus } from '@prisma/client';
import * as budgetService from '../services/budget.service';
import { BudgetError } from '../shared/budgeting.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof BudgetError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getBudgets(req: Request, res: Response) {
  try {
    const { fiscalYear, status, search, page, pageSize } = req.query;
    const result = await budgetService.listBudgets({
      fiscalYear: fiscalYear ? Number(fiscalYear) : undefined,
      status: status && status !== 'ALL' ? (status as BudgetStatus) : undefined,
      search: search ? String(search) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch budgets');
  }
}

export async function getBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.getBudgetById(req.params.id as string);
    res.json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to fetch budget');
  }
}

export async function createBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.createBudget(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to create budget');
  }
}

export async function updateBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.updateBudget(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to update budget');
  }
}

export async function deleteBudget(req: Request, res: Response) {
  try {
    await budgetService.deleteBudget(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, message: 'Budget deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete budget');
  }
}

export async function submitBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.submitBudget(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to submit budget');
  }
}

export async function approveBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.approveBudget(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to approve budget');
  }
}

export async function activateBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.activateBudget(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to activate budget');
  }
}

export async function closeBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.closeBudget(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to close budget');
  }
}

export async function cancelBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.cancelBudget(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to cancel budget');
  }
}

export async function reviseBudget(req: Request, res: Response) {
  try {
    const budget = await budgetService.reviseBudget(req.params.id as string, req.currentUser!.id);
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    handleError(res, error, 'Failed to create budget revision');
  }
}
