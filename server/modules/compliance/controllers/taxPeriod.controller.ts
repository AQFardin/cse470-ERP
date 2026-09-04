import { Request, Response } from 'express';
import { TaxPeriodStatus } from '@prisma/client';
import * as taxPeriodService from '../services/taxPeriod.service';
import * as taxTransactionService from '../services/taxTransaction.service';
import { TaxError } from '../shared/tax.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof TaxError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getTaxPeriods(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const periods = await taxPeriodService.listTaxPeriods({ status: status ? (status as TaxPeriodStatus) : undefined });
    res.json({ success: true, data: periods });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax periods');
  }
}

export async function getTaxPeriod(req: Request, res: Response) {
  try {
    const period = await taxPeriodService.getTaxPeriodById(req.params.id as string);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax period');
  }
}

export async function getTaxPeriodTransactions(req: Request, res: Response) {
  try {
    const transactions = await taxTransactionService.listTaxTransactions({ taxPeriodId: req.params.id as string });
    res.json({ success: true, data: transactions });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax period transactions');
  }
}

export async function createTaxPeriod(req: Request, res: Response) {
  try {
    const period = await taxPeriodService.createTaxPeriod(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to create tax period');
  }
}

export async function calculateTaxPeriod(req: Request, res: Response) {
  try {
    const period = await taxPeriodService.calculateTaxPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to calculate tax period');
  }
}

export async function reviewTaxPeriod(req: Request, res: Response) {
  try {
    const period = await taxPeriodService.reviewTaxPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to submit tax period for review');
  }
}

export async function finalizeTaxPeriod(req: Request, res: Response) {
  try {
    const period = await taxPeriodService.finalizeTaxPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to finalize tax period');
  }
}

export async function fileTaxPeriod(req: Request, res: Response) {
  try {
    const period = await taxPeriodService.fileTaxPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to file tax period');
  }
}

export async function closeTaxPeriod(req: Request, res: Response) {
  try {
    const period = await taxPeriodService.closeTaxPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to close tax period');
  }
}
