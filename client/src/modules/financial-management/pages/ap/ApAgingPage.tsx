import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import * as finApi from '../../api';
import type { Vendor, AgingBuckets } from '../../types';
import { fmtMoney } from '../../../general-ledger/format';

export default function ApAgingPage() {
  const { showToast } = useApp();
  const [rows, setRows] = useState<{ vendor: Vendor; buckets: AgingBuckets }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await finApi.fetchApAging();
      setRows(res.rows);
    } catch (err: any) {
      showToast(err.message || 'Failed to load AP aging report', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const totals = rows.reduce((acc, r) => ({
    current: acc.current + Number(r.buckets.current), d1_30: acc.d1_30 + Number(r.buckets.d1_30),
    d31_60: acc.d31_60 + Number(r.buckets.d31_60), d61_90: acc.d61_90 + Number(r.buckets.d61_90), d90plus: acc.d90plus + Number(r.buckets.d90plus),
  }), { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0"><AlertTriangle className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">AP Aging Report</h1><p className="text-xs text-rose-200/80 mt-0.5">Outstanding vendor bills grouped by how overdue they are.</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No outstanding vendor bills.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr><th className="text-left px-4 py-3">Vendor</th><th className="text-right px-4 py-3">Current</th><th className="text-right px-4 py-3">1-30 Days</th><th className="text-right px-4 py-3">31-60 Days</th><th className="text-right px-4 py-3">61-90 Days</th><th className="text-right px-4 py-3">90+ Days</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.vendor.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-medium text-gray-800"><span className="font-mono text-gray-400 mr-2">{r.vendor.vendorId}</span>{r.vendor.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtMoney(r.buckets.current)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtMoney(r.buckets.d1_30)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtMoney(r.buckets.d31_60)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtMoney(r.buckets.d61_90)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtMoney(r.buckets.d90plus)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
              <tr>
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.current)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.d1_30)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.d31_60)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.d61_90)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(totals.d90plus)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
