import React, { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as payrollApi from '../api';
import type { PayrollRecord } from '../types';
import { fmtMoney, fmtDate } from '../../general-ledger/format';

export default function PayslipPage() {
  const { employees, currentUser, hasPermission, showToast } = useApp();
  const canViewOthers = hasPermission('payroll', 'view_reports');

  const selectableEmployees = canViewOthers ? employees : employees.filter((e) => e.id === currentUser?.employeeId);
  const [employeeId, setEmployeeId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [payslip, setPayslip] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!employeeId && selectableEmployees.length > 0) setEmployeeId(selectableEmployees[0].id);
  }, [selectableEmployees, employeeId]);

  useEffect(() => {
    payrollApi.fetchPayrollPeriods({ status: 'ALL', pageSize: 100 }).then((res) => {
      const paidOrApproved = res.periods.filter((p) => p.status === 'APPROVED' || p.status === 'PAID' || p.status === 'CALCULATED');
      setPeriods(paidOrApproved.map((p) => ({ id: p.id, name: p.name })));
      if (paidOrApproved.length > 0) setPeriodId(paidOrApproved[0].id);
    }).catch((e) => showToast(e.message, 'error'));
  }, []);

  const load = useCallback(async () => {
    if (!employeeId || !periodId) return;
    try {
      setLoading(true);
      setError('');
      setPayslip(await payrollApi.fetchPayslip(employeeId, periodId));
    } catch (err: any) {
      setPayslip(null);
      setError(err.message || 'No payslip found');
    } finally {
      setLoading(false);
    }
  }, [employeeId, periodId]);

  useEffect(() => { load(); }, [load]);

  const earningLines = payslip?.lines?.filter((l) => ['BASIC', 'ALLOWANCE', 'BONUS'].includes(l.category)) || [];
  const deductionLines = payslip?.lines?.filter((l) => ['DEDUCTION', 'TAX', 'UNPAID_LEAVE'].includes(l.category)) || [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-violet-950 via-violet-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300 shrink-0"><FileText className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Payslip</h1><p className="text-xs text-violet-200/80 mt-0.5">Exact snapshot values from a calculated payroll — never recalculated.</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!canViewOthers} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer disabled:opacity-60">
          {selectableEmployees.map((e) => <option key={e.id} value={e.id}>{e.employeeId} — {e.name}</option>)}
        </select>
        <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : error ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">{error}</div>
      ) : payslip ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-8 font-mono text-xs space-y-4">
          <div className="text-center border-b-2 border-dashed border-gray-200 pb-4">
            <p className="text-sm font-bold tracking-widest">PAYSLIP</p>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <span className="text-gray-500">Employee:</span><span className="text-right font-semibold">{payslip.employee.firstName} {payslip.employee.lastName}</span>
            <span className="text-gray-500">Employee ID:</span><span className="text-right">{payslip.employee.employeeId}</span>
            <span className="text-gray-500">Department:</span><span className="text-right">{payslip.departmentSnapshot}</span>
            <span className="text-gray-500">Period:</span><span className="text-right">{payslip.payrollPeriod?.name}</span>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3">
            <p className="font-bold mb-2">EARNINGS</p>
            {earningLines.map((l) => (<div key={l.id} className="flex justify-between"><span>{l.name}</span><span>৳{fmtMoney(l.amount)}</span></div>))}
            <div className="flex justify-between font-bold border-t border-gray-200 mt-2 pt-2"><span>Gross Salary</span><span>৳{fmtMoney(payslip.grossEarnings)}</span></div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3">
            <p className="font-bold mb-2">DEDUCTIONS</p>
            {deductionLines.length === 0 ? <p className="text-gray-400">None</p> : deductionLines.map((l) => (<div key={l.id} className="flex justify-between"><span>{l.name}</span><span>৳{fmtMoney(l.amount)}</span></div>))}
            <div className="flex justify-between font-bold border-t border-gray-200 mt-2 pt-2"><span>Total Deductions</span><span>৳{fmtMoney(payslip.totalDeductions)}</span></div>
          </div>

          <div className="border-t-2 border-dashed border-gray-300 pt-3 flex justify-between text-sm font-bold">
            <span>NET SALARY</span><span>৳{fmtMoney(payslip.netSalary)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
