import React, { useState, useEffect, useCallback } from 'react';
import { FileBarChart, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as glApi from '../api';
import type { BalanceSheetResult, IncomeStatementResult, CashFlowStatementResult } from '../types';
import { fmtMoney, fmtDate } from '../format';

type StatementTab = 'balance-sheet' | 'income-statement' | 'cash-flow';

const TABS: { key: StatementTab; label: string }[] = [
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'income-statement', label: 'Income Statement' },
  { key: 'cash-flow', label: 'Cash Flow Statement' },
];

function firstOfYear() { return `${new Date().getFullYear()}-01-01`; }
function today() { return new Date().toISOString().split('T')[0]; }

export default function FinancialStatementsPage() {
  const { showToast } = useApp();
  const [tab, setTab] = useState<StatementTab>('balance-sheet');
  const [asOfDate, setAsOfDate] = useState(today());
  const [startDate, setStartDate] = useState(firstOfYear());
  const [endDate, setEndDate] = useState(today());

  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResult | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementResult | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowStatementResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (tab === 'balance-sheet') setBalanceSheet(await glApi.fetchBalanceSheet(asOfDate));
      else if (tab === 'income-statement') setIncomeStatement(await glApi.fetchIncomeStatement(startDate, endDate));
      else setCashFlow(await glApi.fetchCashFlowStatement(startDate, endDate));
    } catch (err: any) {
      showToast(err.message || 'Failed to load financial statement', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, asOfDate, startDate, endDate, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0"><FileBarChart className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Financial Statements</h1><p className="text-xs text-emerald-200/80 mt-0.5">Balance Sheet, Income Statement, and Cash Flow Statement.</p></div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${tab === t.key ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'balance-sheet' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">As of:</span>
            <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : tab === 'balance-sheet' && balanceSheet ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="p-5">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Assets</h3>
              {balanceSheet.assets.map((l) => (
                <div key={l.account.id} className="flex justify-between text-xs py-1.5"><span className="text-gray-600">{l.account.code} {l.account.name}</span><span className="font-mono">{fmtMoney(l.amount)}</span></div>
              ))}
              <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-gray-200"><span>Total Assets</span><span className="font-mono">{fmtMoney(balanceSheet.totalAssets)}</span></div>
            </div>
            <div className="p-5">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Liabilities</h3>
              {balanceSheet.liabilities.map((l) => (
                <div key={l.account.id} className="flex justify-between text-xs py-1.5"><span className="text-gray-600">{l.account.code} {l.account.name}</span><span className="font-mono">{fmtMoney(l.amount)}</span></div>
              ))}
              <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-gray-200"><span>Total Liabilities</span><span className="font-mono">{fmtMoney(balanceSheet.totalLiabilities)}</span></div>

              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 mt-5">Equity</h3>
              {balanceSheet.equity.map((l) => (
                <div key={l.account.id} className="flex justify-between text-xs py-1.5"><span className="text-gray-600">{l.account.code} {l.account.name}</span><span className="font-mono">{fmtMoney(l.amount)}</span></div>
              ))}
              <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-gray-200"><span>Total Equity</span><span className="font-mono">{fmtMoney(balanceSheet.totalEquity)}</span></div>
            </div>
          </div>
          <div className={`px-5 py-4 flex items-center gap-2 border-t ${balanceSheet.isBalanced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
            {balanceSheet.isBalanced ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span className={`text-xs font-bold ${balanceSheet.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>Assets {balanceSheet.isBalanced ? '=' : '≠'} Liabilities + Equity</span>
          </div>
        </div>
      ) : tab === 'income-statement' && incomeStatement ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Revenue</h3>
          {incomeStatement.revenue.length === 0 ? <p className="text-xs text-gray-400 py-2">No revenue in this period.</p> : incomeStatement.revenue.map((l) => (
            <div key={l.account.id} className="flex justify-between text-xs py-1.5"><span className="text-gray-600">{l.account.code} {l.account.name}</span><span className="font-mono">{fmtMoney(l.amount)}</span></div>
          ))}
          <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-gray-200"><span>Total Revenue</span><span className="font-mono">{fmtMoney(incomeStatement.totalRevenue)}</span></div>

          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 mt-5">Expenses</h3>
          {incomeStatement.expense.length === 0 ? <p className="text-xs text-gray-400 py-2">No expenses in this period.</p> : incomeStatement.expense.map((l) => (
            <div key={l.account.id} className="flex justify-between text-xs py-1.5"><span className="text-gray-600">{l.account.code} {l.account.name}</span><span className="font-mono">{fmtMoney(l.amount)}</span></div>
          ))}
          <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-gray-200"><span>Total Expenses</span><span className="font-mono">{fmtMoney(incomeStatement.totalExpense)}</span></div>

          <div className={`flex justify-between text-sm font-bold pt-4 mt-4 border-t-2 border-gray-200 ${Number(incomeStatement.netIncome) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            <span>Net Income</span><span className="font-mono">{fmtMoney(incomeStatement.netIncome)}</span>
          </div>
        </div>
      ) : tab === 'cash-flow' && cashFlow ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-gray-600">Operating Activities</span><span className="font-mono font-semibold">{fmtMoney(cashFlow.operating)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-600">Investing Activities</span><span className="font-mono font-semibold">{fmtMoney(cashFlow.investing)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-600">Financing Activities</span><span className="font-mono font-semibold">{fmtMoney(cashFlow.financing)}</span></div>
            <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-gray-200"><span>Net Change in Cash</span><span className="font-mono">{fmtMoney(cashFlow.netCashChange)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-600">Opening Cash</span><span className="font-mono">{fmtMoney(cashFlow.openingCash)}</span></div>
            <div className="flex justify-between text-xs font-bold"><span>Closing Cash</span><span className="font-mono">{fmtMoney(cashFlow.closingCash)}</span></div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Account</th><th className="text-left px-4 py-3">Category</th><th className="text-right px-4 py-3">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {cashFlow.movements.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No cash movements in this period.</td></tr>
                ) : cashFlow.movements.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">{fmtDate(m.date)}</td>
                    <td className="px-4 py-3">{m.account}</td>
                    <td className="px-4 py-3 text-gray-500">{m.category}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtMoney(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
