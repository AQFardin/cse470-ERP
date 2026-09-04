import React, { useState, useEffect, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as budgetApi from '../api';
import type { DepartmentDashboard, Department } from '../types';
import { fmtMoney } from '../../general-ledger/format';

const DEPARTMENTS: Department[] = ['ENGINEERING', 'HR', 'FINANCE', 'MARKETING', 'SALES', 'OPERATIONS'];

export default function DepartmentDashboardPage() {
  const { showToast } = useApp();
  const [department, setDepartment] = useState<Department>('ENGINEERING');
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState<DepartmentDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await budgetApi.fetchDepartmentDashboard(department, fiscalYear ? Number(fiscalYear) : undefined));
    } catch (err: any) {
      showToast(err.message || 'Failed to load department dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [department, fiscalYear, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0"><Building2 className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Department Budget</h1><p className="text-xs text-teal-200/80 mt-0.5">Account-level breakdown for a single department.</p></div>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <select value={department} onChange={(e) => setDepartment(e.target.value as Department)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-xs font-medium text-gray-500">Fiscal Year:</span>
        <input type="number" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className="w-28 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold" />
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-[10px] font-bold text-gray-400 uppercase">Annual Budget</p><p className="text-lg font-bold font-mono text-gray-900">৳{fmtMoney(data.budget)}</p></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase">Actual Spending</p><p className="text-lg font-bold font-mono text-gray-900">৳{fmtMoney(data.actual)}</p></div>
            <div><p className="text-[10px] font-bold text-gray-400 uppercase">Remaining</p><p className={`text-lg font-bold font-mono ${data.status === 'OVER_BUDGET' ? 'text-rose-600' : 'text-emerald-600'}`}>৳{fmtMoney(data.variance)}</p></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Utilization</p>
              <p className="text-lg font-bold font-mono text-gray-900">{data.utilizationPercent === null ? 'N/A' : `${data.utilizationPercent.toFixed(0)}%`}</p>
              {data.utilizationPercent !== null && <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1"><div className={`h-full ${data.utilizationPercent > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, data.utilizationPercent)}%` }} /></div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-xs font-bold text-gray-700">Account Breakdown</h2></div>
            {data.accounts.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">No active budget lines for this department.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Account</th><th className="text-right px-4 py-3">Budget</th><th className="text-right px-4 py-3">Actual</th><th className="text-right px-4 py-3">Variance</th><th className="text-left px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {data.accounts.map((a) => (
                    <tr key={a.account.id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-mono">{a.account.code} {a.account.name}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(a.budget)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(a.actual)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${a.status === 'OVER_BUDGET' ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(a.variance)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${a.status === 'OVER_BUDGET' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>{a.status.replace('_', ' ')}</span></td>
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
