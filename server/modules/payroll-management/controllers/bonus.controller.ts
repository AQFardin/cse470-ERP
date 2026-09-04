import { Request, Response } from 'express';
import { PayrollApprovalStatus } from '@prisma/client';
import * as bonusService from '../services/bonus.service';
import { PayrollError } from '../shared/payroll.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof PayrollError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getBonuses(req: Request, res: Response) {
  try {
    const { employeeId, payrollPeriodId, status } = req.query;
    const bonuses = await bonusService.listBonuses({
      employeeId: employeeId ? String(employeeId) : undefined,
      payrollPeriodId: payrollPeriodId ? String(payrollPeriodId) : undefined,
      status: status && status !== 'ALL' ? (status as PayrollApprovalStatus) : undefined,
    });
    res.json({ success: true, data: bonuses, count: bonuses.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch bonuses');
  }
}

export async function createBonus(req: Request, res: Response) {
  try {
    const bonus = await bonusService.createBonus(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: bonus });
  } catch (error) {
    handleError(res, error, 'Failed to create bonus');
  }
}

export async function updateBonus(req: Request, res: Response) {
  try {
    const bonus = await bonusService.updateBonus(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: bonus });
  } catch (error) {
    handleError(res, error, 'Failed to update bonus');
  }
}

export async function deleteBonus(req: Request, res: Response) {
  try {
    await bonusService.deleteBonus(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, message: 'Bonus deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete bonus');
  }
}

export async function approveBonus(req: Request, res: Response) {
  try {
    const bonus = await bonusService.decideBonus(req.params.id as string, 'APPROVED', req.currentUser!.id);
    res.json({ success: true, data: bonus });
  } catch (error) {
    handleError(res, error, 'Failed to approve bonus');
  }
}

export async function rejectBonus(req: Request, res: Response) {
  try {
    const bonus = await bonusService.decideBonus(req.params.id as string, 'REJECTED', req.currentUser!.id);
    res.json({ success: true, data: bonus });
  } catch (error) {
    handleError(res, error, 'Failed to reject bonus');
  }
}
