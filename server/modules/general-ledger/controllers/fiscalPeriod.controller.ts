import { Request, Response } from 'express';
import * as fiscalPeriodService from '../services/fiscalPeriod.service';
import { LedgerError } from '../services/ledger.service';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof LedgerError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getFiscalPeriods(_req: Request, res: Response) {
  try {
    const periods = await fiscalPeriodService.listFiscalPeriods();
    res.json({ success: true, data: periods });
  } catch (error) {
    handleError(res, error, 'Failed to fetch fiscal periods');
  }
}

export async function createFiscalPeriod(req: Request, res: Response) {
  try {
    const period = await fiscalPeriodService.createFiscalPeriod(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to create fiscal period');
  }
}

export async function closeFiscalPeriod(req: Request, res: Response) {
  try {
    const period = await fiscalPeriodService.closeFiscalPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to close fiscal period');
  }
}

export async function reopenFiscalPeriod(req: Request, res: Response) {
  try {
    const period = await fiscalPeriodService.reopenFiscalPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to reopen fiscal period');
  }
}
