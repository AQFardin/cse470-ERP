import { Request, Response } from 'express';
import * as ledgerService from '../services/ledger.service';
import { LedgerError } from '../services/ledger.service';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof LedgerError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

// ─── GET /general-ledger/ledger?accountId=&dateFrom=&dateTo=&reference=&page=&pageSize= ───
export async function getGeneralLedger(req: Request, res: Response) {
  try {
    const { accountId, dateFrom, dateTo, reference, page, pageSize } = req.query;
    if (!accountId) {
      res.status(400).json({ success: false, error: 'accountId query parameter is required' });
      return;
    }
    const result = await ledgerService.getAccountLedger(String(accountId), {
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined,
      reference: reference ? String(reference) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch general ledger');
  }
}

// ─── GET /general-ledger/trial-balance?dateFrom=&dateTo=&accountId= ───
export async function getTrialBalance(req: Request, res: Response) {
  try {
    const { dateFrom, dateTo, accountId } = req.query;
    const result = await ledgerService.getTrialBalance({
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined,
      accountId: accountId ? String(accountId) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to compute trial balance');
  }
}

// ─── GET /general-ledger/balance-sheet?asOfDate= ───
export async function getBalanceSheet(req: Request, res: Response) {
  try {
    const result = await ledgerService.getBalanceSheet(req.query.asOfDate ? String(req.query.asOfDate) : undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to compute balance sheet');
  }
}

// ─── GET /general-ledger/income-statement?startDate=&endDate= ───
export async function getIncomeStatement(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) { res.status(400).json({ success: false, error: 'startDate and endDate are required' }); return; }
    const result = await ledgerService.getIncomeStatement(String(startDate), String(endDate));
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to compute income statement');
  }
}

// ─── GET /general-ledger/cash-flow-statement?startDate=&endDate= ───
export async function getCashFlowStatement(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) { res.status(400).json({ success: false, error: 'startDate and endDate are required' }); return; }
    const result = await ledgerService.getCashFlowStatement(String(startDate), String(endDate));
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to compute cash flow statement');
  }
}
