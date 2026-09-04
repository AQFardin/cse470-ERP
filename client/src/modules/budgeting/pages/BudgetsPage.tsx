import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, Plus, Eye, Send, CheckCircle2, PlayCircle, Lock, Ban, Copy, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useGeneralLedger } from '../../general-ledger/context/GeneralLedgerContext';
import * as budgetApi from '../api';
import type { Budget, BudgetStatus, VsActualResult, MonthlyPerformanceRow, Department } from '../types';
import { fmtMoney, fmtDate } from '../../general-ledger/format';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  APPROVED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  CLOSED: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const VARIANCE_TONE: Record<string, string> = {
  UNDER_BUDGET: 'text-emerald-600',
  ON_BUDGET: 'text-gray-600',
  OVER_BUDGET: 'text-rose-600',
  NO_BUDGET: 'text-gray-400',
};

const DEPARTMENTS: Department[] = ['ENGINEERING', 'HR', 'FINANCE', 'MARKETING', 'SALES', 'OPERATIONS'];

interface LineDraft { department: string; accountId: string; annualAmount: string; notes: string }
const emptyLine = (): LineDraft => ({ department: '', accountId: '', annualAmount: '', notes: '' });

export default function BudgetsPage() {
  const { hasPermission, showToast } = useApp();
  const { activeAccounts } = useGeneralLedger();
  const budgetableAccounts = activeAccounts.filter((a) => a.type === 'EXPENSE' || a.type === 'REVENUE');

  const canCreate = hasPermission('budget', 'create');
  const canEdit = hasPermission('budget', 'edit');
  const canSubmit = hasPermission('budget', 'submit');
  const canApprove = hasPermission('budget', 'approve');
  const canActivate = hasPermission('budget', 'activate');
  const canClose = hasPermission('budget', 'close');
  const canCancel = hasPermission('budget', 'cancel');
  const canViewVsActual = hasPermission('budget', 'view_vs_actual');

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | BudgetStatus>('ALL');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await budgetApi.fetchBudgets({ status: statusFilter, pageSize: 50 });
      setBudgets(res.budgets);
    } catch (err: any) {
      showToast(err.message || 'Failed to load budgets', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  // ─── Create form ─────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    const year = new Date().getFullYear();
    setName(''); setFiscalYear(String(year)); setStartDate(`${year}-01-01`); setEndDate(`${year}-12-31`);
    setDescription(''); setLines([emptyLine()]); setFormError(''); setFormOpen(true);
  };

  const updateLine = (idx: number, patch: Partial<LineDraft>) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.annualAmount) || 0), 0), [lines]);

  const submitCreate = async () => {
    setFormError('');
    if (!name.trim() || !fiscalYear || !startDate || !endDate) { setFormError('Name, fiscal year, and dates are required'); return; }
    const payloadLines = lines.filter((l) => l.accountId && Number(l.annualAmount) >= 0).map((l) => ({ department: (l.department || undefined) as Department | undefined, accountId: l.accountId, annualAmount: Number(l.annualAmount) || 0, notes: l.notes || undefined }));
    if (payloadLines.length === 0) { setFormError('At least one budget line is required'); return; }
    try {
      setSubmitting(true);
      const budget = await budgetApi.createBudget({ name, fiscalYear: Number(fiscalYear), startDate, endDate, description: description || undefined, lines: payloadLines });
      showToast(`Budget "${budget.name}" created`, 'success');
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create budget');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Detail ──────────────────────────────────────────────
  const [detail, setDetail] = useState<Budget | null>(null);
  const [vsActual, setVsActual] = useState<VsActualResult | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPerformanceRow[]>([]);

  const openDetail = async (id: string) => {
    try {
      const budget = await budgetApi.fetchBudget(id);
      setDetail(budget);
      if (canViewVsActual && (budget.status === 'ACTIVE' || budget.status === 'CLOSED')) {
        const [va, mp] = await Promise.all([budgetApi.fetchVsActual(id), budgetApi.fetchMonthlyPerformance(id)]);
        setVsActual(va);
        setMonthly(mp.months);
      } else {
        setVsActual(null);
        setMonthly([]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load budget', 'error');
    }
  };
  const refreshDetail = async () => { if (detail) await openDetail(detail.id); };

  const runAction = async (action: () => Promise<Budget>, msg: string) => {
    try {
      await action();
      showToast(msg, 'success');
      load();
      refreshDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0"><Wallet className="w-6 h-6" /></div>
          <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Budgets</h1><p className="text-xs text-teal-200/80 mt-0.5">Draft → Submit → Approve → Activate → Close.</p></div>
        </div>
        {canCreate && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-teal-600/30 transition-all cursor-pointer shrink-0"><Plus className="w-4 h-4" /> New Budget</button>}
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <span className="text-xs font-medium text-gray-500">Status:</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          <option value="ALL">All</option><option value="DRAFT">Draft</option><option value="PENDING_APPROVAL">Pending Approval</option><option value="APPROVED">Approved</option><option value="ACTIVE">Active</option><option value="CLOSED">Closed</option><option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading budgets...</div>
        ) : budgets.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No budgets found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Fiscal Year</th><th className="text-right px-4 py-3">Lines</th><th className="text-left px-4 py-3">Version</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgets.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-semibold text-gray-800">{b.name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.fiscalYear}</td>
                  <td className="px-4 py-3 text-right">{b._count?.lines ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">v{b.version}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[b.status]}`}>{b.status.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center justify-end gap-1.5"><button onClick={() => openDetail(b.id)} title="View" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"><Eye className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-teal-600" />New Budget</h2>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-medium">{formError}</div>}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2"><label className="block font-semibold text-gray-700 mb-1">Budget Name *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026 IT Department Budget" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Fiscal Year *</label><input type="number" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Start Date *</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">End Date *</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div className="col-span-2"><label className="block font-semibold text-gray-700 mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gray-700 text-xs">Budget Lines *</label>
                <button type="button" onClick={addLine} className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 cursor-pointer">+ Add Line</button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="text-left px-3 py-2">Department</th><th className="text-left px-3 py-2">Account</th><th className="text-right px-3 py-2 w-32">Annual Budget</th><th className="w-8"></th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((l, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5"><select value={l.department} onChange={(e) => updateLine(idx, { department: e.target.value })} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs cursor-pointer"><option value="">(none)</option>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}</select></td>
                        <td className="px-2 py-1.5"><select value={l.accountId} onChange={(e) => updateLine(idx, { accountId: e.target.value })} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs cursor-pointer"><option value="">Select account...</option>{budgetableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></td>
                        <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" value={l.annualAmount} onChange={(e) => updateLine(idx, { annualAmount: e.target.value })} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-right" /></td>
                        <td className="px-1">{lines.length > 1 && <button type="button" onClick={() => removeLine(idx)} className="p-1 text-gray-300 hover:text-rose-500 cursor-pointer"><X className="w-3.5 h-3.5" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200 font-bold"><tr><td className="px-3 py-2" colSpan={2}>TOTAL</td><td className="px-3 py-2 text-right font-mono">৳{fmtMoney(total)}</td><td></td></tr></tfoot>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button type="button" disabled={submitting} onClick={submitCreate} className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50">{submitting ? 'Saving...' : 'Save as Draft'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail view */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-5xl space-y-5 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div><h2 className="text-base font-bold text-gray-900">{detail.name}</h2><p className="text-xs text-gray-500 mt-0.5">FY {detail.fiscalYear} · {fmtDate(detail.startDate)} – {fmtDate(detail.endDate)} · v{detail.version}</p></div>
              <button onClick={() => { setDetail(null); setVsActual(null); }} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[detail.status]}`}>{detail.status.replace('_', ' ')}</span>
              {detail.status === 'DRAFT' && canSubmit && <button onClick={() => runAction(() => budgetApi.submitBudget(detail.id), 'Budget submitted for approval')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl cursor-pointer"><Send className="w-3.5 h-3.5" /> Submit</button>}
              {detail.status === 'PENDING_APPROVAL' && canApprove && <button onClick={() => runAction(() => budgetApi.approveBudget(detail.id), 'Budget approved')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>}
              {detail.status === 'APPROVED' && canActivate && <button onClick={() => runAction(() => budgetApi.activateBudget(detail.id), 'Budget activated')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"><PlayCircle className="w-3.5 h-3.5" /> Activate</button>}
              {detail.status === 'ACTIVE' && canClose && <button onClick={() => { if (confirm('Close this budget? It becomes historical and immutable.')) runAction(() => budgetApi.closeBudget(detail.id), 'Budget closed'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"><Lock className="w-3.5 h-3.5" /> Close</button>}
              {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE'].includes(detail.status) && canCancel && <button onClick={() => { if (confirm('Cancel this budget?')) runAction(() => budgetApi.cancelBudget(detail.id), 'Budget cancelled'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl cursor-pointer"><Ban className="w-3.5 h-3.5" /> Cancel</button>}
              {['APPROVED', 'ACTIVE', 'CLOSED'].includes(detail.status) && canEdit && <button onClick={() => runAction(() => budgetApi.reviseBudget(detail.id), 'Revision created as a new draft')} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold rounded-xl cursor-pointer"><Copy className="w-3.5 h-3.5" /> Create Revision</button>}
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="text-left px-3 py-2">Department</th><th className="text-left px-3 py-2">Account</th><th className="text-right px-3 py-2">Annual Budget</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.lines.map((l) => (<tr key={l.id}><td className="px-3 py-2 text-gray-500">{l.department || '—'}</td><td className="px-3 py-2 font-mono">{l.account.code} {l.account.name}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(l.annualAmount)}</td></tr>))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold"><tr><td className="px-3 py-2" colSpan={2}>TOTAL</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(detail.lines.reduce((s, l) => s + Number(l.annualAmount), 0))}</td></tr></tfoot>
              </table>
            </div>

            {vsActual && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-700">Budget vs Actual (as of {fmtDate(vsActual.asOf)})</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="text-left px-3 py-2">Account</th><th className="text-right px-3 py-2">Budget</th><th className="text-right px-3 py-2">Actual</th><th className="text-right px-3 py-2">Variance</th><th className="text-right px-3 py-2">Utilization</th><th className="text-left px-3 py-2">Status</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {vsActual.rows.map((r) => (
                        <tr key={r.lineId}>
                          <td className="px-3 py-2 font-mono">{r.account.code} {r.account.name}</td>
                          <td className="px-3 py-2 text-right font-mono">{fmtMoney(r.budget)}</td>
                          <td className="px-3 py-2 text-right font-mono">{fmtMoney(r.actual)}</td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${VARIANCE_TONE[r.status]}`}>{Number(r.variance) < 0 ? '-' : ''}৳{fmtMoney(Math.abs(Number(r.variance)))}</td>
                          <td className="px-3 py-2 text-right">
                            {r.utilizationPercent === null ? 'N/A' : (
                              <div className="flex items-center gap-1.5 justify-end">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${r.utilizationPercent > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, r.utilizationPercent)}%` }} /></div>
                                <span className="font-mono">{r.utilizationPercent.toFixed(0)}%</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 text-[10px] font-bold ${VARIANCE_TONE[r.status]}`}>{r.status === 'OVER_BUDGET' ? <TrendingDown className="w-3 h-3" /> : r.status !== 'NO_BUDGET' ? <TrendingUp className="w-3 h-3" /> : null}{r.status.replace('_', ' ')}</span></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                      <tr><td className="px-3 py-2">TOTAL</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(vsActual.totals.budget)}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(vsActual.totals.actual)}</td><td className={`px-3 py-2 text-right font-mono ${VARIANCE_TONE[vsActual.totals.status]}`}>{fmtMoney(vsActual.totals.variance)}</td><td className="px-3 py-2 text-right font-mono">{vsActual.totals.utilizationPercent === null ? 'N/A' : `${vsActual.totals.utilizationPercent.toFixed(0)}%`}</td><td></td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {monthly.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-700">Monthly Performance</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="text-left px-3 py-2">Month</th><th className="text-right px-3 py-2">Budget</th><th className="text-right px-3 py-2">Actual</th><th className="text-right px-3 py-2">Variance</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthly.map((m) => (<tr key={`${m.year}-${m.month}`} className={m.isFuture ? 'opacity-40' : ''}><td className="px-3 py-2">{m.label}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(m.budget)}</td><td className="px-3 py-2 text-right font-mono">{m.isFuture ? '—' : fmtMoney(m.actual)}</td><td className={`px-3 py-2 text-right font-mono ${m.isFuture ? '' : VARIANCE_TONE[m.status]}`}>{m.isFuture ? '—' : fmtMoney(m.variance)}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
