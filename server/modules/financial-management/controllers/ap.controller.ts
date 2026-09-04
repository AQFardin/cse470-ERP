import { Request, Response } from 'express';
import { ApBillStatus, PaymentRecordStatus } from '@prisma/client';
import * as apService from '../services/ap.service';
import { FinanceError } from '../shared/finance.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof FinanceError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

// ─── Vendors ──────────────────────────────────────────────

export async function getVendors(req: Request, res: Response) {
  try {
    const { isActive, search } = req.query;
    const vendors = await apService.listVendors({ isActive: isActive === undefined ? undefined : isActive === 'true', search: search ? String(search) : undefined });
    res.json({ success: true, data: vendors, count: vendors.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch vendors');
  }
}

export async function getVendor(req: Request, res: Response) {
  try {
    const vendor = await apService.getVendorById(req.params.id as string);
    res.json({ success: true, data: vendor });
  } catch (error) {
    handleError(res, error, 'Failed to fetch vendor');
  }
}

export async function createVendor(req: Request, res: Response) {
  try {
    const vendor = await apService.createVendor(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    handleError(res, error, 'Failed to create vendor');
  }
}

export async function updateVendor(req: Request, res: Response) {
  try {
    const vendor = await apService.updateVendor(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: vendor });
  } catch (error) {
    handleError(res, error, 'Failed to update vendor');
  }
}

// ─── Vendor Bills ─────────────────────────────────────────

export async function getBills(req: Request, res: Response) {
  try {
    const { status, vendorId, search, dateFrom, dateTo, page, pageSize } = req.query;
    const result = await apService.listVendorBills({
      status: status && status !== 'ALL' ? (status as ApBillStatus) : undefined,
      vendorId: vendorId ? String(vendorId) : undefined,
      search: search ? String(search) : undefined,
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch vendor bills');
  }
}

export async function getBill(req: Request, res: Response) {
  try {
    const bill = await apService.getVendorBillById(req.params.id as string);
    res.json({ success: true, data: bill });
  } catch (error) {
    handleError(res, error, 'Failed to fetch vendor bill');
  }
}

export async function createBill(req: Request, res: Response) {
  try {
    const bill = await apService.createVendorBill(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    handleError(res, error, 'Failed to create vendor bill');
  }
}

export async function updateBill(req: Request, res: Response) {
  try {
    const bill = await apService.updateVendorBill(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: bill });
  } catch (error) {
    handleError(res, error, 'Failed to update vendor bill');
  }
}

export async function deleteBill(req: Request, res: Response) {
  try {
    await apService.deleteVendorBill(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, message: 'Vendor bill deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete vendor bill');
  }
}

export async function approveBill(req: Request, res: Response) {
  try {
    const bill = await apService.approveVendorBill(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: bill });
  } catch (error) {
    handleError(res, error, 'Failed to approve vendor bill');
  }
}

export async function cancelBill(req: Request, res: Response) {
  try {
    const bill = await apService.cancelVendorBill(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: bill });
  } catch (error) {
    handleError(res, error, 'Failed to cancel vendor bill');
  }
}

// ─── Vendor Payments ──────────────────────────────────────

export async function getPayments(req: Request, res: Response) {
  try {
    const { vendorBillId, status, page, pageSize } = req.query;
    const result = await apService.listVendorPayments({
      vendorBillId: vendorBillId ? String(vendorBillId) : undefined,
      status: status && status !== 'ALL' ? (status as PaymentRecordStatus) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch vendor payments');
  }
}

export async function getPayment(req: Request, res: Response) {
  try {
    const payment = await apService.getVendorPaymentById(req.params.id as string);
    res.json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to fetch vendor payment');
  }
}

export async function createPayment(req: Request, res: Response) {
  try {
    const payment = await apService.createVendorPayment(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to create vendor payment');
  }
}

export async function reversePayment(req: Request, res: Response) {
  try {
    const payment = await apService.reverseVendorPayment(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to reverse vendor payment');
  }
}

// ─── Reports ──────────────────────────────────────────────

export async function getVendorStatement(req: Request, res: Response) {
  try {
    const { dateFrom, dateTo } = req.query;
    const result = await apService.getVendorStatement(req.params.id as string, { dateFrom: dateFrom ? String(dateFrom) : undefined, dateTo: dateTo ? String(dateTo) : undefined });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch vendor statement');
  }
}

export async function getAging(req: Request, res: Response) {
  try {
    const result = await apService.getApAging(req.query.asOf ? String(req.query.asOf) : undefined);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch AP aging report');
  }
}

export async function getDashboard(req: Request, res: Response) {
  try {
    const result = await apService.getApDashboard(req.query.asOf ? String(req.query.asOf) : undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch AP dashboard');
  }
}
