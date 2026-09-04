import { Request, Response } from 'express';
import * as taxCalculationService from '../services/taxCalculation.service';
import { TaxError } from '../shared/tax.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof TaxError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

/**
 * Estimate-only endpoint: lets the UI preview a tax amount before an
 * AP bill / AR invoice is saved. The backend recomputes and stores the
 * authoritative amount again at save time — this response is never trusted
 * as final.
 */
export async function previewTax(req: Request, res: Response) {
  try {
    const { taxCodeId, amount, amountType, asOf } = req.body;
    const result = await taxCalculationService.computeTax({
      taxCodeId,
      amount,
      amountType: amountType === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE',
      asOf: asOf ? new Date(asOf) : new Date(),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to calculate tax');
  }
}
