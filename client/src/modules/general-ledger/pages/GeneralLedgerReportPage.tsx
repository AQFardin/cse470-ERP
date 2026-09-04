import React, { useState, useEffect, useCallback } from 'react';
import { BookMarked, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useGeneralLedger } from '../context/GeneralLedgerContext';
import * as glApi from '../api';
import type { AccountLedgerResult } from '../types';
import { fmtMoney, fmtDate } from '../format';

export default function GeneralLedgerReportPage() {
  const { showToast } = useApp();
  const { activeAccounts } = useGeneralLedger();

  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reference, setReference] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AccountLedgerResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId && activeAccounts.length > 0) {
      setAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, accountId]);

  const load = useCallback(async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      const res = await glApi.fetchAccountLedger(accountId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        reference: reference || undefined,
        page,
        pageSize: 25,
      });
      setResult(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load general ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [accountId, dateFrom, dateTo, reference, page, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [accountId, dateFrom, dateTo, reference]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
          <BookMarked className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display tracking-tight text-white">General Ledger</h1>
          <p className="text-xs text-emerald-200/80 mt-0.5">Posted &amp; locked transactions with a running balance, per account.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
        >
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Filter by reference #"
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs w-40"
        />
      </div>

      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">{result.account.code} — {result.account.name}</h2>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{result.account.type}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Opening Balance</p>
              <p className="text-sm font-mono font-bold text-gray-800">{fmtMoney(result.openingBalance)}</p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
          ) : result.rows.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No posted transactions in this range.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-right px-4 py-3">Debit</th>
                  <th className="text-right px-4 py-3">Credit</th>
                  <th className="text-right px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-gray-600">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800">{r.reference}</td>
                    <td className="px-4 py-3 text-gray-700">{r.description}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.debit) > 0 ? fmtMoney(r.debit) : ''}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.credit) > 0 ? fmtMoney(r.credit) : ''}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{fmtMoney(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {result.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              <span>{result.total} transactions · page {result.page} of {result.totalPages}</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 cursor-pointer">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 cursor-pointer">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
