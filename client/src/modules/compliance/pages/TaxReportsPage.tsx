import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, ArrowUpCircle, ArrowDownCircle, Scale } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as complianceApi from '../api';
import type { TaxSummaryReport, TaxLiabilityReport } from '../types';
import { fmtMoney } from '../../general-ledger/format';

type ReportTab = 'sales' | 'purchase' | 'liability';

const REPORT_TABS: { key: ReportTab; label: string; icon: React.ElementType }[] = [
  { key: 'sales', label: 'Sales Tax (Output)', icon: ArrowUpCircle },
  { key: 'purchase', label: 'Purchase Tax (Input)', icon: ArrowDownCircle },
  { key: 'liability', label: 'Tax Liability', icon: Scale },
];

export default function TaxReportsPage() {
  const { showToast } = useApp();
  const [tab, setTab] = useState<ReportTab>('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState<TaxSummaryReport | null>(null);
  const [liability, setLiability] = useState<TaxLiabilityReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (tab === 'sales') setSummary(await complianceApi.fetchSalesTaxReport(from || undefined, to || undefined));
      else if (tab === 'purchase') setSummary(await complianceApi.fetchPurchaseTaxReport(from || undefined, to || undefined));
      else setLiability(await complianceApi.fetchTaxLiabilityReport());
    } catch (err: any) {
      showToast(err.message || 'Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, from, to, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
        <div><h2 className="text-lg font-bold text-gray-900">Tax Reports</h2><p className="text-xs text-gray-500">Sales tax, purchase tax, and liability across all tax periods.</p></div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {REPORT_TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === tab;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isActive ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
        {tab !== 'liability' && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : tab !== 'liability' ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {!summary || summary.lines.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No transactions in this range.</div>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr><th className="text-left px-4 py-3">Tax Code</th><th className="text-left px-4 py-3">Category</th><th className="text-right px-4 py-3">Transactions</th><th className="text-right px-4 py-3">Taxable Amount</th><th className="text-right px-4 py-3">Tax Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.lines.map((l, i) => (
                    <tr key={i} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-mono font-semibold">{l.taxCode?.code ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{l.taxCode?.category.replace('_', ' ') ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{l.transactionCount}</td>
                      <td className="px-4 py-3 text-right font-mono">৳{fmtMoney(l.taxableAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-teal-700">৳{fmtMoney(l.taxAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-700 text-xs">Total</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">৳{fmtMoney(summary.totals.taxableAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-teal-700">৳{fmtMoney(summary.totals.taxAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {liability && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4"><p className="text-[11px] text-gray-500 font-bold uppercase">Total Liability</p><p className="text-xl font-bold font-mono mt-1">৳{fmtMoney(liability.totalLiability)}</p></div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4"><p className="text-[11px] text-gray-500 font-bold uppercase">Total Paid</p><p className="text-xl font-bold font-mono mt-1 text-emerald-600">৳{fmtMoney(liability.totalPaid)}</p></div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4"><p className="text-[11px] text-gray-500 font-bold uppercase">Outstanding</p><p className="text-xl font-bold font-mono mt-1 text-rose-600">৳{fmtMoney(liability.totalOutstanding)}</p></div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {!liability || liability.periods.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">No calculated tax periods yet.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Output Tax</th><th className="text-right px-4 py-3">Input Tax</th><th className="text-right px-4 py-3">Net Payable</th><th className="text-right px-4 py-3">Paid</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {liability.periods.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-semibold">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.status}</td>
                      <td className="px-4 py-3 text-right font-mono">৳{fmtMoney(p.outputTax ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-mono">৳{fmtMoney(p.inputTax ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">৳{fmtMoney(p.netPayable ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.payment ? `৳${fmtMoney(p.payment.amount)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
