import React, { useState, useEffect, useCallback } from 'react';
import { CalendarRange, Plus, Eye, PlayCircle, CheckCircle2, Ban, Wallet, X, Gift, MinusCircle, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useGeneralLedger } from '../../general-ledger/context/GeneralLedgerContext';
import { usePayroll } from '../context/PayrollContext';
import * as payrollApi from '../api';
import type { PayrollPeriod, PayrollPeriodStatus, PayrollBonus, PayrollDeduction, BonusType, DeductionType, PaymentMethod } from '../types';
import { fmtMoney, fmtDate, STATUS_BADGE } from '../../general-ledger/format';

const PERIOD_STATUS_BADGE: Record<string, string> = {
  ...STATUS_BADGE,
  CALCULATED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

export default function PayrollPeriodsPage() {
  const { employees, hasPermission, showToast } = useApp();
  const { activeAccounts } = useGeneralLedger();
  const { activeTaxRules } = usePayroll();
  const bankAccounts = activeAccounts.filter((a) => a.type === 'ASSET');

  const canCreate = hasPermission('payroll', 'create');
  const canCalculate = hasPermission('payroll', 'calculate');
  const canApprove = hasPermission('payroll', 'approve');
  const canCancel = hasPermission('payroll', 'cancel');
  const canPay = hasPermission('payroll', 'process_payment');
  const canManageBonus = hasPermission('payroll', 'manage_bonus');
  const canManageDeduction = hasPermission('payroll', 'manage_deduction');

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PayrollPeriodStatus>('ALL');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await payrollApi.fetchPayrollPeriods({ status: statusFilter, pageSize: 50 });
      setPeriods(res.periods);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payroll periods', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  // ─── Create period ───────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payDate, setPayDate] = useState('');
  const [taxRuleId, setTaxRuleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    setName(''); setStartDate(''); setEndDate(''); setPayDate('');
    setTaxRuleId(activeTaxRules[0]?.id || '');
    setFormError(''); setFormOpen(true);
  };

  const submitCreate = async () => {
    setFormError('');
    if (!name.trim() || !startDate || !endDate || !payDate) { setFormError('All fields are required'); return; }
    try {
      setSubmitting(true);
      const period = await payrollApi.createPayrollPeriod({ name, startDate, endDate, payDate, taxRuleId: taxRuleId || undefined });
      showToast(`Payroll period "${period.name}" created`, 'success');
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create payroll period');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Detail ──────────────────────────────────────────────
  const [detail, setDetail] = useState<PayrollPeriod | null>(null);
  const [bonuses, setBonuses] = useState<PayrollBonus[]>([]);
  const [deductions, setDeductions] = useState<PayrollDeduction[]>([]);

  const openDetail = async (id: string) => {
    try {
      const [period, bonusList, deductionList] = await Promise.all([
        payrollApi.fetchPayrollPeriod(id),
        payrollApi.fetchBonuses({ payrollPeriodId: id }),
        payrollApi.fetchDeductions({ payrollPeriodId: id }),
      ]);
      setDetail(period);
      setBonuses(bonusList);
      setDeductions(deductionList);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payroll period', 'error');
    }
  };
  const refreshDetail = async () => { if (detail) await openDetail(detail.id); };

  const handleCalculate = async (id: string) => {
    try {
      const result = await payrollApi.calculatePayrollPeriod(id);
      showToast(`Calculated for ${result.processedCount} employee(s)${result.skippedCount ? `, skipped ${result.skippedCount} without a salary structure` : ''}`, 'success');
      load(); refreshDetail();
    } catch (err: any) { showToast(err.message, 'error'); }
  };
  const handleApprove = async (id: string) => {
    if (!confirm('Approve this payroll? It will post a journal entry to the General Ledger and can no longer be recalculated.')) return;
    try { await payrollApi.approvePayrollPeriod(id); showToast('Payroll approved and posted', 'success'); load(); refreshDetail(); } catch (err: any) { showToast(err.message, 'error'); }
  };
  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this payroll period?')) return;
    try { await payrollApi.cancelPayrollPeriod(id); showToast('Payroll period cancelled', 'info'); load(); refreshDetail(); } catch (err: any) { showToast(err.message, 'error'); }
  };

  // ─── Bonus / Deduction quick-add ─────────────────────────
  const [bonusEmployeeId, setBonusEmployeeId] = useState('');
  const [bonusType, setBonusType] = useState<BonusType>('FESTIVAL');
  const [bonusAmount, setBonusAmount] = useState('');
  const addBonus = async () => {
    if (!detail) return;
    if (!bonusEmployeeId || !(Number(bonusAmount) > 0)) { showToast('Select an employee and a positive amount', 'warning'); return; }
    try {
      await payrollApi.createBonus({ employeeId: bonusEmployeeId, payrollPeriodId: detail.id, bonusType, amount: Number(bonusAmount) });
      setBonusAmount('');
      showToast('Bonus added', 'success');
      refreshDetail();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const [dedEmployeeId, setDedEmployeeId] = useState('');
  const [dedType, setDedType] = useState<DeductionType>('LOAN');
  const [dedAmount, setDedAmount] = useState('');
  const addDeduction = async () => {
    if (!detail) return;
    if (!dedEmployeeId || !(Number(dedAmount) > 0)) { showToast('Select an employee and a positive amount', 'warning'); return; }
    try {
      await payrollApi.createDeduction({ employeeId: dedEmployeeId, payrollPeriodId: detail.id, deductionType: dedType, amount: Number(dedAmount) });
      setDedAmount('');
      showToast('Deduction added', 'success');
      refreshDetail();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  // ─── Payment modal ───────────────────────────────────────
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payDate2, setPayDate2] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const submitPayment = async () => {
    if (!detail) return;
    if (!payBankAccountId) { showToast('Select a payment account', 'warning'); return; }
    try {
      setPaySubmitting(true);
      await payrollApi.createPayrollPayment({ payrollPeriodId: detail.id, paymentDate: payDate2, paymentMethod: payMethod, bankAccountId: payBankAccountId, referenceNumber: payRef || undefined });
      showToast('Payroll payment processed', 'success');
      setPayModalOpen(false);
      load(); refreshDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPaySubmitting(false);
    }
  };

  const totals = detail?.records?.reduce(
    (acc, r) => ({ gross: acc.gross + Number(r.grossEarnings), tax: acc.tax + Number(r.taxAmount), deductions: acc.deductions + Number(r.totalDeductions), net: acc.net + Number(r.netSalary) }),
    { gross: 0, tax: 0, deductions: 0, net: 0 }
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-950 via-violet-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300 shrink-0"><CalendarRange className="w-6 h-6" /></div>
          <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Payroll Periods</h1><p className="text-xs text-violet-200/80 mt-0.5">Draft → Calculate → Approve → Pay.</p></div>
        </div>
        {canCreate && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all cursor-pointer shrink-0"><Plus className="w-4 h-4" /> New Period</button>}
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <span className="text-xs font-medium text-gray-500">Status:</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          <option value="ALL">All</option><option value="DRAFT">Draft</option><option value="CALCULATED">Calculated</option><option value="APPROVED">Approved</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading payroll periods...</div>
        ) : periods.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No payroll periods found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr><th className="text-left px-4 py-3">Period</th><th className="text-left px-4 py-3">Pay Date</th><th className="text-right px-4 py-3">Employees</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Payment</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {periods.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.name}<div className="text-[10px] text-gray-400 font-normal">{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</div></td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(p.payDate)}</td>
                  <td className="px-4 py-3 text-right">{p._count?.records ?? 0}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PERIOD_STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                  <td className="px-4 py-3">{p.payment ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.payment.status === 'REVERSED' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>{p.payment.status}</span> : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openDetail(p.id)} title="View" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"><Eye className="w-3.5 h-3.5" /></button>
                      {(p.status === 'DRAFT' || p.status === 'CALCULATED') && canCalculate && <button onClick={() => handleCalculate(p.id)} title="Calculate" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"><PlayCircle className="w-3.5 h-3.5" /></button>}
                      {p.status === 'CALCULATED' && canApprove && <button onClick={() => handleApprove(p.id)} title="Approve" className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /></button>}
                      {p.status === 'APPROVED' && canPay && <button onClick={() => { setDetail(p); setPayModalOpen(true); }} title="Pay" className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"><Wallet className="w-3.5 h-3.5" /></button>}
                      {(p.status === 'DRAFT' || p.status === 'CALCULATED' || p.status === 'APPROVED') && canCancel && <button onClick={() => handleCancel(p.id)} title="Cancel" className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Ban className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><CalendarRange className="w-5 h-5 text-violet-600" />New Payroll Period</h2>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-medium">{formError}</div>}
            <div className="space-y-3 text-xs">
              <div><label className="block font-semibold text-gray-700 mb-1">Name *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. August 2026 Payroll" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-semibold text-gray-700 mb-1">Start Date *</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
                <div><label className="block font-semibold text-gray-700 mb-1">End Date *</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              </div>
              <div><label className="block font-semibold text-gray-700 mb-1">Pay Date *</label><input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Tax Rule</label>
                <select value={taxRuleId} onChange={(e) => setTaxRuleId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer">
                  <option value="">None (no tax deduction)</option>
                  {activeTaxRules.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button type="button" disabled={submitting} onClick={submitCreate} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50">{submitting ? 'Creating...' : 'Create Period'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail view */}
      {detail && !payModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl space-y-5 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div><h2 className="text-base font-bold text-gray-900">{detail.name}</h2><p className="text-xs text-gray-500 mt-0.5">{fmtDate(detail.startDate)} – {fmtDate(detail.endDate)} · Pay date {fmtDate(detail.payDate)} · {detail.workingDays} working days</p></div>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${PERIOD_STATUS_BADGE[detail.status]}`}>{detail.status}</span>
              {(detail.status === 'DRAFT' || detail.status === 'CALCULATED') && canCalculate && <button onClick={() => handleCalculate(detail.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl cursor-pointer"><PlayCircle className="w-3.5 h-3.5" /> Calculate</button>}
              {detail.status === 'CALCULATED' && canApprove && <button onClick={() => handleApprove(detail.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>}
              {detail.status === 'APPROVED' && canPay && <button onClick={() => setPayModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"><Wallet className="w-3.5 h-3.5" /> Process Payment</button>}
              {(detail.status === 'DRAFT' || detail.status === 'CALCULATED' || detail.status === 'APPROVED') && canCancel && <button onClick={() => handleCancel(detail.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"><Ban className="w-3.5 h-3.5" /> Cancel</button>}
            </div>

            {/* Payroll review table */}
            {detail.records && detail.records.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="text-left px-3 py-2">Employee</th><th className="text-right px-3 py-2">Gross</th><th className="text-right px-3 py-2">Tax</th><th className="text-right px-3 py-2">Deductions</th><th className="text-right px-3 py-2">Net</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.records.map((r) => (
                      <tr key={r.id}><td className="px-3 py-2">{r.employee.firstName} {r.employee.lastName}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(r.grossEarnings)}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(r.taxAmount)}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(r.totalDeductions)}</td><td className="px-3 py-2 text-right font-mono font-bold">{fmtMoney(r.netSalary)}</td></tr>
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold"><tr><td className="px-3 py-2">TOTAL</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(totals.gross)}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(totals.tax)}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(totals.deductions)}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(totals.net)}</td></tr></tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Bonuses */}
            {(detail.status === 'DRAFT' || detail.status === 'CALCULATED') && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-amber-500" /> Bonuses</h3>
                {bonuses.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-100">
                        {bonuses.map((b) => (
                          <tr key={b.id}>
                            <td className="px-3 py-2">{b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : b.employeeId}</td>
                            <td className="px-3 py-2 text-gray-500">{b.bonusType}</td>
                            <td className="px-3 py-2 text-right font-mono">{fmtMoney(b.amount)}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${b.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : b.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{b.status}</span></td>
                            <td className="px-2">{b.status === 'PENDING' && canManageBonus && (
                              <div className="flex gap-1">
                                <button onClick={async () => { await payrollApi.approveBonus(b.id); refreshDetail(); }} title="Approve" className="p-1 text-gray-400 hover:text-emerald-600 cursor-pointer"><ThumbsUp className="w-3.5 h-3.5" /></button>
                                <button onClick={async () => { await payrollApi.rejectBonus(b.id); refreshDetail(); }} title="Reject" className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"><ThumbsDown className="w-3.5 h-3.5" /></button>
                                <button onClick={async () => { await payrollApi.deleteBonus(b.id); refreshDetail(); }} title="Delete" className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {canManageBonus && (
                  <div className="flex items-center gap-2 text-xs">
                    <select value={bonusEmployeeId} onChange={(e) => setBonusEmployeeId(e.target.value)} className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer"><option value="">Employee...</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.employeeId} — {e.name}</option>)}</select>
                    <select value={bonusType} onChange={(e) => setBonusType(e.target.value as BonusType)} className="p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer"><option value="FESTIVAL">Festival</option><option value="PERFORMANCE">Performance</option><option value="ANNUAL">Annual</option><option value="COMMISSION">Commission</option><option value="OTHER">Other</option></select>
                    <input type="number" min="0.01" step="0.01" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} placeholder="Amount" className="w-28 p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    <button onClick={addBonus} className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg cursor-pointer">Add</button>
                  </div>
                )}
              </div>
            )}

            {/* Deductions */}
            {(detail.status === 'DRAFT' || detail.status === 'CALCULATED') && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><MinusCircle className="w-3.5 h-3.5 text-rose-500" /> Deductions</h3>
                {deductions.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-100">
                        {deductions.map((d) => (
                          <tr key={d.id}>
                            <td className="px-3 py-2">{d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : d.employeeId}</td>
                            <td className="px-3 py-2 text-gray-500">{d.deductionType}</td>
                            <td className="px-3 py-2 text-right font-mono">{fmtMoney(d.amount)}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${d.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : d.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{d.status}</span></td>
                            <td className="px-2">{d.status === 'PENDING' && canManageDeduction && (
                              <div className="flex gap-1">
                                <button onClick={async () => { await payrollApi.approveDeduction(d.id); refreshDetail(); }} title="Approve" className="p-1 text-gray-400 hover:text-emerald-600 cursor-pointer"><ThumbsUp className="w-3.5 h-3.5" /></button>
                                <button onClick={async () => { await payrollApi.rejectDeduction(d.id); refreshDetail(); }} title="Reject" className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"><ThumbsDown className="w-3.5 h-3.5" /></button>
                                <button onClick={async () => { await payrollApi.deleteDeduction(d.id); refreshDetail(); }} title="Delete" className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {canManageDeduction && (
                  <div className="flex items-center gap-2 text-xs">
                    <select value={dedEmployeeId} onChange={(e) => setDedEmployeeId(e.target.value)} className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer"><option value="">Employee...</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.employeeId} — {e.name}</option>)}</select>
                    <select value={dedType} onChange={(e) => setDedType(e.target.value as DeductionType)} className="p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer"><option value="LOAN">Loan</option><option value="ADVANCE">Advance</option><option value="INSURANCE">Insurance</option><option value="OTHER">Other</option></select>
                    <input type="number" min="0.01" step="0.01" value={dedAmount} onChange={(e) => setDedAmount(e.target.value)} placeholder="Amount" className="w-28 p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    <button onClick={addDeduction} className="px-3 py-2 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-lg cursor-pointer">Add</button>
                  </div>
                )}
              </div>
            )}

            {detail.payment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                Paid ৳{fmtMoney(detail.payment.amount)} on {fmtDate(detail.payment.paymentDate)} via {detail.payment.paymentMethod.replace('_', ' ')} ({detail.payment.bankAccount?.name}){detail.payment.referenceNumber ? ` — Ref: ${detail.payment.referenceNumber}` : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment modal */}
      {detail && payModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-600" />Process Payment — {detail.name}</h2>
              <button onClick={() => setPayModalOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div><label className="block font-semibold text-gray-700 mb-1">Payment Date *</label><input type="date" value={payDate2} onChange={(e) => setPayDate2(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Payment Method *</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer">
                  <option value="BANK_TRANSFER">Bank Transfer</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option><option value="CARD">Card</option><option value="MOBILE_PAYMENT">Mobile Payment</option><option value="OTHER">Other</option>
                </select>
              </div>
              <div><label className="block font-semibold text-gray-700 mb-1">Company Bank Account *</label>
                <select value={payBankAccountId} onChange={(e) => setPayBankAccountId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer">
                  <option value="">Select account...</option>
                  {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div><label className="block font-semibold text-gray-700 mb-1">Reference Number</label><input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. SAL-2026-09" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={() => setPayModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button type="button" disabled={paySubmitting} onClick={submitPayment} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50">{paySubmitting ? 'Processing...' : 'Process Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
