import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ArrowUpCircle, ArrowDownCircle, AlertTriangle, ClipboardList } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as complianceApi from '../api';
import type { ComplianceDashboard } from '../types';
import { fmtMoney, fmtDate } from '../../general-ledger/format';

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

export default function ComplianceDashboardPage() {
  const { showToast } = useApp();
  const [data, setData] = useState<ComplianceDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await complianceApi.fetchDashboard());
    } catch (err: any) {
      showToast(err.message || 'Failed to load compliance dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0"><ShieldCheck className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Compliance & Tax</h1><p className="text-xs text-teal-200/80 mt-0.5">VAT/GST configuration, calculation, and tax return tracking.</p></div>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Output Tax (Lifetime)" value={`৳${fmtMoney(data.totalOutputTax)}`} icon={ArrowUpCircle} tone="bg-indigo-50 text-indigo-600" />
            <StatCard label="Input Tax (Lifetime)" value={`৳${fmtMoney(data.totalInputTax)}`} icon={ArrowDownCircle} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Outstanding Liability" value={`৳${fmtMoney(data.outstandingLiability)}`} icon={AlertTriangle} tone="bg-rose-50 text-rose-600" />
            <StatCard label="Open Periods" value={String(data.openPeriods)} icon={ClipboardList} tone="bg-amber-50 text-amber-600" />
          </div>

          {data.unpaidFinalizedPeriods.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-800">Finalized/filed periods awaiting payment</p>
                <ul className="text-xs text-rose-700 mt-1 space-y-0.5">
                  {data.unpaidFinalizedPeriods.map((p) => (
                    <li key={p.id}>{p.name} — ৳{fmtMoney(p.netPayable ?? 0)} due {fmtDate(p.dueDate)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
            <h2 className="text-xs font-bold text-gray-700 mb-3">Latest Tax Period</h2>
            {!data.latestPeriod ? (
              <div className="text-center text-gray-400 text-sm py-8">No tax periods created yet.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div><p className="text-gray-500">Name</p><p className="font-semibold text-gray-800 mt-0.5">{data.latestPeriod.name}</p></div>
                <div><p className="text-gray-500">Status</p><p className="font-semibold text-gray-800 mt-0.5">{data.latestPeriod.status}</p></div>
                <div><p className="text-gray-500">Output Tax</p><p className="font-mono font-semibold text-gray-800 mt-0.5">{data.latestPeriod.outputTax !== null ? fmtMoney(data.latestPeriod.outputTax) : '—'}</p></div>
                <div><p className="text-gray-500">Net Payable</p><p className="font-mono font-semibold text-gray-800 mt-0.5">{data.latestPeriod.netPayable !== null ? fmtMoney(data.latestPeriod.netPayable) : '—'}</p></div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-400">Active tax codes: {data.activeTaxCodes}</p>
        </>
      )}
    </div>
  );
}
