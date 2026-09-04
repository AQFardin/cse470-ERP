import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Wallet, CalendarClock, CalendarRange, AlertTriangle, CircleDollarSign, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import * as finApi from '../../api';
import type { DashboardSummary } from '../../types';
import { fmtMoney } from '../../../general-ledger/format';

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ElementType; tone: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-2xl font-bold text-gray-900 font-mono">৳{value}</p>
    </div>
  );
}

export default function ArDashboardPage() {
  const { showToast } = useApp();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await finApi.fetchArDashboard();
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load AR dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0"><LayoutDashboard className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Accounts Receivable</h1><p className="text-xs text-blue-200/80 mt-0.5">What customers currently owe the company.</p></div>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Outstanding" value={fmtMoney(data.totalOutstanding)} icon={Wallet} tone="bg-blue-50 text-blue-600" />
          <StatCard label="Due Today" value={fmtMoney(data.dueToday)} icon={CalendarClock} tone="bg-amber-50 text-amber-600" />
          <StatCard label="Due This Week" value={fmtMoney(data.dueThisWeek)} icon={CalendarRange} tone="bg-indigo-50 text-indigo-600" />
          <StatCard label="Overdue" value={fmtMoney(data.overdue)} icon={AlertTriangle} tone="bg-red-50 text-red-600" />
          <StatCard label={`Partially Paid (${data.partiallyPaid.count})`} value={fmtMoney(data.partiallyPaid.amount)} icon={CircleDollarSign} tone="bg-orange-50 text-orange-600" />
          <StatCard label={`Paid (${data.paid.count})`} value={fmtMoney(data.paid.amount)} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
        </div>
      )}
    </div>
  );
}
