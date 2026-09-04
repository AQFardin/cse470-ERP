import { Request, Response } from 'express';
import * as taxReportService from '../services/taxReport.service';
import { TaxError } from '../shared/tax.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof TaxError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

function parseRange(req: Request) {
  const { from, to } = req.query;
  return { from: from ? new Date(String(from)) : undefined, to: to ? new Date(String(to)) : undefined };
}

export async function getDashboard(_req: Request, res: Response) {
  try {
    const data = await taxReportService.getComplianceDashboard();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch compliance dashboard');
  }
}

export async function getSalesTaxReport(req: Request, res: Response) {
  try {
    const { from, to } = parseRange(req);
    const data = await taxReportService.getSalesTaxReport(from, to);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch sales tax report');
  }
}

export async function getPurchaseTaxReport(req: Request, res: Response) {
  try {
    const { from, to } = parseRange(req);
    const data = await taxReportService.getPurchaseTaxReport(from, to);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch purchase tax report');
  }
}

export async function getTaxLiabilityReport(_req: Request, res: Response) {
  try {
    const data = await taxReportService.getTaxLiabilityReport();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax liability report');
  }
}

export async function getTaxPaymentsReport(_req: Request, res: Response) {
  try {
    const data = await taxReportService.getTaxPaymentsReport();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax payments report');
  }
}

export async function getStatutoryFilingReport(req: Request, res: Response) {
  try {
    const data = await taxReportService.generateStatutoryFilingReport(req.params.id as string);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to generate statutory filing report');
  }
}
