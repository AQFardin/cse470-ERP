import React, { useState, useEffect, useCallback } from 'react';
import { Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as glApi from '../api';
import type { TrialBalanceResult } from '../types';
import { fmtMoney } from '../format';

export default function TrialBalancePage() {
  const { showToast } = useApp();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [result, setResult] = useState<TrialBalanceResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await glApi.fetchTrialBalance({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      setResult(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to compute trial balance', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
          <Scale className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display tracking-tight text-white">Trial Balance</h1>
          <p className="text-xs text-emerald-200/80 mt-0.5">Total debits must equal total credits across all posted accounts.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <span className="text-xs font-medium text-gray-500">Period:</span>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : result ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Account</th>
                <th className="text-right px-4 py-3">Debit</th>
                <th className="text-right px-4 py-3">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No posted activity in this period.</td></tr>
              ) : result.rows.map((r) => (
                <tr key={r.account.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <span className="font-mono text-gray-500 mr-2">{r.account.code}</span>{r.account.name}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.debit) > 0 ? fmtMoney(r.debit) : ''}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.credit) > 0 ? fmtMoney(r.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
              <tr>
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(result.totalDebit)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(result.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>

          <div className={`px-5 py-4 flex items-center justify-between border-t ${result.isBalanced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
            <div className="flex items-center gap-2">
              {result.isBalanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span className={`text-xs font-bold ${result.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                {result.isBalanced ? 'Balanced' : 'Unbalanced'}
              </span>
            </div>
            <span className="text-xs font-mono text-gray-600">Difference: {fmtMoney(Math.abs(Number(result.difference)))}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
