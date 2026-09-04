import { Request, Response } from 'express';
import { PayrollApprovalStatus } from '@prisma/client';
import * as deductionService from '../services/deduction.service';
import { PayrollError } from '../shared/payroll.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof PayrollError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getDeductions(req: Request, res: Response) {
  try {
    const { employeeId, payrollPeriodId, status } = req.query;
    const deductions = await deductionService.listDeductions({
      employeeId: employeeId ? String(employeeId) : undefined,
      payrollPeriodId: payrollPeriodId ? String(payrollPeriodId) : undefined,
      status: status && status !== 'ALL' ? (status as PayrollApprovalStatus) : undefined,
    });
    res.json({ success: true, data: deductions, count: deductions.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch deductions');
  }
}

export async function createDeduction(req: Request, res: Response) {
  try {
    const deduction = await deductionService.createDeduction(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: deduction });
  } catch (error) {
    handleError(res, error, 'Failed to create deduction');
  }
}

export async function updateDeduction(req: Request, res: Response) {
  try {
    const deduction = await deductionService.updateDeduction(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: deduction });
  } catch (error) {
    handleError(res, error, 'Failed to update deduction');
  }
}

export async function deleteDeduction(req: Request, res: Response) {
  try {
    await deductionService.deleteDeduction(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, message: 'Deduction deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete deduction');
  }
}

export async function approveDeduction(req: Request, res: Response) {
  try {
    const deduction = await deductionService.decideDeduction(req.params.id as string, 'APPROVED', req.currentUser!.id);
    res.json({ success: true, data: deduction });
  } catch (error) {
    handleError(res, error, 'Failed to approve deduction');
  }
}

export async function rejectDeduction(req: Request, res: Response) {
  try {
    const deduction = await deductionService.decideDeduction(req.params.id as string, 'REJECTED', req.currentUser!.id);
    res.json({ success: true, data: deduction });
  } catch (error) {
    handleError(res, error, 'Failed to reject deduction');
  }
}
