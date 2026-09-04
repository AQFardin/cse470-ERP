import React, { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import { useFinancialManagement } from '../../context/FinancialManagementContext';
import * as finApi from '../../api';
import type { StatementRow } from '../../types';
import { fmtMoney, fmtDate } from '../../../general-ledger/format';

export default function CustomerStatementPage() {
  const { showToast } = useApp();
  const { customers } = useFinancialManagement();
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!customerId && customers.length > 0) setCustomerId(customers[0].id); }, [customers, customerId]);

  const load = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const res = await finApi.fetchCustomerStatement(customerId, { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      setRows(res.rows);
      setClosingBalance(Number(res.closingBalance));
    } catch (err: any) {
      showToast(err.message || 'Failed to load customer statement', 'error');
    } finally {
      setLoading(false);
    }
  }, [customerId, dateFrom, dateTo, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0"><FileText className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Customer Statement</h1><p className="text-xs text-blue-200/80 mt-0.5">Invoices and payments for a single customer, with running balance.</p></div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="flex-1 min-w-[200px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          {customers.map((c) => <option key={c.id} value={c.id}>{c.customerId} — {c.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No activity for this customer in this range.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Reference</th><th className="text-left px-4 py-3">Description</th><th className="text-right px-4 py-3">Debit</th><th className="text-right px-4 py-3">Credit</th><th className="text-right px-4 py-3">Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 text-gray-600">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{r.reference}</td>
                  <td className="px-4 py-3">{r.description}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.debit) > 0 ? fmtMoney(r.debit) : ''}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.credit) > 0 ? fmtMoney(r.credit) : ''}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{fmtMoney(r.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
              <tr><td className="px-4 py-3" colSpan={5}>Closing Balance (amount owed by customer)</td><td className="px-4 py-3 text-right font-mono">{fmtMoney(closingBalance)}</td></tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
