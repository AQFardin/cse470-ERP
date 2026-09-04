import { Request, Response } from 'express';
import { PayrollPeriodStatus, PaymentRecordStatus } from '@prisma/client';
import * as payrollService from '../services/payroll.service';
import { PayrollError } from '../shared/payroll.util';
import { userHasPermission } from '../../../src/middleware/authorize';

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof PayrollError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

// ─── Periods ──────────────────────────────────────────────

export async function getPeriods(req: Request, res: Response) {
  try {
    const { status, page, pageSize } = req.query;
    const result = await payrollService.listPayrollPeriods({
      status: status && status !== 'ALL' ? (status as PayrollPeriodStatus) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch payroll periods');
  }
}

export async function getPeriod(req: Request, res: Response) {
  try {
    const period = await payrollService.getPayrollPeriodById(req.params.id as string);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to fetch payroll period');
  }
}

export async function createPeriod(req: Request, res: Response) {
  try {
    const period = await payrollService.createPayrollPeriod(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to create payroll period');
  }
}

export async function calculatePeriod(req: Request, res: Response) {
  try {
    const result = await payrollService.calculatePayrollPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: result.period, processedCount: result.processedCount, skippedCount: result.skippedCount });
  } catch (error) {
    handleError(res, error, 'Failed to calculate payroll');
  }
}

export async function approvePeriod(req: Request, res: Response) {
  try {
    const period = await payrollService.approvePayrollPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to approve payroll');
  }
}

export async function cancelPeriod(req: Request, res: Response) {
  try {
    const period = await payrollService.cancelPayrollPeriod(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: period });
  } catch (error) {
    handleError(res, error, 'Failed to cancel payroll period');
  }
}

// ─── Payments ─────────────────────────────────────────────

export async function getPayments(req: Request, res: Response) {
  try {
    const { payrollPeriodId, status } = req.query;
    const payments = await payrollService.listPayrollPayments({
      payrollPeriodId: payrollPeriodId ? String(payrollPeriodId) : undefined,
      status: status && status !== 'ALL' ? (status as PaymentRecordStatus) : undefined,
    });
    res.json({ success: true, data: payments, count: payments.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch payroll payments');
  }
}

export async function createPayment(req: Request, res: Response) {
  try {
    const payment = await payrollService.createPayrollPayment(req.body, req.currentUser!.id);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to process payroll payment');
  }
}

export async function reversePayment(req: Request, res: Response) {
  try {
    const payment = await payrollService.reversePayrollPayment(req.params.id as string, req.currentUser!.id);
    res.json({ success: true, data: payment });
  } catch (error) {
    handleError(res, error, 'Failed to reverse payroll payment');
  }
}

// ─── Payslip ──────────────────────────────────────────────

export async function getPayslip(req: Request, res: Response) {
  try {
    const { employeeId } = req.params;
    const { periodId } = req.query;
    if (!periodId) {
      res.status(400).json({ success: false, error: 'periodId query parameter is required' });
      return;
    }

    // Employees can always view their own payslip; viewing someone else's
    // requires the broader payroll report permission.
    const isOwnPayslip = req.currentUser!.employeeId === employeeId;
    if (!isOwnPayslip) {
      const allowed = await userHasPermission(req.currentUser!.roles, 'payroll', 'view_reports');
      if (!allowed) {
        res.status(403).json({ success: false, error: "Forbidden: you can only view your own payslip without 'payroll.view_reports' permission" });
        return;
      }
    }

    const payslip = await payrollService.getPayslip(employeeId as string, String(periodId));
    res.json({ success: true, data: payslip });
  } catch (error) {
    handleError(res, error, 'Failed to fetch payslip');
  }
}

// ─── Dashboard & Reports ───────────────────────────────────

export async function getDashboard(_req: Request, res: Response) {
  try {
    const data = await payrollService.getPayrollDashboard();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Failed to fetch payroll dashboard');
  }
}

export async function getSummaryReport(req: Request, res: Response) {
  try {
    const { periodId } = req.query;
    if (!periodId) { res.status(400).json({ success: false, error: 'periodId query parameter is required' }); return; }
    const result = await payrollService.getPayrollSummaryReport(String(periodId));
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch payroll summary report');
  }
}

export async function getTaxReport(req: Request, res: Response) {
  try {
    const { periodId } = req.query;
    if (!periodId) { res.status(400).json({ success: false, error: 'periodId query parameter is required' }); return; }
    const result = await payrollService.getTaxSummaryReport(String(periodId));
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch tax summary report');
  }
}

export async function getSalaryExpenseReport(req: Request, res: Response) {
  try {
    const { dateFrom, dateTo } = req.query;
    const result = await payrollService.getSalaryExpenseSummaryReport({ dateFrom: dateFrom ? String(dateFrom) : undefined, dateTo: dateTo ? String(dateTo) : undefined });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, 'Failed to fetch salary expense report');
  }
}

export async function getPaymentsReport(req: Request, res: Response) {
  try {
    const payments = await payrollService.listPayrollPayments({});
    res.json({ success: true, data: payments, count: payments.length });
  } catch (error) {
    handleError(res, error, 'Failed to fetch payroll payment report');
  }
}
