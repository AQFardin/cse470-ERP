import { Request, Response } from 'express';
import * as taxRuleService from '../services/taxRule.service';
import { PayrollError } from '../shared/payroll.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof PayrollError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

export async function getTaxRules(req: Request, res: Response) {
  try {
    const { isActive } = req.query;
    const rules = await taxRuleService.listTaxRules({ isActive: isActive === undefined ? undefined : isActive === 'true' });
    res.json({ success: true, data: rules, count: rules.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax rules');
  }
}

export async function getTaxRule(req: Request, res: Response) {
  try {
    const rule = await taxRuleService.getTaxRuleById(req.params.id as string);
    res.json({ success: true, data: rule });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax rule');
  }
}

export async function createTaxRule(req: Request, res: Response) {
  try {
    const rule = await taxRuleService.createTaxRule(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    handleError(res, error, 'Failed to create tax rule');
  }
}

export async function updateTaxRule(req: Request, res: Response) {
  try {
    const rule = await taxRuleService.updateTaxRule(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: rule });
  } catch (error) {
    handleError(res, error, 'Failed to update tax rule');
  }
}
