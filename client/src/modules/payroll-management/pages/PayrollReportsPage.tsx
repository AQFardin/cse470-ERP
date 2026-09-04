import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as payrollApi from '../api';
import type { PayrollPeriod, PayrollRecord } from '../types';
import { fmtMoney } from '../../general-ledger/format';

const REPORT_TABS = [
  { key: 'summary', label: 'Payroll Summary' },
  { key: 'tax', label: 'Tax Summary' },
  { key: 'salary-expense', label: 'Salary Expense' },
  { key: 'payments', label: 'Payment Report' },
] as const;

export default function PayrollReportsPage() {
  const { showToast } = useApp();
  const [tab, setTab] = useState<(typeof REPORT_TABS)[number]['key']>('summary');
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [periodId, setPeriodId] = useState('');

  useEffect(() => {
    payrollApi.fetchPayrollPeriods({ status: 'ALL', pageSize: 100 }).then((res) => {
      setPeriods(res.periods);
      if (res.periods.length > 0) setPeriodId(res.periods[0].id);
    }).catch((err) => showToast(err.message || 'Failed to load periods', 'error'));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-violet-950 via-violet-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300 shrink-0"><BarChart3 className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Payroll Reports</h1><p className="text-xs text-violet-200/80 mt-0.5">Summary, tax, salary expense, and payment reports.</p></div>
      </div>

      <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-gray-200 shadow-xs w-fit">
        {REPORT_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${tab === t.key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{t.label}</button>
        ))}
      </div>

      {tab !== 'payments' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
            {periods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
          </select>
        </div>
      )}

      {tab === 'summary' && periodId && <SummaryReport periodId={periodId} />}
      {tab === 'tax' && periodId && <TaxReport periodId={periodId} />}
      {tab === 'salary-expense' && <SalaryExpenseReport />}
      {tab === 'payments' && <PaymentsReport />}
    </div>
  );
}

function SummaryReport({ periodId }: { periodId: string }) {
  const { showToast } = useApp();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [totals, setTotals] = useState<any>(null);
  useEffect(() => { payrollApi.fetchPayrollSummaryReport(periodId).then((r) => { setRecords(r.records); setTotals(r.totals); }).catch((e) => showToast(e.message, 'error')); }, [periodId]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Employee</th><th className="text-right px-4 py-3">Gross</th><th className="text-right px-4 py-3">Tax</th><th className="text-right px-4 py-3">Deductions</th><th className="text-right px-4 py-3">Net</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {records.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records for this period yet.</td></tr> :
            records.map((r) => (<tr key={r.id}><td className="px-4 py-3">{r.employee.firstName} {r.employee.lastName}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(r.grossEarnings)}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(r.taxAmount)}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(r.totalDeductions)}</td><td className="px-4 py-3 text-right font-mono font-bold">{fmtMoney(r.netSalary)}</td></tr>))}
        </tbody>
        {totals && records.length > 0 && (
          <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold"><tr><td className="px-4 py-3">TOTAL</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.totalGross)}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.totalTax)}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.totalDeductions)}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.totalNet)}</td></tr></tfoot>
        )}
      </table>
    </div>
  );
}

function TaxReport({ periodId }: { periodId: string }) {
  const { showToast } = useApp();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [totalTax, setTotalTax] = useState<string | number>(0);
  useEffect(() => { payrollApi.fetchTaxReport(periodId).then((r) => { setRecords(r.records); setTotalTax(r.totalTax); }).catch((e) => showToast(e.message, 'error')); }, [periodId]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Employee</th><th className="text-right px-4 py-3">Taxable Income</th><th className="text-right px-4 py-3">Tax</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {records.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No records for this period yet.</td></tr> :
            records.map((r) => (<tr key={r.id}><td className="px-4 py-3">{r.employee.firstName} {r.employee.lastName}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(r.taxableIncome)}</td><td className="px-4 py-3 text-right font-mono font-bold">{fmtMoney(r.taxAmount)}</td></tr>))}
        </tbody>
        {records.length > 0 && <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold"><tr><td className="px-4 py-3" colSpan={2}>TOTAL TAX</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(totalTax)}</td></tr></tfoot>}
      </table>
    </div>
  );
}

function SalaryExpenseReport() {
  const { showToast } = useApp();
  const [rows, setRows] = useState<{ periodId: string; periodName: string; grossSalary: string | number; bonus: string | number; otherCosts: string | number; total: string | number }[]>([]);
  useEffect(() => { payrollApi.fetchSalaryExpenseReport().then(setRows).catch((e) => showToast(e.message, 'error')); }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Period</th><th className="text-right px-4 py-3">Gross Salary</th><th className="text-right px-4 py-3">Bonus</th><th className="text-right px-4 py-3">Other Costs</th><th className="text-right px-4 py-3">Total</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No approved/paid periods yet.</td></tr> :
            rows.map((r) => (<tr key={r.periodId}><td className="px-4 py-3">{r.periodName}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(r.grossSalary)}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(r.bonus)}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(r.otherCosts)}</td><td className="px-4 py-3 text-right font-mono font-bold">{fmtMoney(r.total)}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsReport() {
  const { showToast } = useApp();
  const [payments, setPayments] = useState<any[]>([]);
  useEffect(() => { payrollApi.fetchPayrollPayments().then(setPayments).catch((e) => showToast(e.message, 'error')); }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Period</th><th className="text-right px-4 py-3">Net Salary</th><th className="text-left px-4 py-3">Payment Date</th><th className="text-left px-4 py-3">Method</th><th className="text-left px-4 py-3">Reference</th><th className="text-left px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {payments.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No payroll payments yet.</td></tr> :
            payments.map((p) => (<tr key={p.id}><td className="px-4 py-3">{p.payrollPeriod?.name}</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(p.amount)}</td><td className="px-4 py-3">{p.paymentDate?.split('T')[0]}</td><td className="px-4 py-3 text-gray-500">{p.paymentMethod?.replace('_', ' ')}</td><td className="px-4 py-3 text-gray-500">{p.referenceNumber || '—'}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.status === 'REVERSED' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>{p.status}</span></td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
