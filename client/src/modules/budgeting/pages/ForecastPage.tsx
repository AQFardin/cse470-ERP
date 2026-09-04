import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as budgetApi from '../api';
import type { ForecastResult, Budget } from '../types';
import { fmtMoney } from '../../general-ledger/format';

const STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  EXPECTED_OVERRUN: { text: 'Expected to exceed budget', tone: 'bg-rose-50 border-rose-200 text-rose-700' },
  EXPECTED_WITHIN_BUDGET: { text: 'Expected to stay within budget', tone: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  ON_TRACK: { text: 'On track — close to budget', tone: 'bg-amber-50 border-amber-200 text-amber-700' },
  NO_BUDGET: { text: 'No budget set', tone: 'bg-gray-50 border-gray-200 text-gray-600' },
};

export default function ForecastPage() {
  const { hasPermission, showToast } = useApp();
  const canCalculate = hasPermission('budget', 'calculate_forecast');

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetId, setBudgetId] = useState('');
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    budgetApi.fetchBudgets({ status: 'ACTIVE', pageSize: 100 }).then((res) => {
      setBudgets(res.budgets);
      if (res.budgets.length > 0) setBudgetId(res.budgets[0].id);
    }).catch((e) => showToast(e.message, 'error'));
  }, []);

  const load = useCallback(async () => {
    if (!budgetId) return;
    try {
      setLoading(true);
      setForecast(await budgetApi.fetchForecast(budgetId));
    } catch (err: any) {
      showToast(err.message || 'Failed to load forecast', 'error');
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, [budgetId, showToast]);

  useEffect(() => { load(); }, [load]);

  const recalculate = async () => {
    if (!budgetId) return;
    try {
      setCalculating(true);
      const result = await budgetApi.calculateForecast(budgetId);
      setForecast({ ...result, departments: forecast?.departments || [] });
      showToast('Forecast recalculated', 'success');
      load();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setCalculating(false);
    }
  };

  const statusInfo = forecast ? STATUS_LABEL[forecast.status] : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0"><TrendingUp className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Forecast</h1><p className="text-xs text-teal-200/80 mt-0.5">Run-rate projection from year-to-date actuals — transparent and auditable.</p></div>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <select value={budgetId} onChange={(e) => setBudgetId(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          {budgets.length === 0 ? <option value="">No active budgets</option> : budgets.map((b) => <option key={b.id} value={b.id}>{b.name} (FY {b.fiscalYear})</option>)}
        </select>
        {canCalculate && <button onClick={recalculate} disabled={calculating || !budgetId} className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} /> Calculate</button>}
      </div>

      {loading || !forecast ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">{budgets.length === 0 ? 'No active budgets to forecast.' : 'Loading...'}</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-1">{forecast.budget.name}</h2>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide mb-4">Method: {forecast.method} · {forecast.monthsElapsed} of {forecast.totalMonths} months elapsed</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-[10px] font-bold text-gray-400 uppercase">Budget</p><p className="text-lg font-bold font-mono text-gray-900">৳{fmtMoney(forecast.totalBudget)}</p></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase">Actual YTD</p><p className="text-lg font-bold font-mono text-gray-900">৳{fmtMoney(forecast.actualYtd)}</p></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase">Projected Actual</p><p className="text-lg font-bold font-mono text-gray-900">৳{fmtMoney(forecast.projectedAnnualActual)}</p></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase">Forecast Variance</p><p className={`text-lg font-bold font-mono ${Number(forecast.forecastVariance) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Number(forecast.forecastVariance) < 0 ? '-' : ''}৳{fmtMoney(Math.abs(Number(forecast.forecastVariance)))}</p></div>
            </div>
            {statusInfo && <div className={`mt-4 border rounded-xl p-3 text-xs font-semibold ${statusInfo.tone}`}>Status: {statusInfo.text}</div>}
          </div>

          {forecast.departments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-xs font-bold text-gray-700">Forecast by Department</h2></div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Department</th><th className="text-right px-4 py-3">Budget</th><th className="text-right px-4 py-3">Actual YTD</th><th className="text-right px-4 py-3">Forecast</th><th className="text-right px-4 py-3">Expected Variance</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {forecast.departments.map((d) => (
                    <tr key={d.department || 'none'} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-semibold text-gray-800">{d.department || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(d.budget)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(d.actualYtd)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(d.projectedAnnualActual)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${Number(d.forecastVariance) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMoney(d.forecastVariance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
