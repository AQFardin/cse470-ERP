import { Request, Response } from 'express';
import { ArInvoiceStatus, PaymentRecordStatus } from '@prisma/client';
import * as arService from '../services/ar.service';
import { FinanceError } from '../shared/finance.util';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof FinanceError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

// ─── Customer Invoices ────────────────────────────────────

export async function getInvoices(req: Request, res: Response) {
  try {
    const { status, customerId, search, dateFrom, dateTo, page, pageSize } = req.query;
    const result = await arService.listCustomerInvoices({
      status: status && status !== 'ALL' ? (status as ArInvoiceStatus) : undefined,
      customerId: customerId ? String(customerId) : undefined,
      search: search ? String(search) : undefined,
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch customer invoices');
  }
}

export async function getInvoice(req: Request, res: Response) {
  try {
    const invoice = await arService.getCustomerInvoiceById(req.params.id as string);
    res.json({ success: true, data: invoice });
  } catch (error) {
    handleError(res, error, 'Failed to fetch customer invoice');
  }
}

export async function createInvoice(req: Request, res: Response) {
  try {
    const invoice = await arService.createCustomerInvoice(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    handleError(res, error, 'Failed to create customer invoice');
  }
}

export async function updateInvoice(req: Request, res: Response) {
  try {
    const invoice = await arService.updateCustomerInvoice(req.params.id as string, req.body, req.currentUser!.id);
    res.json({ success: true, data: invoice });
  } catch (error) {
    handleError(res, error, 'Failed to update customer invoice');
  }
}

export async function deleteInvoice(req: Request, res: Response) {
  try {
    await arService.deleteCustomerInvoice(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, message: 'Customer invoice deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete customer invoice');
  }
}

export async function issueInvoice(req: Request, res: Response) {
  try {
    const invoice = await arService.issueCustomerInvoice(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: invoice });
  } catch (error) {
    handleError(res, error, 'Failed to issue customer invoice');
  }
}

export async function cancelInvoice(req: Request, res: Response) {
  try {
    const invoice = await arService.cancelCustomerInvoice(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: invoice });
  } catch (error) {
    handleError(res, error, 'Failed to cancel customer invoice');
  }
}

// ─── Customer Payments ────────────────────────────────────

export async function getPayments(req: Request, res: Response) {
  try {
    const { customerInvoiceId, status, page, pageSize } = req.query;
    const result = await arService.listCustomerPayments({
      customerInvoiceId: customerInvoiceId ? String(customerInvoiceId) : undefined,
      status: status && status !== 'ALL' ? (status as PaymentRecordStatus) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch customer payments');
  }
}

export async function getPayment(req: Request, res: Response) {
  try {
    const payment = await arService.getCustomerPaymentById(req.params.id as string);
    res.json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to fetch customer payment');
  }
}

export async function createPayment(req: Request, res: Response) {
  try {
    const payment = await arService.createCustomerPayment(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to create customer payment');
  }
}

export async function reversePayment(req: Request, res: Response) {
  try {
    const payment = await arService.reverseCustomerPayment(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to reverse customer payment');
  }
}

// ─── Reports ──────────────────────────────────────────────

export async function getCustomerStatement(req: Request, res: Response) {
  try {
    const { dateFrom, dateTo } = req.query;
    const result = await arService.getCustomerStatement(req.params.id as string, { dateFrom: dateFrom ? String(dateFrom) : undefined, dateTo: dateTo ? String(dateTo) : undefined });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch customer statement');
  }
}

export async function getAging(req: Request, res: Response) {
  try {
    const result = await arService.getArAging(req.query.asOf ? String(req.query.asOf) : undefined);
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch AR aging report');
  }
}

export async function getDashboard(req: Request, res: Response) {
  try {
    const result = await arService.getArDashboard(req.query.asOf ? String(req.query.asOf) : undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch AR dashboard');
  }
}
