import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Wallet, Receipt, PiggyBank, AlertTriangle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as budgetApi from '../api';
import type { BudgetingDashboard } from '../types';
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

export default function BudgetingDashboardPage() {
  const { showToast } = useApp();
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState<BudgetingDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await budgetApi.fetchBudgetingDashboard(fiscalYear ? Number(fiscalYear) : undefined));
    } catch (err: any) {
      showToast(err.message || 'Failed to load budgeting dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0"><LayoutDashboard className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">{fiscalYear} Budget Dashboard</h1><p className="text-xs text-teal-200/80 mt-0.5">Active budgets vs. posted General Ledger actuals.</p></div>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <span className="text-xs font-medium text-gray-500">Fiscal Year:</span>
        <input type="number" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className="w-28 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold" />
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Budget" value={`৳${fmtMoney(data.totalBudget)}`} icon={Wallet} tone="bg-teal-50 text-teal-600" />
            <StatCard label="Total Actual" value={`৳${fmtMoney(data.totalActual)}`} icon={Receipt} tone="bg-indigo-50 text-indigo-600" />
            <StatCard label="Remaining Budget" value={`৳${fmtMoney(data.remaining)}`} icon={PiggyBank} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Utilization" value={data.utilizationPercent === null ? 'N/A' : `${data.utilizationPercent.toFixed(0)}%`} icon={LayoutDashboard} tone="bg-amber-50 text-amber-600" />
          </div>

          {data.overBudgetDepartments.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-800">Departments over budget</p>
                <p className="text-xs text-rose-700 mt-0.5">{data.overBudgetDepartments.map((d) => d.department).join(', ')}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-xs font-bold text-gray-700">Department Performance ({data.activeBudgetCount} active budget{data.activeBudgetCount === 1 ? '' : 's'})</h2></div>
            {data.departments.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">No active budgets for this fiscal year.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Department</th><th className="text-right px-4 py-3">Budget</th><th className="text-right px-4 py-3">Actual</th><th className="text-right px-4 py-3">Variance</th><th className="text-left px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {data.departments.map((d) => (
                    <tr key={d.department || 'none'} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-semibold text-gray-800">{d.department || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(d.budget)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(d.actual)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${d.status === 'OVER_BUDGET' ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(d.variance)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${d.status === 'OVER_BUDGET' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>{d.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
