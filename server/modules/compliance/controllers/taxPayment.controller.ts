import { Request, Response } from 'express';
import * as taxPaymentService from '../services/taxPayment.service';
import { TaxError } from '../shared/tax.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof TaxError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getTaxPayments(_req: Request, res: Response) {
  try {
    const payments = await taxPaymentService.listTaxPayments();
    res.json({ success: true, data: payments });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax payments');
  }
}

export async function getTaxPayment(req: Request, res: Response) {
  try {
    const payment = await taxPaymentService.getTaxPaymentById(req.params.id as string);
    res.json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax payment');
  }
}

export async function createTaxPayment(req: Request, res: Response) {
  try {
    const payment = await taxPaymentService.createTaxPayment(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to record tax payment');
  }
}

export async function reverseTaxPayment(req: Request, res: Response) {
  try {
    const payment = await taxPaymentService.reverseTaxPayment(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to reverse tax payment');
  }
}
