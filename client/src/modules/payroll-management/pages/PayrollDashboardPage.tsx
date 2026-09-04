import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, Wallet, Receipt, MinusCircle, Banknote, Clock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as payrollApi from '../api';
import type { PayrollDashboard } from '../types';
import { fmtMoney } from '../../general-ledger/format';

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ElementType; tone: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-2xl font-bold text-gray-900 font-mono">{value}</p>
    </div>
  );
}

export default function PayrollDashboardPage() {
  const { showToast } = useApp();
  const [data, setData] = useState<PayrollDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await payrollApi.fetchPayrollDashboard());
    } catch (err: any) {
      showToast(err.message || 'Failed to load payroll dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-violet-950 via-violet-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300 shrink-0"><LayoutDashboard className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Payroll</h1><p className="text-xs text-violet-200/80 mt-0.5">Salary calculation, approval, and payment tracking.</p></div>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : (
        <>
          {data.currentPeriod && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">{data.currentPeriod.name} <span className="ml-2 text-[10px] font-bold uppercase text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">{data.currentPeriod.status}</span></h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Employees" value={String(data.currentPeriod.employeesProcessed)} icon={Users} tone="bg-violet-50 text-violet-600" />
                <StatCard label="Gross Salary" value={`৳${fmtMoney(data.currentPeriod.totalGrossSalary)}`} icon={Wallet} tone="bg-indigo-50 text-indigo-600" />
                <StatCard label="Tax" value={`৳${fmtMoney(data.currentPeriod.totalTax)}`} icon={Receipt} tone="bg-amber-50 text-amber-600" />
                <StatCard label="Deductions" value={`৳${fmtMoney(data.currentPeriod.totalDeductions)}`} icon={MinusCircle} tone="bg-rose-50 text-rose-600" />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <StatCard label="Net Payroll" value={`৳${fmtMoney(data.currentPeriod.totalNetSalary)}`} icon={Banknote} tone="bg-emerald-50 text-emerald-600" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Pending Approval" value={String(data.pendingApprovalCount)} icon={Clock} tone="bg-amber-50 text-amber-600" />
            <StatCard label="Paid Periods" value={String(data.paidPeriodsCount)} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Total Paid (All Time)" value={`৳${fmtMoney(data.totalPaidNetAllTime)}`} icon={Banknote} tone="bg-violet-50 text-violet-600" />
          </div>
        </>
      )}
    </div>
  );
}
