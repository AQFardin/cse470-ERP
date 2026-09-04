import React, { useState, useEffect, useCallback } from 'react';
import { CalendarRange, Plus, X, Calculator, Send, CheckCircle2, FileCheck2, Lock, Wallet, FileText, Printer } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useGeneralLedger } from '../../general-ledger/context/GeneralLedgerContext';
import * as complianceApi from '../api';
import type { TaxPeriod, TaxPeriodStatus, PaymentMethod, StatutoryFilingReport } from '../types';
import { fmtMoney, fmtDate } from '../../general-ledger/format';

const STATUS_BADGE: Record<TaxPeriodStatus, string> = {
  OPEN: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  REVIEW: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  FINALIZED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  FILED: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  CLOSED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const PAYMENT_METHODS: PaymentMethod[] = ['BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD', 'MOBILE_PAYMENT', 'OTHER'];

export default function TaxPeriodsPage() {
  const { hasPermission, showToast } = useApp();
  const { activeAccounts } = useGeneralLedger();
  const bankAccounts = activeAccounts.filter((a) => a.type === 'ASSET');

  const canManagePeriods = hasPermission('compliance', 'manage_tax_periods');
  const canCalculate = hasPermission('compliance', 'calculate_tax');
  const canReview = hasPermission('compliance', 'review_tax_return');
  const canFinalize = hasPermission('compliance', 'finalize_tax_return');
  const canFile = hasPermission('compliance', 'file_tax_return');
  const canClose = hasPermission('compliance', 'close_tax_period');
  const canPay = hasPermission('compliance', 'process_tax_payment');

  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPeriods(await complianceApi.fetchTaxPeriods());
    } catch (err: any) {
      showToast(err.message || 'Failed to load tax periods', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ─── Create form ─────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => { setName(''); setStartDate(''); setEndDate(''); setDueDate(''); setFormError(''); setFormOpen(true); };

  const submitCreate = async () => {
    setFormError('');
    if (!name.trim() || !startDate || !endDate || !dueDate) { setFormError('All fields are required'); return; }
    try {
      setSubmitting(true);
      await complianceApi.createTaxPeriod({ name, startDate, endDate, dueDate });
      showToast(`Tax period "${name}" created`, 'success');
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create tax period');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (id: string, action: (id: string) => Promise<TaxPeriod>, label: string) => {
    try {
      setActingId(id);
      await action(id);
      showToast(`Tax period ${label}`, 'success');
      load();
    } catch (err: any) {
      showToast(err.message || `Failed to ${label} tax period`, 'error');
    } finally {
      setActingId(null);
    }
  };

  // ─── Payment form ─────────────────────────────────────────
  const [payFor, setPayFor] = useState<TaxPeriod | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payError, setPayError] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const openPay = (p: TaxPeriod) => {
    setPayFor(p);
    setPayAmount(String(p.netPayable ?? ''));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('BANK_TRANSFER');
    setPayBankAccountId(bankAccounts[0]?.id || '');
    setPayReference('');
    setPayError('');
  };

  const submitPay = async () => {
    if (!payFor) return;
    setPayError('');
    if (!payAmount || Number(payAmount) <= 0 || !payDate || !payBankAccountId) { setPayError('Amount, date, and bank account are required'); return; }
    try {
      setPaySubmitting(true);
      await complianceApi.createTaxPayment({ taxPeriodId: payFor.id, amount: Number(payAmount), paymentDate: payDate, paymentMethod: payMethod, bankAccountId: payBankAccountId, referenceNumber: payReference || undefined });
      showToast('Tax payment recorded', 'success');
      setPayFor(null);
      load();
    } catch (err: any) {
      setPayError(err.message || 'Failed to record tax payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  // ─── Statutory filing report ────────────────────────────────
  const [filingReport, setFilingReport] = useState<StatutoryFilingReport | null>(null);
  const [filingLoading, setFilingLoading] = useState(false);

  const openFilingReport = async (p: TaxPeriod) => {
    try {
      setFilingLoading(true);
      setFilingReport(await complianceApi.fetchStatutoryFilingReport(p.id));
    } catch (err: any) {
      showToast(err.message || 'Failed to generate statutory filing report', 'error');
    } finally {
      setFilingLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center"><CalendarRange className="w-5 h-5" /></div>
          <div><h2 className="text-lg font-bold text-gray-900">Tax Periods</h2><p className="text-xs text-gray-500">Calculate, review, finalize, file, and pay each tax return.</p></div>
        </div>
        {canManagePeriods && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> New Period
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : periods.length === 0 ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">No tax periods created yet.</div>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => {
            const busy = actingId === p.id;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{p.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{fmtDate(p.startDate)} – {fmtDate(p.endDate)} · Due {fmtDate(p.dueDate)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canCalculate && (p.status === 'OPEN' || p.status === 'REVIEW') && (
                      <button disabled={busy} onClick={() => runAction(p.id, complianceApi.calculateTaxPeriod, 'calculated')} className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 cursor-pointer">
                        <Calculator className="w-3.5 h-3.5" /> Calculate
                      </button>
                    )}
                    {canReview && p.status === 'OPEN' && p.calculatedAt && (
                      <button disabled={busy} onClick={() => runAction(p.id, complianceApi.reviewTaxPeriod, 'submitted for review')} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 cursor-pointer">
                        <Send className="w-3.5 h-3.5" /> Submit for Review
                      </button>
                    )}
                    {canFinalize && p.status === 'REVIEW' && (
                      <button disabled={busy} onClick={() => runAction(p.id, complianceApi.finalizeTaxPeriod, 'finalized')} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Finalize
                      </button>
                    )}
                    {canFile && p.status === 'FINALIZED' && (
                      <button disabled={busy} onClick={() => runAction(p.id, complianceApi.fileTaxPeriod, 'filed')} className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-[11px] font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50 cursor-pointer">
                        <FileCheck2 className="w-3.5 h-3.5" /> File Return
                      </button>
                    )}
                    {canPay && (p.status === 'FINALIZED' || p.status === 'FILED') && !p.payment && (
                      <button disabled={busy} onClick={() => openPay(p)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer">
                        <Wallet className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    )}
                    {canClose && p.status === 'FILED' && (
                      <button disabled={busy} onClick={() => runAction(p.id, complianceApi.closeTaxPeriod, 'closed')} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 rounded-lg text-[11px] font-semibold text-white hover:bg-gray-900 disabled:opacity-50 cursor-pointer">
                        <Lock className="w-3.5 h-3.5" /> Close
                      </button>
                    )}
                    {['FINALIZED', 'FILED', 'CLOSED'].includes(p.status) && (
                      <button disabled={filingLoading} onClick={() => openFilingReport(p)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer">
                        <FileText className="w-3.5 h-3.5" /> Filing Report
                      </button>
                    )}
                  </div>
                </div>

                {p.calculatedAt && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mt-4 pt-4 border-t border-gray-100">
                    <div><p className="text-gray-500">Output Tax</p><p className="font-mono font-semibold text-gray-800 mt-0.5">৳{fmtMoney(p.outputTax ?? 0)}</p></div>
                    <div><p className="text-gray-500">Input Tax</p><p className="font-mono font-semibold text-gray-800 mt-0.5">৳{fmtMoney(p.inputTax ?? 0)}</p></div>
                    <div><p className="text-gray-500">Adjustments</p><p className="font-mono font-semibold text-gray-800 mt-0.5">৳{fmtMoney(p.adjustments)}</p></div>
                    <div><p className="text-gray-500">Net Payable</p><p className="font-mono font-bold text-teal-700 mt-0.5">৳{fmtMoney(p.netPayable ?? 0)}</p></div>
                  </div>
                )}

                {p.payment && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid ৳{fmtMoney(p.payment.amount)} on {fmtDate(p.payment.paymentDate)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">New Tax Period</h3>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-semibold text-gray-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" placeholder="August 2026 VAT Return" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-semibold text-gray-500">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
                <div><label className="text-[11px] font-semibold text-gray-500">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              </div>
              <div><label className="text-[11px] font-semibold text-gray-500">Due Date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              {formError && <p className="text-[11px] text-rose-600 font-semibold">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={submitCreate} disabled={submitting} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 cursor-pointer">{submitting ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {payFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Record Tax Payment — {payFor.name}</h3>
              <button onClick={() => setPayFor(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-semibold text-gray-500">Amount</label><input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-semibold text-gray-500">Payment Date</label><input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
                <div><label className="text-[11px] font-semibold text-gray-500">Method</label>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-[11px] font-semibold text-gray-500">Bank Account</label>
                <select value={payBankAccountId} onChange={(e) => setPayBankAccountId(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                  <option value="">Select account...</option>
                  {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div><label className="text-[11px] font-semibold text-gray-500">Reference (optional)</label><input value={payReference} onChange={(e) => setPayReference(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              {payError && <p className="text-[11px] text-rose-600 font-semibold">{payError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPayFor(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={submitPay} disabled={paySubmitting} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">{paySubmitting ? 'Recording...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}

      {filingReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 print:bg-white print:p-0 print:static">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 print:shadow-none print:rounded-none print:max-h-none print:max-w-none">
            <div className="flex items-center justify-between mb-6 print:hidden">
              <h3 className="text-sm font-bold text-gray-900">Statutory Tax Filing Report</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[11px] font-semibold hover:bg-teal-700 cursor-pointer"><Printer className="w-3.5 h-3.5" /> Print</button>
                <button onClick={() => setFilingReport(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-6 text-xs">
              <div className="text-center border-b border-gray-200 pb-4">
                <h1 className="text-lg font-bold text-gray-900">Tax Return — {filingReport.period.name}</h1>
                <p className="text-gray-500 mt-1">{fmtDate(filingReport.period.startDate)} – {fmtDate(filingReport.period.endDate)} · Due {fmtDate(filingReport.period.dueDate)}</p>
                <p className="text-gray-400 mt-1">Status: {filingReport.period.status} · Generated {new Date(filingReport.generatedAt).toLocaleString()}</p>
              </div>

              <div>
                <h2 className="font-bold text-gray-800 uppercase tracking-wide mb-2">Output Tax (Sales)</h2>
                <table className="w-full">
                  <thead className="text-gray-500 uppercase text-[10px] font-bold border-b border-gray-200"><tr><th className="text-left py-1.5">Tax Code</th><th className="text-left py-1.5">Category</th><th className="text-right py-1.5">Rate</th><th className="text-right py-1.5">Taxable</th><th className="text-right py-1.5">Tax</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filingReport.outputTax.lines.length === 0 ? <tr><td colSpan={5} className="py-3 text-center text-gray-400">No output tax transactions</td></tr> : filingReport.outputTax.lines.map((l, i) => (
                      <tr key={i}><td className="py-1.5 font-mono">{l.taxCode}</td><td className="py-1.5">{l.category.replace('_', ' ')}</td><td className="py-1.5 text-right font-mono">{l.ratePercent}%</td><td className="py-1.5 text-right font-mono">{fmtMoney(l.taxableAmount)}</td><td className="py-1.5 text-right font-mono">{fmtMoney(l.taxAmount)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="font-bold border-t border-gray-200"><td colSpan={4} className="py-1.5 text-right">Total Output Tax</td><td className="py-1.5 text-right font-mono">৳{fmtMoney(filingReport.outputTax.total)}</td></tr></tfoot>
                </table>
              </div>

              <div>
                <h2 className="font-bold text-gray-800 uppercase tracking-wide mb-2">Input Tax (Purchases)</h2>
                <table className="w-full">
                  <thead className="text-gray-500 uppercase text-[10px] font-bold border-b border-gray-200"><tr><th className="text-left py-1.5">Tax Code</th><th className="text-left py-1.5">Category</th><th className="text-right py-1.5">Rate</th><th className="text-right py-1.5">Taxable</th><th className="text-right py-1.5">Tax</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filingReport.inputTax.lines.length === 0 ? <tr><td colSpan={5} className="py-3 text-center text-gray-400">No input tax transactions</td></tr> : filingReport.inputTax.lines.map((l, i) => (
                      <tr key={i}><td className="py-1.5 font-mono">{l.taxCode}</td><td className="py-1.5">{l.category.replace('_', ' ')}</td><td className="py-1.5 text-right font-mono">{l.ratePercent}%</td><td className="py-1.5 text-right font-mono">{fmtMoney(l.taxableAmount)}</td><td className="py-1.5 text-right font-mono">{fmtMoney(l.taxAmount)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="font-bold border-t border-gray-200"><td colSpan={4} className="py-1.5 text-right">Total Input Tax</td><td className="py-1.5 text-right font-mono">৳{fmtMoney(filingReport.inputTax.total)}</td></tr></tfoot>
                </table>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-600">Adjustments</span><span className="font-mono">৳{fmtMoney(filingReport.adjustments)}</span></div>
                <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-200"><span>Net Payable</span><span className="font-mono">৳{fmtMoney(filingReport.netPayable)}</span></div>
                {filingReport.payment && (
                  <div className="flex justify-between text-emerald-700 pt-1.5"><span>Paid</span><span className="font-mono">৳{fmtMoney(filingReport.payment.amount)} on {fmtDate(filingReport.payment.paymentDate)}</span></div>
                )}
              </div>

              <div className="text-gray-400 text-[10px] border-t border-gray-100 pt-3">
                {filingReport.filing.finalizedBy && <p>Finalized by {filingReport.filing.finalizedBy.name} on {filingReport.filing.finalizedAt ? new Date(filingReport.filing.finalizedAt).toLocaleString() : '—'}</p>}
                {filingReport.filing.filedBy && <p>Filed by {filingReport.filing.filedBy.name} on {filingReport.filing.filedAt ? new Date(filingReport.filing.filedAt).toLocaleString() : '—'}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
