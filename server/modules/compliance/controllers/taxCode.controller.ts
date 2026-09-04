import { Request, Response } from 'express';
import { TaxType, TaxCategory } from '@prisma/client';
import * as taxCodeService from '../services/taxCode.service';
import { TaxError } from '../shared/tax.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof TaxError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getTaxCodes(req: Request, res: Response) {
  try {
    const { type, category, isActive } = req.query;
    const taxCodes = await taxCodeService.listTaxCodes({
      type: type ? (type as TaxType) : undefined,
      category: category ? (category as TaxCategory) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    res.json({ success: true, data: taxCodes });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax codes');
  }
}

export async function getTaxCode(req: Request, res: Response) {
  try {
    const taxCode = await taxCodeService.getTaxCodeById(req.params.id as string);
    res.json({ success: true, data: taxCode });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax code');
  }
}

export async function createTaxCode(req: Request, res: Response) {
  try {
    const taxCode = await taxCodeService.createTaxCode(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: taxCode });
  } catch (error) {
    handleError(res, error, 'Failed to create tax code');
  }
}

export async function updateTaxCode(req: Request, res: Response) {
  try {
    const taxCode = await taxCodeService.updateTaxCode(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: taxCode });
  } catch (error) {
    handleError(res, error, 'Failed to update tax code');
  }
}

export async function createTaxRate(req: Request, res: Response) {
  try {
    const rate = await taxCodeService.createTaxRate(req.params.id as string, req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: rate });
  } catch (error) {
    handleError(res, error, 'Failed to create tax rate');
  }
}

export async function updateTaxRate(req: Request, res: Response) {
  try {
    const rate = await taxCodeService.updateTaxRate(req.params.rateId as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: rate });
  } catch (error) {
    handleError(res, error, 'Failed to update tax rate');
  }
}
